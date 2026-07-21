
-- Storage policies for cockpit-attachments (senior_apostle upload; approved members read)
CREATE POLICY "cockpit_attach_insert_senior_pastor"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'cockpit-attachments'
  AND public.has_role(auth.uid(), 'senior_apostle'::public.app_role)
);

CREATE POLICY "cockpit_attach_read_approved"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'cockpit-attachments'
  AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.approval_status = 'approved')
);

CREATE POLICY "cockpit_attach_delete_own_or_admin"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'cockpit-attachments'
  AND (owner = auth.uid() OR public.can_access_admin_panel(auth.uid()))
);

-- Storage policies for announcement-attachments (any approved member)
CREATE POLICY "ann_attach_insert_approved"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'announcement-attachments'
  AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.approval_status = 'approved')
);

CREATE POLICY "ann_attach_read_approved"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'announcement-attachments'
  AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.approval_status = 'approved')
);

CREATE POLICY "ann_attach_delete_own_or_admin"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'announcement-attachments'
  AND (owner = auth.uid() OR public.can_access_admin_panel(auth.uid()))
);
