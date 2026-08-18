CREATE POLICY events_delete_governance ON public.events
FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'chairperson'::app_role)
  OR public.has_role(auth.uid(), 'secretary'::app_role)
  OR public.has_role(auth.uid(), 'senior_apostle'::app_role)
);