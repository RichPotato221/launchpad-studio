DROP POLICY IF EXISTS "purchase_requests_delete_chair" ON public.purchase_requests;
CREATE POLICY "purchase_requests_delete_chair" ON public.purchase_requests
FOR DELETE TO authenticated
USING (
  (public.has_role(auth.uid(), 'chairperson'::app_role) AND public.same_branch_or_admin(branch))
  OR public.has_role(auth.uid(), 'senior_apostle'::app_role)
);