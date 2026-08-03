CREATE TABLE public.department_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_slug text NOT NULL,
  title text NOT NULL,
  description text,
  file_url text NOT NULL,
  storage_path text,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.department_resources TO authenticated;
GRANT ALL ON public.department_resources TO service_role;

ALTER TABLE public.department_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view department resources"
  ON public.department_resources FOR SELECT TO authenticated USING (true);

CREATE POLICY "Chairpersons manage department resources"
  ON public.department_resources FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'chairperson'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'chairperson'::app_role));

CREATE OR REPLACE FUNCTION public.dept_resources_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER update_department_resources_updated_at
  BEFORE UPDATE ON public.department_resources
  FOR EACH ROW EXECUTE FUNCTION public.dept_resources_touch_updated_at();

CREATE POLICY "Members read department resource files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'department-resources');

CREATE POLICY "Chairpersons upload department resource files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'department-resources' AND public.has_role(auth.uid(), 'chairperson'::app_role));

CREATE POLICY "Chairpersons delete department resource files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'department-resources' AND public.has_role(auth.uid(), 'chairperson'::app_role));