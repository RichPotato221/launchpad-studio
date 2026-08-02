CREATE SEQUENCE IF NOT EXISTS public.purchase_request_seq;

CREATE TABLE public.purchase_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pr_number text UNIQUE,
  department_slug text NOT NULL,
  branch public.branch,
  requester_id uuid NOT NULL DEFAULT auth.uid(),
  supplier_id uuid REFERENCES public.suppliers(id),
  budget_id uuid REFERENCES public.budgets(id),
  title text NOT NULL,
  description text,
  category text,
  amount_estimated numeric NOT NULL DEFAULT 0,
  amount_actual numeric,
  needed_by date,
  priority text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'submitted',
  quote_url text,
  quote_name text,
  approved_by_chair uuid,
  chair_comment text,
  chair_approved_at timestamptz,
  approved_by_senior uuid,
  senior_comment text,
  senior_approved_at timestamptz,
  rejection_reason text,
  po_number text,
  ordered_at timestamptz,
  received_at timestamptz,
  archived_at timestamptz,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT purchase_requests_status_check CHECK (status IN ('draft','submitted','chair_approved','senior_pastor_approved','ordered','received','rejected','cancelled'))
);

CREATE TABLE public.purchase_request_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.purchase_requests(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX purchase_requests_dept_idx ON public.purchase_requests (department_slug, created_at DESC);
CREATE INDEX purchase_requests_status_idx ON public.purchase_requests (status);
CREATE INDEX purchase_request_items_request_idx ON public.purchase_request_items (request_id);

GRANT SELECT, INSERT, UPDATE ON public.purchase_requests TO authenticated;
GRANT ALL ON public.purchase_requests TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_request_items TO authenticated;
GRANT ALL ON public.purchase_request_items TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.purchase_request_seq TO authenticated, service_role;

ALTER TABLE public.purchase_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_request_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pr read" ON public.purchase_requests FOR SELECT TO authenticated
USING (requester_id = auth.uid() OR public.is_finance_officer(auth.uid()) OR public.is_dept_member_or_admin(department_slug));

CREATE POLICY "pr insert own" ON public.purchase_requests FOR INSERT TO authenticated
WITH CHECK (requester_id = auth.uid());

CREATE POLICY "pr update" ON public.purchase_requests FOR UPDATE TO authenticated
USING (public.is_finance_officer(auth.uid()) OR public.is_admin(auth.uid()) OR (requester_id = auth.uid() AND status IN ('draft','submitted')))
WITH CHECK (public.is_finance_officer(auth.uid()) OR public.is_admin(auth.uid()) OR (requester_id = auth.uid() AND status IN ('draft','submitted')));

CREATE POLICY "pr items read" ON public.purchase_request_items FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.purchase_requests r WHERE r.id = request_id
  AND (r.requester_id = auth.uid() OR public.is_finance_officer(auth.uid()) OR public.is_dept_member_or_admin(r.department_slug))));

CREATE POLICY "pr items write" ON public.purchase_request_items FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.purchase_requests r WHERE r.id = request_id
  AND (r.requester_id = auth.uid() OR public.is_finance_officer(auth.uid()))))
WITH CHECK (EXISTS (SELECT 1 FROM public.purchase_requests r WHERE r.id = request_id
  AND (r.requester_id = auth.uid() OR public.is_finance_officer(auth.uid()))));

CREATE OR REPLACE FUNCTION public.set_purchase_request_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.pr_number IS NULL THEN
    NEW.pr_number := 'PR-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.purchase_request_seq')::text, 6, '0');
  END IF;
  IF NEW.branch IS NULL THEN
    SELECT branch INTO NEW.branch FROM public.profiles WHERE id = auth.uid();
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER purchase_requests_number BEFORE INSERT ON public.purchase_requests
FOR EACH ROW EXECUTE FUNCTION public.set_purchase_request_number();

CREATE TRIGGER purchase_requests_updated_at BEFORE UPDATE ON public.purchase_requests
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER purchase_requests_audit AFTER INSERT OR UPDATE OR DELETE ON public.purchase_requests
FOR EACH ROW EXECUTE FUNCTION public.gov_log_audit_event();