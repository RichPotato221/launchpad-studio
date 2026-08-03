CREATE TABLE public.payroll_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_label text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  branch branch,
  status text NOT NULL DEFAULT 'draft',
  notes text,
  created_by uuid NOT NULL,
  approved_by uuid,
  approved_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.payroll_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
  member_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  person_name text NOT NULL,
  role_title text,
  department_slug text,
  gross_amount numeric NOT NULL DEFAULT 0,
  allowances numeric NOT NULL DEFAULT 0,
  deductions numeric NOT NULL DEFAULT 0,
  net_amount numeric GENERATED ALWAYS AS (gross_amount + allowances - deductions) STORED,
  payment_status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.bank_statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_name text NOT NULL,
  branch branch,
  period_start date NOT NULL,
  period_end date NOT NULL,
  opening_balance numeric NOT NULL DEFAULT 0,
  closing_balance numeric NOT NULL DEFAULT 0,
  file_url text,
  file_name text,
  imported_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.bank_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_id uuid NOT NULL REFERENCES public.bank_statements(id) ON DELETE CASCADE,
  txn_date date NOT NULL,
  description text NOT NULL,
  reference text,
  amount numeric NOT NULL,
  direction text NOT NULL DEFAULT 'credit',
  match_status text NOT NULL DEFAULT 'unmatched',
  matched_entry_id uuid REFERENCES public.finance_entries(id) ON DELETE SET NULL,
  matched_by uuid,
  matched_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX payroll_lines_run_idx ON public.payroll_lines(run_id);
CREATE INDEX bank_transactions_stmt_idx ON public.bank_transactions(statement_id);
CREATE INDEX bank_transactions_status_idx ON public.bank_transactions(match_status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payroll_runs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payroll_lines TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_statements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_transactions TO authenticated;
GRANT ALL ON public.payroll_runs TO service_role;
GRANT ALL ON public.payroll_lines TO service_role;
GRANT ALL ON public.bank_statements TO service_role;
GRANT ALL ON public.bank_transactions TO service_role;

ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payroll_runs_finance" ON public.payroll_runs FOR ALL TO authenticated
  USING (public.is_finance_officer(auth.uid()) OR public.can_access_admin_panel(auth.uid()))
  WITH CHECK (public.is_finance_officer(auth.uid()) OR public.can_access_admin_panel(auth.uid()));

CREATE POLICY "payroll_lines_finance" ON public.payroll_lines FOR ALL TO authenticated
  USING (public.is_finance_officer(auth.uid()) OR public.can_access_admin_panel(auth.uid()))
  WITH CHECK (public.is_finance_officer(auth.uid()) OR public.can_access_admin_panel(auth.uid()));

CREATE POLICY "bank_statements_finance" ON public.bank_statements FOR ALL TO authenticated
  USING (public.is_finance_officer(auth.uid()) OR public.can_access_admin_panel(auth.uid()))
  WITH CHECK (public.is_finance_officer(auth.uid()) OR public.can_access_admin_panel(auth.uid()));

CREATE POLICY "bank_transactions_finance" ON public.bank_transactions FOR ALL TO authenticated
  USING (public.is_finance_officer(auth.uid()) OR public.can_access_admin_panel(auth.uid()))
  WITH CHECK (public.is_finance_officer(auth.uid()) OR public.can_access_admin_panel(auth.uid()));

CREATE TRIGGER payroll_runs_set_updated_at BEFORE UPDATE ON public.payroll_runs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER payroll_lines_set_updated_at BEFORE UPDATE ON public.payroll_lines FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER bank_statements_set_updated_at BEFORE UPDATE ON public.bank_statements FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER bank_transactions_set_updated_at BEFORE UPDATE ON public.bank_transactions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();