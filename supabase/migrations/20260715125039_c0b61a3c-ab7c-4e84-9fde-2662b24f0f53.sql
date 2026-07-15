
-- 1. Add claim_type to expense_claims
ALTER TABLE public.expense_claims ADD COLUMN IF NOT EXISTS claim_type text;

-- 2. Finance entries (ledger for journals + all transaction kinds)
CREATE TABLE IF NOT EXISTS public.finance_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_slug text NOT NULL DEFAULT 'finance',
  kind text NOT NULL,  -- journal | sunday_contribution | tithe | offering | procurement | first_fruits | seed | pledge | other
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  title text NOT NULL,
  notes text,
  amount numeric,
  member_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  file_url text,
  file_name text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_entries TO authenticated;
GRANT ALL ON public.finance_entries TO service_role;

ALTER TABLE public.finance_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "finance_entries_select" ON public.finance_entries
  FOR SELECT TO authenticated
  USING (public.is_dept_member_or_admin(department_slug));

CREATE POLICY "finance_entries_insert" ON public.finance_entries
  FOR INSERT TO authenticated
  WITH CHECK (public.is_dept_member_or_admin(department_slug) AND created_by = auth.uid());

CREATE POLICY "finance_entries_update" ON public.finance_entries
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "finance_entries_delete" ON public.finance_entries
  FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.is_admin(auth.uid()));

CREATE TRIGGER finance_entries_updated_at
  BEFORE UPDATE ON public.finance_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS finance_entries_dept_kind_date_idx
  ON public.finance_entries (department_slug, kind, entry_date DESC);
CREATE INDEX IF NOT EXISTS finance_entries_member_idx
  ON public.finance_entries (member_id);
