
INSERT INTO public.departments (slug, name, kind, parent_slug, sort_order)
SELECT 'lead-pastor', 'Lead Pastor', kind, parent_slug, sort_order
FROM public.departments WHERE slug = 'associate-pastor'
ON CONFLICT (slug) DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('senior_apostle','secretary','chairperson','lead_pastor','associate_pastor')
  );
$$;

CREATE OR REPLACE FUNCTION public.approve_member(_user_id uuid, _approve boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  p public.profiles%ROWTYPE;
  leadership_role public.app_role;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT * INTO p FROM public.profiles WHERE id = _user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;

  IF _approve THEN
    UPDATE public.profiles
      SET approval_status = 'approved',
          approved_at = now(),
          approved_by = auth.uid(),
          primary_department = p.requested_department_slug
      WHERE id = _user_id;

    IF p.requested_department_slug IS NOT NULL THEN
      INSERT INTO public.user_roles (user_id, role, department_slug)
      VALUES (_user_id, 'team_member', p.requested_department_slug)
      ON CONFLICT DO NOTHING;
    END IF;

    leadership_role := CASE p.requested_department_slug
      WHEN 'senior-pastor'    THEN 'senior_apostle'::public.app_role
      WHEN 'admin'            THEN 'senior_apostle'::public.app_role
      WHEN 'chairperson'      THEN 'chairperson'::public.app_role
      WHEN 'secretary'        THEN 'secretary'::public.app_role
      WHEN 'associate-pastor' THEN 'associate_pastor'::public.app_role
      WHEN 'lead-pastor'      THEN 'lead_pastor'::public.app_role
      ELSE NULL
    END;

    IF leadership_role IS NOT NULL THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (_user_id, leadership_role)
      ON CONFLICT DO NOTHING;
    END IF;
  ELSE
    UPDATE public.profiles
      SET approval_status = 'rejected',
          approved_at = now(),
          approved_by = auth.uid()
      WHERE id = _user_id;
  END IF;
END;
$$;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'senior_apostle'::public.app_role FROM public.profiles
WHERE approval_status='approved' AND primary_department IN ('senior-pastor','admin')
ON CONFLICT DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'chairperson'::public.app_role FROM public.profiles
WHERE approval_status='approved' AND primary_department='chairperson'
ON CONFLICT DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'secretary'::public.app_role FROM public.profiles
WHERE approval_status='approved' AND primary_department='secretary'
ON CONFLICT DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'associate_pastor'::public.app_role FROM public.profiles
WHERE approval_status='approved' AND primary_department='associate-pastor'
ON CONFLICT DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'lead_pastor'::public.app_role FROM public.profiles
WHERE approval_status='approved' AND primary_department='lead-pastor'
ON CONFLICT DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'senior_apostle'::public.app_role FROM public.profiles
WHERE approval_status='approved' AND lower(coalesce(requested_role,'')) LIKE '%senior pastor%'
ON CONFLICT DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'associate_pastor'::public.app_role FROM public.profiles
WHERE approval_status='approved' AND lower(coalesce(requested_role,'')) LIKE '%associate pastor%'
ON CONFLICT DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'lead_pastor'::public.app_role FROM public.profiles
WHERE approval_status='approved' AND lower(coalesce(requested_role,'')) LIKE '%lead pastor%'
ON CONFLICT DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'chairperson'::public.app_role FROM public.profiles
WHERE approval_status='approved' AND lower(coalesce(requested_role,'')) LIKE '%chairperson%'
ON CONFLICT DO NOTHING;
