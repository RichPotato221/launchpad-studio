CREATE POLICY "Approved members can read asset documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'asset-documents' AND public.is_approved_member(auth.uid()));

CREATE POLICY "Resource team can upload asset documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'asset-documents' AND (
    public.is_resource_team(auth.uid())
    OR public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'chairperson')
    OR public.has_role(auth.uid(), 'senior_apostle')
    OR public.has_role(auth.uid(), 'secretary')
    OR public.has_role(auth.uid(), 'lead_pastor')
    OR public.has_role(auth.uid(), 'associate_pastor')
  )
);

CREATE POLICY "Resource team can update asset documents"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'asset-documents' AND (
    owner = auth.uid()
    OR public.is_resource_team(auth.uid())
    OR public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'chairperson')
    OR public.has_role(auth.uid(), 'senior_apostle')
  )
);

CREATE POLICY "Resource team can delete asset documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'asset-documents' AND (
    owner = auth.uid()
    OR public.is_resource_team(auth.uid())
    OR public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'chairperson')
    OR public.has_role(auth.uid(), 'senior_apostle')
  )
);