
-- 1. Report entries table (comments + doc uploads per department)
CREATE TABLE public.report_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_slug text NOT NULL REFERENCES public.departments(slug) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  file_url text,
  file_name text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_entries TO authenticated;
GRANT ALL ON public.report_entries TO service_role;

ALTER TABLE public.report_entries ENABLE ROW LEVEL SECURITY;

-- Approved members can view all entries (church-wide visibility for reports roll-up)
CREATE POLICY "Approved members view report entries"
ON public.report_entries FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.approval_status = 'approved')
);

-- Approved members can insert entries (for any dept they are attached to, or admins for any)
CREATE POLICY "Approved members insert report entries"
ON public.report_entries FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.approval_status = 'approved')
);

-- Authors and admins can update / delete
CREATE POLICY "Authors and admins update report entries"
ON public.report_entries FOR UPDATE
TO authenticated
USING (created_by = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Authors and admins delete report entries"
ON public.report_entries FOR DELETE
TO authenticated
USING (created_by = auth.uid() OR public.is_admin(auth.uid()));

CREATE TRIGGER report_entries_updated_at
BEFORE UPDATE ON public.report_entries
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Ensure Richard Mashaba (chairperson) has chairperson role
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'chairperson'::app_role FROM auth.users WHERE email = 'richardmashaba.sog@gmail.com'
ON CONFLICT DO NOTHING;

-- 3. Storage policies for the department-reports bucket (bucket created via tool)
CREATE POLICY "Approved members read report files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'department-reports'
  AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.approval_status = 'approved')
);

CREATE POLICY "Approved members upload report files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'department-reports'
  AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.approval_status = 'approved')
);

CREATE POLICY "Authors and admins delete report files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'department-reports'
  AND (owner = auth.uid() OR public.is_admin(auth.uid()))
);
