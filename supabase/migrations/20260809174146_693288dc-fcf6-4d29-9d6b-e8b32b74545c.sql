-- 1. Documents register
DROP POLICY IF EXISTS "Members can view shared documents" ON public.documents;
CREATE POLICY "Approved scoped members view documents"
ON public.documents FOR SELECT TO authenticated
USING (
  public.is_approved_member(auth.uid())
  AND (
    public.can_access_admin_panel(auth.uid())
    OR public.is_secretariat(auth.uid())
    OR uploaded_by = auth.uid()
    OR (department_slug IS NOT NULL AND public.is_dept_member_or_admin(department_slug))
    OR EXISTS (
      SELECT 1 FROM public.document_permissions dp
      WHERE dp.document_id = documents.id
        AND (
          dp.user_id = auth.uid()
          OR (dp.role IS NOT NULL AND public.has_role(auth.uid(), dp.role))
          OR (dp.branch IS NOT NULL AND EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid() AND p.branch = dp.branch))
        )
    )
  )
);

-- 2. Apostolic office data
DROP POLICY IF EXISTS "apo_objectives read" ON public.apo_objectives;
CREATE POLICY "apo_objectives read" ON public.apo_objectives FOR SELECT TO authenticated
USING (public.is_apostolic_office(auth.uid()) OR public.can_access_admin_panel(auth.uid()));

DROP POLICY IF EXISTS "apo_projects read" ON public.apo_projects;
CREATE POLICY "apo_projects read" ON public.apo_projects FOR SELECT TO authenticated
USING (public.is_apostolic_office(auth.uid()) OR public.can_access_admin_panel(auth.uid()));

DROP POLICY IF EXISTS "apo_directives read" ON public.apo_directives;
CREATE POLICY "apo_directives read" ON public.apo_directives FOR SELECT TO authenticated
USING (public.is_apostolic_office(auth.uid()) OR public.can_access_admin_panel(auth.uid()));

-- 5. Department resources
DROP POLICY IF EXISTS "Members can view department resources" ON public.department_resources;
CREATE POLICY "Approved dept members view resources"
ON public.department_resources FOR SELECT TO authenticated
USING (
  public.is_approved_member(auth.uid())
  AND (public.can_access_admin_panel(auth.uid()) OR public.is_dept_member_or_admin(department_slug))
);

-- 6. Asset stock movements
DROP POLICY IF EXISTS "asset_movements_read" ON public.asset_stock_movements;
CREATE POLICY "asset_movements_read" ON public.asset_stock_movements FOR SELECT TO authenticated
USING (
  public.is_approved_member(auth.uid())
  AND (public.can_access_admin_panel(auth.uid()) OR public.is_resource_team(auth.uid()))
);

-- 3 & 4. Central document storage bucket
DROP POLICY IF EXISTS "Authenticated members can read central documents" ON storage.objects;
CREATE POLICY "Approved leadership read central documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'central-documents'
  AND public.is_approved_member(auth.uid())
  AND (
    owner = auth.uid()
    OR public.can_access_admin_panel(auth.uid())
    OR public.is_secretariat(auth.uid())
  )
);

DROP POLICY IF EXISTS "Authenticated members can upload central documents" ON storage.objects;
CREATE POLICY "Secretariat and admins upload central documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'central-documents'
  AND public.is_approved_member(auth.uid())
  AND (public.can_access_admin_panel(auth.uid()) OR public.is_secretariat(auth.uid()))
);