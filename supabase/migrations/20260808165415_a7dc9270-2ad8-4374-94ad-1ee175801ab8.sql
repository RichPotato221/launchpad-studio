-- 1. Fix mutable search_path on remaining functions
ALTER FUNCTION public.can_access_admin_panel(uuid) SET search_path = public;
ALTER FUNCTION public.is_admin(uuid) SET search_path = public;
ALTER FUNCTION public.gov_set_updated_at() SET search_path = public;
ALTER FUNCTION public.gov_user_department_slugs(uuid) SET search_path = public;
ALTER FUNCTION public.gov_log_audit_event() SET search_path = public;
ALTER FUNCTION public.gov_has_role(uuid, public.app_role) SET search_path = public;
ALTER FUNCTION public.gov_is_admin(uuid) SET search_path = public;
ALTER FUNCTION public.gov_can_access_department(uuid, text) SET search_path = public;
ALTER FUNCTION public.gov_can_access_branch(uuid, public.branch) SET search_path = public;

-- 2. Views must run with the querying user's rights (RLS applies)
ALTER VIEW public.department_directory SET (security_invoker = on);
ALTER VIEW public.assets_low_stock SET (security_invoker = on);
ALTER VIEW public.new_members_by_sunday SET (security_invoker = on);
ALTER VIEW public.leadership_attendance SET (security_invoker = on);
ALTER VIEW public.sunday_rsvp_counts SET (security_invoker = on);
ALTER VIEW public.member_directory SET (security_invoker = on);
ALTER VIEW public.kpi_status SET (security_invoker = on);

-- 3. No anonymous execution of any public function; no direct calls to trigger functions
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prorettype = 'trigger'::regtype
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated, anon, public', r.sig);
  END LOOP;
END $$;

-- 4. Agenda items: inherit the parent agenda's access rules
DROP POLICY IF EXISTS agenda_items_select ON public.agenda_items;
CREATE POLICY agenda_items_select ON public.agenda_items
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.agendas a
    JOIN public.meetings m ON m.id = a.meeting_id
    WHERE a.id = agenda_items.agenda_id
      AND (public.gov_is_admin(auth.uid())
           OR m.chairperson_id = auth.uid()
           OR m.secretary_id = auth.uid()
           OR m.created_by = auth.uid())
  )
);

-- 5. Resolutions: approved members only, signed in
DROP POLICY IF EXISTS resolutions_select ON public.resolutions;
CREATE POLICY resolutions_select ON public.resolutions
FOR SELECT TO authenticated
USING (
  public.gov_is_admin(auth.uid())
  OR owner_id = auth.uid()
  OR created_by = auth.uid()
  OR public.is_secretariat(auth.uid())
  OR (department_slug IS NOT NULL AND public.gov_can_access_department(auth.uid(), department_slug))
);

-- 6. Document versions: only users who can see the parent document
DROP POLICY IF EXISTS document_versions_select ON public.document_versions;
CREATE POLICY document_versions_select ON public.document_versions
FOR SELECT TO authenticated
USING (
  public.is_approved_member(auth.uid())
  AND EXISTS (SELECT 1 FROM public.documents d WHERE d.id = document_versions.document_id)
);

-- 7. Digital signatures: signer or admins only
DROP POLICY IF EXISTS signatures_select ON public.digital_signatures;
CREATE POLICY signatures_select ON public.digital_signatures
FOR SELECT TO authenticated
USING (signer_id = auth.uid() OR public.gov_is_admin(auth.uid()) OR public.is_secretariat(auth.uid()));

-- 8. Correspondence responses: scope to the parent correspondence
DROP POLICY IF EXISTS corr_responses_read ON public.correspondence_responses;
CREATE POLICY corr_responses_read ON public.correspondence_responses
FOR SELECT TO authenticated
USING (
  responded_by = auth.uid()
  OR public.is_secretariat(auth.uid())
  OR public.gov_is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.correspondence c
    WHERE c.id = correspondence_responses.correspondence_id
      AND (c.assigned_to = auth.uid()
           OR public.gov_can_access_department(auth.uid(), c.department_slug))
  )
);

-- 9. Suppliers: finance / resource / admin only
DROP POLICY IF EXISTS suppliers_read ON public.suppliers;
CREATE POLICY suppliers_read ON public.suppliers
FOR SELECT TO authenticated
USING (public.is_finance_officer(auth.uid()) OR public.is_resource_team(auth.uid()) OR public.can_access_admin_panel(auth.uid()));

DROP POLICY IF EXISTS asset_suppliers_read ON public.asset_suppliers;
CREATE POLICY asset_suppliers_read ON public.asset_suppliers
FOR SELECT TO authenticated
USING (public.is_finance_officer(auth.uid()) OR public.is_resource_team(auth.uid()) OR public.can_access_admin_panel(auth.uid()));

-- 10. Member phone numbers: owner and admins only
REVOKE SELECT (phone) ON public.profiles FROM authenticated;

CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS TABLE(id uuid, full_name text, phone text, email text, avatar_url text, primary_department text, branch public.branch, approval_status text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.phone, p.email, p.avatar_url, p.primary_department, p.branch, p.approval_status
  FROM public.profiles p
  WHERE p.id = auth.uid();
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_profile() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

-- get_member_profile must not leak contact details to ordinary members
CREATE OR REPLACE FUNCTION public.get_member_profile(_member_id uuid)
RETURNS TABLE(id uuid, full_name text, avatar_url text, primary_department text, department_name text, requested_role text, branch public.branch, email text, phone text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id, p.full_name, p.avatar_url, p.primary_department, d.name,
    p.requested_role, p.branch,
    CASE WHEN auth.uid() = p.id OR public.is_admin(auth.uid()) THEN p.email ELSE NULL END,
    CASE WHEN auth.uid() = p.id OR public.is_admin(auth.uid()) THEN p.phone ELSE NULL END
  FROM public.profiles p
  LEFT JOIN public.departments d ON d.slug = p.primary_department
  WHERE p.id = _member_id AND p.approval_status = 'approved'
    AND public.is_approved_member(auth.uid());
$$;

REVOKE EXECUTE ON FUNCTION public.get_member_profile(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_member_profile(uuid) TO authenticated;