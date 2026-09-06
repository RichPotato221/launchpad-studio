CREATE TABLE public.asset_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL DEFAULT 'receipt',
  title TEXT NOT NULL,
  file_url TEXT,
  storage_path TEXT,
  file_size BIGINT,
  mime_type TEXT,
  doc_date DATE,
  notes TEXT,
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX asset_documents_asset_id_idx ON public.asset_documents(asset_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.asset_documents TO authenticated;
GRANT ALL ON public.asset_documents TO service_role;

ALTER TABLE public.asset_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved members can view asset documents"
ON public.asset_documents FOR SELECT TO authenticated
USING (public.is_approved_member(auth.uid()));

CREATE POLICY "Resource team and leadership can add asset documents"
ON public.asset_documents FOR INSERT TO authenticated
WITH CHECK (
  public.is_resource_team(auth.uid())
  OR public.is_admin(auth.uid())
  OR public.has_role(auth.uid(), 'chairperson')
  OR public.has_role(auth.uid(), 'senior_apostle')
  OR public.has_role(auth.uid(), 'secretary')
  OR public.has_role(auth.uid(), 'lead_pastor')
  OR public.has_role(auth.uid(), 'associate_pastor')
);

CREATE POLICY "Resource team and leadership can update asset documents"
ON public.asset_documents FOR UPDATE TO authenticated
USING (
  uploaded_by = auth.uid()
  OR public.is_resource_team(auth.uid())
  OR public.is_admin(auth.uid())
  OR public.has_role(auth.uid(), 'chairperson')
  OR public.has_role(auth.uid(), 'senior_apostle')
);

CREATE POLICY "Resource team and leadership can delete asset documents"
ON public.asset_documents FOR DELETE TO authenticated
USING (
  uploaded_by = auth.uid()
  OR public.is_resource_team(auth.uid())
  OR public.is_admin(auth.uid())
  OR public.has_role(auth.uid(), 'chairperson')
  OR public.has_role(auth.uid(), 'senior_apostle')
);

CREATE TRIGGER update_asset_documents_updated_at
BEFORE UPDATE ON public.asset_documents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();