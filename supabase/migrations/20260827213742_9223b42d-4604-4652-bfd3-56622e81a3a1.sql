-- 1. Budget enrichment -------------------------------------------------
ALTER TABLE public.budgets
  ADD COLUMN IF NOT EXISTS reference_number text,
  ADD COLUMN IF NOT EXISTS period_start date,
  ADD COLUMN IF NOT EXISTS period_end date,
  ADD COLUMN IF NOT EXISTS period_label text NOT NULL DEFAULT 'annual',
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS purpose text,
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS responsible_user_id uuid,
  ADD COLUMN IF NOT EXISTS requested_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS approved_amount numeric,
  ADD COLUMN IF NOT EXISTS submitted_by uuid,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_by uuid,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

CREATE UNIQUE INDEX IF NOT EXISTS budgets_reference_number_key ON public.budgets (reference_number);

UPDATE public.budgets SET requested_amount = total_amount WHERE requested_amount = 0 AND total_amount > 0;
UPDATE public.budgets SET approved_amount = total_amount WHERE approved_amount IS NULL AND status IN ('approved','active','locked');

CREATE OR REPLACE FUNCTION public.set_budget_reference()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE seq int;
BEGIN
  IF NEW.reference_number IS NULL THEN
    SELECT COUNT(*) + 1 INTO seq FROM public.budgets
      WHERE fiscal_year = NEW.fiscal_year AND reference_number IS NOT NULL;
    NEW.reference_number := 'TRG-BUD-' || NEW.fiscal_year || '-' || lpad(seq::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_budget_reference ON public.budgets;
CREATE TRIGGER trg_budget_reference BEFORE INSERT ON public.budgets
  FOR EACH ROW EXECUTE FUNCTION public.set_budget_reference();

UPDATE public.budgets b
SET reference_number = 'TRG-BUD-' || b.fiscal_year || '-' || lpad(x.rn::text, 6, '0')
FROM (SELECT id, row_number() OVER (PARTITION BY fiscal_year ORDER BY created_at) rn FROM public.budgets) x
WHERE x.id = b.id AND b.reference_number IS NULL;

-- Departments may draft and submit their own budgets; Finance still owns approval.
DROP POLICY IF EXISTS budgets_dept_insert ON public.budgets;
CREATE POLICY budgets_dept_insert ON public.budgets FOR INSERT TO authenticated
  WITH CHECK (
    is_finance_officer(auth.uid())
    OR (created_by = auth.uid() AND status IN ('draft','submitted') AND is_dept_member_or_admin(COALESCE(department_slug, 'finance')))
  );

DROP POLICY IF EXISTS budgets_dept_update_draft ON public.budgets;
CREATE POLICY budgets_dept_update_draft ON public.budgets FOR UPDATE TO authenticated
  USING (created_by = auth.uid() AND status IN ('draft','submitted'))
  WITH CHECK (created_by = auth.uid() AND status IN ('draft','submitted'));

-- 2. Bank / cash accounts ----------------------------------------------
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  account_type text NOT NULL DEFAULT 'bank',
  opening_balance numeric NOT NULL DEFAULT 0,
  current_balance numeric NOT NULL DEFAULT 0,
  reserved_balance numeric NOT NULL DEFAULT 0,
  branch branch,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  archived_at timestamptz,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.bank_accounts TO authenticated;
GRANT ALL ON public.bank_accounts TO service_role;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY bank_accounts_read ON public.bank_accounts FOR SELECT TO authenticated
  USING (is_finance_officer(auth.uid()) OR is_admin(auth.uid()));
CREATE POLICY bank_accounts_write ON public.bank_accounts FOR INSERT TO authenticated
  WITH CHECK (is_finance_officer(auth.uid()));
CREATE POLICY bank_accounts_update ON public.bank_accounts FOR UPDATE TO authenticated
  USING (is_finance_officer(auth.uid())) WITH CHECK (is_finance_officer(auth.uid()));

CREATE TRIGGER trg_bank_accounts_updated BEFORE UPDATE ON public.bank_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Budget adjustment (increase) requests ------------------------------
CREATE TABLE IF NOT EXISTS public.budget_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id uuid NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  department_slug text NOT NULL,
  requested_amount numeric NOT NULL DEFAULT 0,
  approved_amount numeric,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'submitted',
  decision_reason text,
  requested_by uuid NOT NULL DEFAULT auth.uid(),
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.budget_adjustments TO authenticated;
GRANT ALL ON public.budget_adjustments TO service_role;
ALTER TABLE public.budget_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY budget_adjustments_read ON public.budget_adjustments FOR SELECT TO authenticated
  USING (is_finance_officer(auth.uid()) OR is_dept_member_or_admin(department_slug) OR requested_by = auth.uid());
CREATE POLICY budget_adjustments_insert ON public.budget_adjustments FOR INSERT TO authenticated
  WITH CHECK (requested_by = auth.uid() AND is_dept_member_or_admin(department_slug));
CREATE POLICY budget_adjustments_update ON public.budget_adjustments FOR UPDATE TO authenticated
  USING (is_finance_officer(auth.uid())) WITH CHECK (is_finance_officer(auth.uid()));

CREATE TRIGGER trg_budget_adjustments_updated BEFORE UPDATE ON public.budget_adjustments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Purchase request payment linkage -----------------------------------
ALTER TABLE public.purchase_requests
  ADD COLUMN IF NOT EXISTS bank_account_id uuid REFERENCES public.bank_accounts(id),
  ADD COLUMN IF NOT EXISTS paid_by uuid,
  ADD COLUMN IF NOT EXISTS override_reason text,
  ADD COLUMN IF NOT EXISTS ledger_entry_id uuid;

-- 5. Payment synchronisation engine -------------------------------------
CREATE OR REPLACE FUNCTION public.sync_purchase_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE amt numeric; entry_id uuid;
BEGIN
  IF NEW.payment_status = 'paid' AND COALESCE(OLD.payment_status, '') <> 'paid' THEN
    amt := COALESCE(NEW.amount_actual, NEW.amount_estimated, 0);
    IF NEW.paid_at IS NULL THEN NEW.paid_at := now(); END IF;

    IF NEW.ledger_entry_id IS NULL AND amt > 0 THEN
      INSERT INTO public.finance_entries
        (department_slug, kind, entry_date, title, notes, amount, branch, status, category, created_by, approved_by, approved_at)
      VALUES (
        NEW.department_slug, 'procurement', CURRENT_DATE,
        COALESCE(NEW.pr_number, 'Purchase') || ' — ' || NEW.title,
        NEW.description, -amt, NEW.branch, 'completed', NEW.category,
        COALESCE(NEW.paid_by, NEW.finance_approved_by, NEW.requester_id),
        NEW.finance_approved_by, NEW.finance_approved_at
      )
      RETURNING id INTO entry_id;
      NEW.ledger_entry_id := entry_id;
    END IF;

    IF NEW.bank_account_id IS NOT NULL AND amt > 0 THEN
      UPDATE public.bank_accounts
        SET current_balance = current_balance - amt
        WHERE id = NEW.bank_account_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_purchase_payment ON public.purchase_requests;
CREATE TRIGGER trg_sync_purchase_payment BEFORE UPDATE ON public.purchase_requests
  FOR EACH ROW EXECUTE FUNCTION public.sync_purchase_payment();

-- 6. Live budget position (RLS still applies — SECURITY INVOKER) ---------
CREATE OR REPLACE FUNCTION public.get_budget_positions()
RETURNS TABLE (
  budget_id uuid, reference_number text, name text, department_slug text, branch branch,
  budget_type text, period_label text, category text, fiscal_year integer,
  period_start date, period_end date, status text,
  allocated numeric, spent numeric, committed numeric, pending numeric,
  available numeric, utilisation_pct numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH pr AS (
    SELECT p.budget_id,
      SUM(CASE WHEN p.payment_status = 'paid' THEN COALESCE(p.amount_actual, p.amount_estimated, 0) ELSE 0 END) AS spent,
      SUM(CASE WHEN p.payment_status <> 'paid'
                AND p.status IN ('finance_approved','senior_pastor_approved','chair_approved','ordered','received')
               THEN COALESCE(p.amount_actual, p.amount_estimated, 0) ELSE 0 END) AS committed,
      SUM(CASE WHEN p.payment_status <> 'paid'
                AND p.status IN ('draft','submitted','returned')
               THEN COALESCE(p.amount_estimated, 0) ELSE 0 END) AS pending
    FROM public.purchase_requests p
    WHERE p.archived_at IS NULL AND p.status NOT IN ('rejected','cancelled') AND p.budget_id IS NOT NULL
    GROUP BY p.budget_id
  )
  SELECT b.id, b.reference_number, b.name, b.department_slug, b.branch,
         b.budget_type, b.period_label, b.category, b.fiscal_year,
         b.period_start, b.period_end, b.status,
         COALESCE(b.approved_amount, b.total_amount, 0) AS allocated,
         COALESCE(pr.spent, 0), COALESCE(pr.committed, 0), COALESCE(pr.pending, 0),
         COALESCE(b.approved_amount, b.total_amount, 0) - COALESCE(pr.spent, 0) - COALESCE(pr.committed, 0) AS available,
         CASE WHEN COALESCE(b.approved_amount, b.total_amount, 0) > 0
              THEN ROUND(((COALESCE(pr.spent,0) + COALESCE(pr.committed,0)) / COALESCE(b.approved_amount, b.total_amount)) * 100, 1)
              ELSE 0 END AS utilisation_pct
  FROM public.budgets b
  LEFT JOIN pr ON pr.budget_id = b.id
  WHERE b.archived_at IS NULL;
$$;

CREATE OR REPLACE FUNCTION public.get_church_finance_position()
RETURNS TABLE (
  total_cash numeric, reserved numeric, allocated numeric, committed numeric,
  spent numeric, pending numeric, unallocated numeric, available numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH cash AS (
    SELECT COALESCE(SUM(current_balance),0) AS total_cash, COALESCE(SUM(reserved_balance),0) AS reserved
    FROM public.bank_accounts WHERE is_active AND archived_at IS NULL
  ),
  pos AS (
    SELECT COALESCE(SUM(allocated),0) AS allocated, COALESCE(SUM(committed),0) AS committed,
           COALESCE(SUM(spent),0) AS spent, COALESCE(SUM(pending),0) AS pending
    FROM public.get_budget_positions() WHERE status IN ('approved','active','locked')
  )
  SELECT cash.total_cash, cash.reserved, pos.allocated, pos.committed, pos.spent, pos.pending,
         cash.total_cash - pos.allocated AS unallocated,
         cash.total_cash - cash.reserved - pos.committed AS available
  FROM cash, pos;
$$;

REVOKE ALL ON FUNCTION public.get_budget_positions() FROM public, anon;
REVOKE ALL ON FUNCTION public.get_church_finance_position() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_budget_positions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_church_finance_position() TO authenticated;