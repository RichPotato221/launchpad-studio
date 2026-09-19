CREATE POLICY "Legal compliance team uploads resources"
ON public.department_resources FOR INSERT TO authenticated
WITH CHECK (
  department_slug = 'protocol'
  AND uploaded_by = auth.uid()
  AND public.is_legal_compliance_member(auth.uid())
);
CREATE POLICY "Legal compliance team updates resources"
ON public.department_resources FOR UPDATE TO authenticated
USING (
  department_slug = 'protocol'
  AND public.is_legal_compliance_member(auth.uid())
)
WITH CHECK (
  department_slug = 'protocol'
  AND public.is_legal_compliance_member(auth.uid())
);

CREATE OR REPLACE FUNCTION public.touch_legal_compliance_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER touch_legal_compliance_records_updated_at
BEFORE UPDATE ON public.legal_compliance_records
FOR EACH ROW EXECUTE FUNCTION public.touch_legal_compliance_updated_at();
CREATE TRIGGER touch_legal_compliance_escalations_updated_at
BEFORE UPDATE ON public.legal_compliance_escalations
FOR EACH ROW EXECUTE FUNCTION public.touch_legal_compliance_updated_at();