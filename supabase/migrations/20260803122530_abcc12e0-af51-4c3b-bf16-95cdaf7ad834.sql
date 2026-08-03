ALTER TABLE public.budgets
  ADD COLUMN IF NOT EXISTS budget_type text NOT NULL DEFAULT 'department',
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS locked_at timestamptz;

CREATE TABLE IF NOT EXISTS public.budget_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id uuid NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  version integer NOT NULL,
  previous_amount numeric,
  new_amount numeric,
  previous_status text,
  new_status text,
  reason text,
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.budget_revisions TO authenticated;
GRANT ALL ON public.budget_revisions TO service_role;
ALTER TABLE public.budget_revisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "budget_revisions_select" ON public.budget_revisions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.budgets b
    WHERE b.id = budget_revisions.budget_id
      AND (public.is_finance_officer(auth.uid())
           OR public.is_dept_member_or_admin(COALESCE(b.department_slug, 'finance')))
  ));

CREATE POLICY "budget_revisions_insert" ON public.budget_revisions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_finance_officer(auth.uid()));

CREATE INDEX IF NOT EXISTS budget_revisions_budget_idx ON public.budget_revisions(budget_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.budget_guard_and_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IN ('approved', 'locked') AND NOT public.is_finance_officer(auth.uid()) THEN
    RAISE EXCEPTION 'This budget is approved and locked. Only a finance officer may amend it.';
  END IF;

  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    NEW.locked_at := now();
    NEW.approved_at := COALESCE(NEW.approved_at, now());
    NEW.approved_by := COALESCE(NEW.approved_by, auth.uid());
  END IF;

  IF NEW.total_amount IS DISTINCT FROM OLD.total_amount OR NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.version := OLD.version + 1;
    INSERT INTO public.budget_revisions
      (budget_id, version, previous_amount, new_amount, previous_status, new_status, reason, changed_by)
    VALUES (OLD.id, NEW.version, OLD.total_amount, NEW.total_amount, OLD.status, NEW.status, NEW.notes, auth.uid());
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_budget_guard ON public.budgets;
CREATE TRIGGER trg_budget_guard BEFORE UPDATE ON public.budgets
  FOR EACH ROW EXECUTE FUNCTION public.budget_guard_and_version();

DROP FUNCTION IF EXISTS public.get_budget_utilisation(integer);

CREATE FUNCTION public.get_budget_utilisation(_fiscal_year integer DEFAULT NULL)
RETURNS TABLE(
  budget_id uuid, name text, department_slug text, branch branch, fiscal_year integer,
  planned numeric, actual numeric, committed numeric, remaining numeric,
  variance numeric, utilisation_pct numeric, budget_type text, status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH b AS (
    SELECT bu.id, bu.name, bu.department_slug, bu.branch, bu.fiscal_year, bu.budget_type, bu.status,
           GREATEST(
             COALESCE(bu.total_amount, 0),
             COALESCE((SELECT SUM(bl.planned_amount) FROM public.budget_lines bl WHERE bl.budget_id = bu.id), 0)
           ) AS planned
    FROM public.budgets bu
    WHERE bu.archived_at IS NULL AND (_fiscal_year IS NULL OR bu.fiscal_year = _fiscal_year)
  ),
  spend AS (
    SELECT b.id AS bid,
           COALESCE((SELECT SUM(e.amount) FROM public.expense_claims e
                      WHERE e.department_slug IS NOT DISTINCT FROM b.department_slug
                        AND e.status = 'paid' AND e.archived_at IS NULL
                        AND EXTRACT(YEAR FROM e.created_at) = b.fiscal_year), 0) AS actual,
           COALESCE((SELECT SUM(COALESCE(pr.amount_actual, pr.amount_estimated, 0))
                       FROM public.purchase_requests pr
                      WHERE pr.budget_id = b.id
                        AND pr.status IN ('chair_approved','senior_pastor_approved','approved','ordered','received','completed')), 0) AS committed
    FROM b
  )
  SELECT b.id, b.name, b.department_slug, b.branch, b.fiscal_year,
         ROUND(b.planned, 2),
         ROUND(s.actual, 2),
         ROUND(s.committed, 2),
         ROUND(b.planned - s.actual - s.committed, 2),
         ROUND(b.planned - s.actual, 2),
         CASE WHEN b.planned > 0
              THEN ROUND(((s.actual + s.committed) / b.planned) * 100, 1)
              ELSE 0 END,
         b.budget_type, b.status
  FROM b JOIN spend s ON s.bid = b.id
  ORDER BY b.fiscal_year DESC, b.name;
$$;

REVOKE EXECUTE ON FUNCTION public.get_budget_utilisation(integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_budget_utilisation(integer) TO authenticated;