
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;

UPDATE public.departments SET archived = true
  WHERE slug IN ('protocol','admin','senior-pastor');

UPDATE public.departments SET name = 'Worship / Music Team' WHERE slug = 'worship';
UPDATE public.departments SET name = 'Media Team' WHERE slug = 'media';
UPDATE public.departments SET name = 'Church Secretary' WHERE slug = 'secretary';
UPDATE public.departments SET name = 'Strategic Advisor & Planner' WHERE slug = 'strategic-adviser';

UPDATE public.departments SET kind = 'governmental'::public.dept_kind
  WHERE slug IN ('chairperson','secretary','lead-pastor','associate-pastor','strategic-adviser');

UPDATE public.departments
  SET kind = 'governmental'::public.dept_kind, name = 'Financial Administrator', sort_order = 20
  WHERE slug = 'finance';

INSERT INTO public.departments (slug, name, kind, scripture, sort_order)
VALUES
  ('resource-administrator','Resource Administrator','governmental','1 Corinthians 4:2',40),
  ('elders','Elders','governmental','1 Timothy 5:17',80)
ON CONFLICT (slug) DO NOTHING;

UPDATE public.departments SET sort_order = 10 WHERE slug='chairperson';
UPDATE public.departments SET sort_order = 20 WHERE slug='finance';
UPDATE public.departments SET sort_order = 30 WHERE slug='strategic-adviser';
UPDATE public.departments SET sort_order = 40 WHERE slug='resource-administrator';
UPDATE public.departments SET sort_order = 50 WHERE slug='secretary';
UPDATE public.departments SET sort_order = 60 WHERE slug='lead-pastor';
UPDATE public.departments SET sort_order = 70 WHERE slug='associate-pastor';
UPDATE public.departments SET sort_order = 80 WHERE slug='elders';

INSERT INTO public.departments (slug, name, kind, scripture, sort_order)
VALUES ('sound-technical','Sound & Technical Team','functional','1 Chronicles 15:22',35)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.departments (slug, name, kind, scripture, sort_order)
VALUES
  ('life-groups','Life Groups','support_services','Acts 2:46-47',410),
  ('hand-of-christ','Hand of Christ (Social & Relationships)','support_services','Matthew 25:35-40',420)
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.announcement_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  view_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Africa/Johannesburg')::date,
  first_viewed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (announcement_id, user_id, view_date)
);
GRANT SELECT, INSERT ON public.announcement_views TO authenticated;
GRANT ALL ON public.announcement_views TO service_role;
ALTER TABLE public.announcement_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can log own view" ON public.announcement_views
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "author or admin can read viewers" ON public.announcement_views
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.announcements a
      WHERE a.id = announcement_id AND a.author_id = auth.uid()
    )
  );

CREATE TABLE IF NOT EXISTS public.announcement_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.announcement_shares TO authenticated;
GRANT ALL ON public.announcement_shares TO service_role;
ALTER TABLE public.announcement_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can log own share" ON public.announcement_shares
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "all authenticated can read share counts" ON public.announcement_shares
  FOR SELECT TO authenticated
  USING (true);
