CREATE TABLE public.legal_compliance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_type text NOT NULL CHECK (record_type IN ('registration_governance','financial_audit','property_land','contract_legal','operational_compliance','risk','legal_matter','calendar')),
  branch public.branch,
  title text NOT NULL,
  category text,
  reference_number text,
  issue_date date,
  review_date date,
  renewal_date date,
  responsible_person text,
  status text NOT NULL DEFAULT 'Under Review',
  document_url text,
  last_verified date,
  verified_by text,
  notes text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.legal_compliance_records TO authenticated;
GRANT ALL ON public.legal_compliance_records TO service_role;
ALTER TABLE public.legal_compliance_records ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_legal_compliance_member(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _user_id
      AND p.approval_status = 'approved'
      AND p.primary_department = 'protocol'
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.department_slug = 'protocol'
  )
$$;

CREATE POLICY "Legal compliance records are branch visible"
ON public.legal_compliance_records FOR SELECT TO authenticated
USING (
  public.is_approved_member(auth.uid())
  AND (
    public.is_head_office(auth.uid())
    OR branch IS NULL
    OR branch::text = public.my_branch()::text
  )
);
CREATE POLICY "Legal compliance team creates records"
ON public.legal_compliance_records FOR INSERT TO authenticated
WITH CHECK (
  (public.is_legal_compliance_member(auth.uid()) OR public.can_access_admin_panel(auth.uid()))
  AND created_by = auth.uid()
  AND (
    public.is_head_office(auth.uid())
    OR branch::text = public.my_branch()::text
    OR (branch IS NULL AND public.my_branch() IS NULL)
  )
);
CREATE POLICY "Legal compliance team updates records"
ON public.legal_compliance_records FOR UPDATE TO authenticated
USING (
  public.is_legal_compliance_member(auth.uid()) OR public.can_access_admin_panel(auth.uid())
)
WITH CHECK (
  (public.is_legal_compliance_member(auth.uid()) OR public.can_access_admin_panel(auth.uid()))
  AND (
    public.is_head_office(auth.uid())
    OR branch::text = public.my_branch()::text
    OR (branch IS NULL AND public.my_branch() IS NULL)
  )
);

CREATE TABLE public.legal_compliance_escalations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_record_id uuid REFERENCES public.legal_compliance_records(id) ON DELETE SET NULL,
  branch public.branch,
  matter text NOT NULL,
  reason text NOT NULL,
  priority text NOT NULL CHECK (priority IN ('Normal','High','Critical')),
  supporting_document_url text,
  submitted_by uuid NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'Submitted' CHECK (status IN ('Submitted','Acknowledged','In Review','Actioned','Closed')),
  chairperson_notes text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.legal_compliance_escalations TO authenticated;
GRANT ALL ON public.legal_compliance_escalations TO service_role;
ALTER TABLE public.legal_compliance_escalations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Legal escalations are visible to submitters and leadership"
ON public.legal_compliance_escalations FOR SELECT TO authenticated
USING (
  submitted_by = auth.uid()
  OR public.is_legal_compliance_member(auth.uid())
  OR public.has_role(auth.uid(), 'chairperson'::public.app_role)
  OR public.has_role(auth.uid(), 'senior_apostle'::public.app_role)
);
CREATE POLICY "Legal compliance team escalates"
ON public.legal_compliance_escalations FOR INSERT TO authenticated
WITH CHECK (
  submitted_by = auth.uid()
  AND (public.is_legal_compliance_member(auth.uid()) OR public.can_access_admin_panel(auth.uid()))
  AND (
    public.is_head_office(auth.uid())
    OR branch::text = public.my_branch()::text
    OR (branch IS NULL AND public.my_branch() IS NULL)
  )
);
CREATE POLICY "Chairperson leadership updates escalations"
ON public.legal_compliance_escalations FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'chairperson'::public.app_role)
  OR public.has_role(auth.uid(), 'senior_apostle'::public.app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'chairperson'::public.app_role)
  OR public.has_role(auth.uid(), 'senior_apostle'::public.app_role)
);

ALTER TABLE public.department_resources ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.department_resources ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.report_entries ADD COLUMN IF NOT EXISTS report_type text;
ALTER TABLE public.report_entries ADD COLUMN IF NOT EXISTS report_period text;
ALTER TABLE public.report_entries ADD COLUMN IF NOT EXISTS report_status text;
ALTER TABLE public.report_entries ADD COLUMN IF NOT EXISTS prepared_by text;
ALTER TABLE public.report_entries ADD COLUMN IF NOT EXISTS report_date date;

CREATE INDEX legal_compliance_records_type_branch_idx ON public.legal_compliance_records(record_type, branch);
CREATE INDEX legal_compliance_records_review_idx ON public.legal_compliance_records(review_date);
CREATE INDEX legal_compliance_escalations_status_idx ON public.legal_compliance_escalations(status, submitted_at DESC);