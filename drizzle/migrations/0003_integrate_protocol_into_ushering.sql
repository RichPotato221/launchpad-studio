ALTER TABLE public.ush_roster
ADD COLUMN IF NOT EXISTS function_area text NOT NULL DEFAULT 'ushering';

ALTER TABLE public.ush_volunteers
ADD COLUMN IF NOT EXISTS function_assignment text NOT NULL DEFAULT 'usher';

CREATE TABLE public.ush_protocol_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch public.branch,
  service_id uuid REFERENCES public.ush_services(id) ON DELETE SET NULL,
  area text NOT NULL,
  title text NOT NULL,
  description text,
  assigned_person text,
  service_date date,
  status text NOT NULL DEFAULT 'planned',
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ush_protocol_plans TO authenticated;
GRANT ALL ON public.ush_protocol_plans TO service_role;

ALTER TABLE public.ush_protocol_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved members view branch protocol plans"
ON public.ush_protocol_plans
FOR SELECT
TO authenticated
USING (
  public.is_approved_member(auth.uid())
  AND (public.is_head_office(auth.uid()) OR branch IS NULL OR branch = public.my_branch())
);

CREATE POLICY "Ushering team creates branch protocol plans"
ON public.ush_protocol_plans
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND (public.is_dept_member('ushers') OR public.can_access_admin_panel(auth.uid()))
  AND (public.is_head_office(auth.uid()) OR branch = public.my_branch() OR (branch IS NULL AND public.my_branch() IS NULL))
);

CREATE POLICY "Ushering team updates branch protocol plans"
ON public.ush_protocol_plans
FOR UPDATE
TO authenticated
USING (
  public.is_dept_member('ushers') OR public.can_access_admin_panel(auth.uid())
)
WITH CHECK (
  public.is_dept_member('ushers') OR public.can_access_admin_panel(auth.uid())
);

CREATE POLICY "Ushering team deletes branch protocol plans"
ON public.ush_protocol_plans
FOR DELETE
TO authenticated
USING (
  public.is_dept_member('ushers') OR public.can_access_admin_panel(auth.uid())
);

CREATE INDEX ush_protocol_plans_branch_idx ON public.ush_protocol_plans(branch);
CREATE INDEX ush_protocol_plans_service_idx ON public.ush_protocol_plans(service_id);
CREATE INDEX ush_protocol_plans_status_idx ON public.ush_protocol_plans(status);