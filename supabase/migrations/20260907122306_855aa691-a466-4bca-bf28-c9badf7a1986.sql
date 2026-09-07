CREATE POLICY "budgets_leadership_delete" ON public.budgets FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'senior_apostle'::app_role)
  OR ((has_role(auth.uid(), 'chairperson'::app_role) OR has_role(auth.uid(), 'lead_pastor'::app_role)) AND same_branch_or_admin(branch))
);