CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_type text,
  file_size bigint,
  storage_path text NOT NULL,
  uploaded_by uuid NOT NULL,
  department_slug text,
  tags text[] DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view shared documents"
  ON public.documents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Members can upload documents"
  ON public.documents FOR INSERT
  TO authenticated
  WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Uploader or admin can update documents"
  ON public.documents FOR UPDATE
  TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR public.is_admin(auth.uid())
  )
  WITH CHECK (
    uploaded_by = auth.uid()
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "Uploader or admin can delete documents"
  ON public.documents FOR DELETE
  TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR public.is_admin(auth.uid())
  );

CREATE OR REPLACE FUNCTION public.update_documents_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER documents_updated_at_trigger
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_documents_updated_at();

-- Storage policies for the central-documents bucket
CREATE POLICY "Authenticated members can read central documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'central-documents');

CREATE POLICY "Authenticated members can upload central documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'central-documents');

CREATE POLICY "Uploader or admin can delete central documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'central-documents'
    AND (
      owner = auth.uid()
      OR public.is_admin(auth.uid())
    )
  );

CREATE POLICY "Uploader or admin can update central documents"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'central-documents'
    AND (
      owner = auth.uid()
      OR public.is_admin(auth.uid())
    )
  )
  WITH CHECK (
    bucket_id = 'central-documents'
    AND (
      owner = auth.uid()
      OR public.is_admin(auth.uid())
    )
  );