-- ============ 1. Enterprise columns on finance_entries ============
ALTER TABLE public.finance_entries
  ADD COLUMN IF NOT EXISTS transaction_no text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS posting_date date,
  ADD COLUMN IF NOT EXISTS reference_number text,
  ADD COLUMN IF NOT EXISTS ministry text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_by uuid,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS finance_entries_transaction_no_key ON public.finance_entries (transaction_no);
CREATE INDEX IF NOT EXISTS finance_entries_status_idx ON public.finance_entries (status);
CREATE INDEX IF NOT EXISTS finance_entries_dept_date_idx ON public.finance_entries (department_slug, entry_date DESC);
CREATE INDEX IF NOT EXISTS finance_entries_branch_idx ON public.finance_entries (branch);

CREATE SEQUENCE IF NOT EXISTS public.finance_txn_seq;

CREATE OR REPLACE FUNCTION public.set_finance_transaction_no()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.transaction_no IS NULL THEN
    NEW.transaction_no := 'TRX-' || to_char(COALESCE(NEW.entry_date, current_date), 'YYYY') || '-' ||
      lpad(nextval('public.finance_txn_seq')::text, 6, '0');
  END IF;
  IF NEW.posting_date IS NULL THEN NEW.posting_date := COALESCE(NEW.entry_date, current_date); END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_finance_txn_no ON public.finance_entries;
CREATE TRIGGER trg_finance_txn_no BEFORE INSERT ON public.finance_entries
FOR EACH ROW EXECUTE FUNCTION public.set_finance_transaction_no();

UPDATE public.finance_entries
SET transaction_no = 'TRX-' || to_char(entry_date, 'YYYY') || '-' || lpad(nextval('public.finance_txn_seq')::text, 6, '0'),
    posting_date = COALESCE(posting_date, entry_date)
WHERE transaction_no IS NULL;

-- ============ 2. Enterprise columns on expense_claims ============
ALTER TABLE public.expense_claims
  ADD COLUMN IF NOT EXISTS reference_number text,
  ADD COLUMN IF NOT EXISTS ministry text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE INDEX IF NOT EXISTS expense_claims_status_idx ON public.expense_claims (status);
CREATE INDEX IF NOT EXISTS expense_claims_dept_idx ON public.expense_claims (department_slug, created_at DESC);

-- ============ 3. Finance helper ============
CREATE OR REPLACE FUNCTION public.is_finance_officer(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.gov_is_admin(_user_id)
     OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = _user_id AND ur.department_slug IN ('finance','finance-administration'))
     OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = _user_id AND p.approval_status = 'approved'
                  AND p.primary_department IN ('finance','finance-administration'));
$$;

REVOKE EXECUTE ON FUNCTION public.is_finance_officer(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_finance_officer(uuid) TO authenticated;

-- ============ 4. Budgets ============
CREATE TABLE IF NOT EXISTS public.budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  fiscal_year integer NOT NULL,
  department_slug text,
  branch public.branch,
  status text NOT NULL DEFAULT 'draft',
  total_amount numeric NOT NULL DEFAULT 0,
  notes text,
  created_by uuid,
  approved_by uuid,
  approved_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.budgets TO authenticated;
GRANT ALL ON public.budgets TO service_role;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "budgets_select" ON public.budgets;
CREATE POLICY "budgets_select" ON public.budgets FOR SELECT TO authenticated
USING (public.is_finance_officer(auth.uid()) OR public.is_dept_member_or_admin(COALESCE(department_slug, 'finance')));

DROP POLICY IF EXISTS "budgets_write" ON public.budgets;
CREATE POLICY "budgets_write" ON public.budgets FOR ALL TO authenticated
USING (public.is_finance_officer(auth.uid()))
WITH CHECK (public.is_finance_officer(auth.uid()));

CREATE INDEX IF NOT EXISTS budgets_year_idx ON public.budgets (fiscal_year, department_slug);

CREATE TABLE IF NOT EXISTS public.budget_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id uuid NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  category text NOT NULL,
  line_type text NOT NULL DEFAULT 'expense',
  planned_amount numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.budget_lines TO authenticated;
GRANT ALL ON public.budget_lines TO service_role;
ALTER TABLE public.budget_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "budget_lines_select" ON public.budget_lines;
CREATE POLICY "budget_lines_select" ON public.budget_lines FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.budgets b WHERE b.id = budget_id
        AND (public.is_finance_officer(auth.uid()) OR public.is_dept_member_or_admin(COALESCE(b.department_slug,'finance')))));

DROP POLICY IF EXISTS "budget_lines_write" ON public.budget_lines;
CREATE POLICY "budget_lines_write" ON public.budget_lines FOR ALL TO authenticated
USING (public.is_finance_officer(auth.uid()))
WITH CHECK (public.is_finance_officer(auth.uid()));

CREATE INDEX IF NOT EXISTS budget_lines_budget_idx ON public.budget_lines (budget_id);

DROP TRIGGER IF EXISTS trg_budgets_updated ON public.budgets;
CREATE TRIGGER trg_budgets_updated BEFORE UPDATE ON public.budgets
FOR EACH ROW EXECUTE FUNCTION public.gov_set_updated_at();

DROP TRIGGER IF EXISTS trg_budget_lines_updated ON public.budget_lines;
CREATE TRIGGER trg_budget_lines_updated BEFORE UPDATE ON public.budget_lines
FOR EACH ROW EXECUTE FUNCTION public.gov_set_updated_at();

-- ============ 5. Audit logging ============
DROP TRIGGER IF EXISTS trg_audit_finance_entries ON public.finance_entries;
CREATE TRIGGER trg_audit_finance_entries AFTER INSERT OR UPDATE OR DELETE ON public.finance_entries
FOR EACH ROW EXECUTE FUNCTION public.gov_log_audit_event();

DROP TRIGGER IF EXISTS trg_audit_expense_claims ON public.expense_claims;
CREATE TRIGGER trg_audit_expense_claims AFTER INSERT OR UPDATE OR DELETE ON public.expense_claims
FOR EACH ROW EXECUTE FUNCTION public.gov_log_audit_event();

DROP TRIGGER IF EXISTS trg_audit_budgets ON public.budgets;
CREATE TRIGGER trg_audit_budgets AFTER INSERT OR UPDATE OR DELETE ON public.budgets
FOR EACH ROW EXECUTE FUNCTION public.gov_log_audit_event();

-- ============ 6. Executive finance summary ============
CREATE OR REPLACE FUNCTION public.get_finance_summary(_months integer DEFAULT 12)
RETURNS TABLE(
  total_income numeric, total_expense numeric, cash_position numeric,
  income_this_month numeric, expense_this_month numeric,
  giving_today numeric, giving_this_month numeric,
  outstanding_payments numeric, pending_approvals bigint
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH inc AS (
    SELECT COALESCE(sum(amount),0) AS total,
           COALESCE(sum(amount) FILTER (WHERE date_trunc('month', entry_date) = date_trunc('month', current_date)),0) AS month,
           COALESCE(sum(amount) FILTER (WHERE entry_date = current_date),0) AS today
    FROM public.finance_entries
    WHERE archived_at IS NULL
      AND kind IN ('sunday_contribution','tithe','offering','first_fruits','seed','pledge')
      AND entry_date >= (current_date - (_months || ' months')::interval)
  ),
  exp AS (
    SELECT COALESCE(sum(amount) FILTER (WHERE status = 'paid'),0) AS total,
           COALESCE(sum(amount) FILTER (WHERE status = 'paid' AND date_trunc('month', created_at) = date_trunc('month', current_date)),0) AS month,
           COALESCE(sum(amount) FILTER (WHERE status NOT IN ('paid','rejected')),0) AS outstanding,
           count(*) FILTER (WHERE status IN ('pending','chair_approved')) AS pending
    FROM public.expense_claims
    WHERE archived_at IS NULL
      AND created_at >= (now() - (_months || ' months')::interval)
  )
  SELECT inc.total, exp.total, inc.total - exp.total, inc.month, exp.month,
         inc.today, inc.month, exp.outstanding, exp.pending
  FROM inc, exp;
$$;

REVOKE EXECUTE ON FUNCTION public.get_finance_summary(integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_finance_summary(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_budget_utilisation(_fiscal_year integer DEFAULT NULL)
RETURNS TABLE(budget_id uuid, name text, department_slug text, branch public.branch,
              fiscal_year integer, planned numeric, actual numeric, utilisation_pct numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT b.id, b.name, b.department_slug, b.branch, b.fiscal_year,
         COALESCE(sum(bl.planned_amount),0) AS planned,
         COALESCE((SELECT sum(e.amount) FROM public.expense_claims e
                    WHERE e.department_slug = b.department_slug
                      AND e.status = 'paid' AND e.archived_at IS NULL
                      AND extract(year FROM e.created_at) = b.fiscal_year),0) AS actual,
         CASE WHEN COALESCE(sum(bl.planned_amount),0) > 0
              THEN round(COALESCE((SELECT sum(e.amount) FROM public.expense_claims e
                    WHERE e.department_slug = b.department_slug AND e.status = 'paid'
                      AND e.archived_at IS NULL AND extract(year FROM e.created_at) = b.fiscal_year),0)
                    / sum(bl.planned_amount) * 100, 1)
              ELSE 0 END
  FROM public.budgets b
  LEFT JOIN public.budget_lines bl ON bl.budget_id = b.id
  WHERE b.archived_at IS NULL AND (_fiscal_year IS NULL OR b.fiscal_year = _fiscal_year)
  GROUP BY b.id, b.name, b.department_slug, b.branch, b.fiscal_year
  ORDER BY b.fiscal_year DESC, b.name;
$$;

REVOKE EXECUTE ON FUNCTION public.get_budget_utilisation(integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_budget_utilisation(integer) TO authenticated;