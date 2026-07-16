
-- ============ Profiles ============
DROP POLICY IF EXISTS "auth read profiles" ON public.profiles;

CREATE OR REPLACE FUNCTION public.can_view_profile(_viewer uuid, _target uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    _viewer = _target
    OR public.is_admin(_viewer)
    OR EXISTS (
      SELECT 1
      FROM public.profiles v
      JOIN public.profiles t ON t.id = _target
      WHERE v.id = _viewer
        AND v.approval_status = 'approved'
        AND t.approval_status = 'approved'
        AND v.primary_department IS NOT NULL
        AND v.primary_department = t.primary_department
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_roles vr
      JOIN public.user_roles tr ON vr.department_slug = tr.department_slug
      WHERE vr.user_id = _viewer
        AND tr.user_id = _target
        AND vr.department_slug IS NOT NULL
    );
$$;

CREATE POLICY "profiles_read_scoped" ON public.profiles
FOR SELECT TO authenticated
USING (public.can_view_profile(auth.uid(), id));

-- ============ KPIs ============
DROP POLICY IF EXISTS "auth read kpis" ON public.kpis;

CREATE POLICY "kpis_read_scoped" ON public.kpis
FOR SELECT TO authenticated
USING (
  public.is_admin(auth.uid())
  OR public.is_dept_member_or_admin(department_slug)
);

-- ============ Events ============
DROP POLICY IF EXISTS "events_read_all_auth" ON public.events;

CREATE POLICY "events_read_scoped" ON public.events
FOR SELECT TO authenticated
USING (
  public.is_admin(auth.uid())
  OR created_by = auth.uid()
  OR department_slug IS NULL
  OR public.is_dept_member_or_admin(department_slug)
);

-- ============ Event rosters ============
DROP POLICY IF EXISTS "rosters_read_all_auth" ON public.event_rosters;

CREATE POLICY "rosters_read_scoped" ON public.event_rosters
FOR SELECT TO authenticated
USING (
  public.is_admin(auth.uid())
  OR user_id = auth.uid()
  OR created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_rosters.event_id
      AND (
        e.created_by = auth.uid()
        OR (e.department_slug IS NOT NULL AND public.is_dept_member_or_admin(e.department_slug))
      )
  )
);

-- ============ Settings ============
DROP POLICY IF EXISTS "auth read settings" ON public.settings;

CREATE POLICY "settings_read_public_keys" ON public.settings
FOR SELECT TO authenticated
USING (
  public.is_admin(auth.uid())
  OR key IN ('theme_of_year', 'senior_apostle', 'church_info')
);

-- ============ Lock down SECURITY DEFINER functions ============
-- Trigger-only helpers: no direct callers needed
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

-- Policy helpers: only signed-in users need EXECUTE
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.is_dept_member_or_admin(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_dept_member_or_admin(text) TO authenticated;

REVOKE ALL ON FUNCTION public.user_dept_slugs(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_dept_slugs(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.can_view_profile(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_profile(uuid, uuid) TO authenticated;

-- RPC used by admins from the client
REVOKE ALL ON FUNCTION public.approve_member(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_member(uuid, boolean) TO authenticated;
