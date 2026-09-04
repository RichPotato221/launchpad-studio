DROP POLICY IF EXISTS finance_entries_delete ON public.finance_entries;
CREATE POLICY finance_entries_delete ON public.finance_entries
FOR DELETE TO authenticated
USING (
  created_by = auth.uid()
  OR (is_admin(auth.uid()) AND same_branch_or_admin(branch))
  OR (has_role(auth.uid(), 'chairperson'::app_role) AND same_branch_or_admin(branch))
);

DROP POLICY IF EXISTS "expense dept delete" ON public.expense_claims;
CREATE POLICY "expense dept delete" ON public.expense_claims
FOR DELETE TO authenticated
USING (
  is_dept_branch_member_or_admin(department_slug, branch)
  OR (has_role(auth.uid(), 'chairperson'::app_role) AND same_branch_or_admin(branch))
  OR (has_role(auth.uid(), 'lead_pastor'::app_role) AND same_branch_or_admin(branch))
);