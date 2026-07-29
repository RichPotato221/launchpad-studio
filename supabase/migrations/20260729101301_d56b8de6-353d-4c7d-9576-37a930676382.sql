ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS doc_number text,
  ADD COLUMN IF NOT EXISTS version text NOT NULL DEFAULT '1.0',
  ADD COLUMN IF NOT EXISTS doc_category text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS effective_date date,
  ADD COLUMN IF NOT EXISTS review_date date;

CREATE UNIQUE INDEX IF NOT EXISTS documents_doc_number_version_idx
  ON public.documents (doc_number, version) WHERE doc_number IS NOT NULL;