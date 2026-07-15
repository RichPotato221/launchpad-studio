REVOKE EXECUTE ON FUNCTION public.is_dept_member_or_admin(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_dept_member_or_admin(text) TO authenticated, service_role;