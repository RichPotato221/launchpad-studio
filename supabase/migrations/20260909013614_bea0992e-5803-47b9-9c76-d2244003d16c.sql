
-- Documents register is a church-wide controlled library: all approved members may read it
DROP POLICY IF EXISTS "Approved scoped members view documents" ON public.documents;
DROP POLICY IF EXISTS "Approved members view documents" ON public.documents;
CREATE POLICY "Approved members view documents" ON public.documents
  FOR SELECT TO authenticated
  USING (public.is_approved_member(auth.uid()));

-- ...and download the underlying files
DROP POLICY IF EXISTS "Approved leadership read central documents" ON storage.objects;
DROP POLICY IF EXISTS "Approved members read central documents" ON storage.objects;
CREATE POLICY "Approved members read central documents" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'central-documents' AND public.is_approved_member(auth.uid()));
