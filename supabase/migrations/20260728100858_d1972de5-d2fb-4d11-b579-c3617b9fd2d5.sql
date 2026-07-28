DROP POLICY IF EXISTS "Members can view their own calendar connections" ON public.app_user_connections;
DROP POLICY IF EXISTS "Members can create their own calendar connections" ON public.app_user_connections;
DROP POLICY IF EXISTS "Members can update their own calendar connections" ON public.app_user_connections;
DROP POLICY IF EXISTS "Members can remove their own calendar connections" ON public.app_user_connections;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.app_user_connections FROM authenticated;
GRANT ALL ON public.app_user_connections TO service_role;