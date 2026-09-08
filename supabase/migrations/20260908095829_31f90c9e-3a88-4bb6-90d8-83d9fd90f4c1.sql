
REVOKE ALL ON FUNCTION public.enforce_branch_ownership() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.audit_sensitive_change() FROM PUBLIC, anon, authenticated;
