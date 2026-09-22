CREATE OR REPLACE FUNCTION public.sync_department_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- A member may serve in several departments, so changing their primary
  -- department must ADD the membership without removing existing ones.
  IF NEW.primary_department IS DISTINCT FROM OLD.primary_department
     AND NEW.primary_department IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role, department_slug)
    VALUES (NEW.id, 'team_member', NEW.primary_department)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;