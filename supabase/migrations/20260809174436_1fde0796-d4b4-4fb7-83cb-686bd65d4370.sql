CREATE TABLE IF NOT EXISTS public.fin_month_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_month date NOT NULL,
  branch branch,
  status text NOT NULL DEFAULT 'open',
  opening_balance numeric NOT NULL DEFAULT 0,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS fin_month_periods_unique_branch ON public.fin_month_periods (period_month, branch) WHERE branch IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS fin_month_periods_unique_all ON public.fin_month_periods (period_month) WHERE branch IS NULL;

CREATE TABLE IF NOT EXISTS public.fin_month_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id uuid NOT NULL REFERENCES public.fin_month_periods(id) ON DELETE CASCADE,
  section text NOT NULL,
  category text NOT NULL,
  target numeric NOT NULL DEFAULT 0,
  actual numeric NOT NULL DEFAULT 0,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS fin_month_lines_period_idx ON public.fin_month_lines (period_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_month_periods TO authenticated;
GRANT ALL ON public.fin_month_periods TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_month_lines TO authenticated;
GRANT ALL ON public.fin_month_lines TO service_role;

ALTER TABLE public.fin_month_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_month_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Finance and leadership read months" ON public.fin_month_periods;
CREATE POLICY "Finance and leadership read months"
ON public.fin_month_periods FOR SELECT TO authenticated
USING (public.is_finance_officer(auth.uid()) OR public.can_access_admin_panel(auth.uid()));

DROP POLICY IF EXISTS "Finance and leadership manage months" ON public.fin_month_periods;
CREATE POLICY "Finance and leadership manage months"
ON public.fin_month_periods FOR ALL TO authenticated
USING (public.is_finance_officer(auth.uid()) OR public.can_access_admin_panel(auth.uid()))
WITH CHECK (public.is_finance_officer(auth.uid()) OR public.can_access_admin_panel(auth.uid()));

DROP POLICY IF EXISTS "Finance and leadership read month lines" ON public.fin_month_lines;
CREATE POLICY "Finance and leadership read month lines"
ON public.fin_month_lines FOR SELECT TO authenticated
USING (public.is_finance_officer(auth.uid()) OR public.can_access_admin_panel(auth.uid()));

DROP POLICY IF EXISTS "Finance and leadership manage month lines" ON public.fin_month_lines;
CREATE POLICY "Finance and leadership manage month lines"
ON public.fin_month_lines FOR ALL TO authenticated
USING (public.is_finance_officer(auth.uid()) OR public.can_access_admin_panel(auth.uid()))
WITH CHECK (public.is_finance_officer(auth.uid()) OR public.can_access_admin_panel(auth.uid()));

DROP TRIGGER IF EXISTS fin_month_periods_updated_at ON public.fin_month_periods;
CREATE TRIGGER fin_month_periods_updated_at BEFORE UPDATE ON public.fin_month_periods
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS fin_month_lines_updated_at ON public.fin_month_lines;
CREATE TRIGGER fin_month_lines_updated_at BEFORE UPDATE ON public.fin_month_lines
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();