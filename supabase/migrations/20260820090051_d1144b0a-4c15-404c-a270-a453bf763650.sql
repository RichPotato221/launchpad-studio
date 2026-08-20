DROP POLICY IF EXISTS events_insert ON public.events;
CREATE POLICY events_insert ON public.events
FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND (
    same_branch_or_admin(branch)
    OR (branch IS NULL AND (is_secretariat(auth.uid()) OR can_post_cross_branch(auth.uid())))
  )
  AND (
    is_admin(auth.uid())
    OR department_slug IS NULL
    OR is_dept_member_or_admin(department_slug)
  )
);