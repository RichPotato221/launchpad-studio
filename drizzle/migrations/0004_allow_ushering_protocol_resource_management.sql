CREATE POLICY "Ushering protocol team uploads resources"
ON public.department_resources
FOR INSERT
TO authenticated
WITH CHECK (
  department_slug = 'ushers'
  AND uploaded_by = auth.uid()
  AND public.is_dept_member('ushers')
);

CREATE POLICY "Ushering protocol team updates resources"
ON public.department_resources
FOR UPDATE
TO authenticated
USING (
  department_slug = 'ushers'
  AND public.is_dept_member('ushers')
)
WITH CHECK (
  department_slug = 'ushers'
  AND public.is_dept_member('ushers')
);