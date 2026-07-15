
-- Helper: is current user an approved member of this department (by slug) or an admin?
CREATE OR REPLACE FUNCTION public.is_dept_member_or_admin(_slug text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.approval_status = 'approved'
        AND p.primary_department = _slug
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.department_slug = _slug
    );
$$;

-- ============ WORSHIP ============
CREATE TABLE IF NOT EXISTS public.songs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_slug text NOT NULL,
  title text NOT NULL,
  song_key text,
  tempo int,
  ccli_number text,
  chord_chart_url text,
  youtube_url text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.songs TO authenticated;
GRANT ALL ON public.songs TO service_role;
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "songs dept access" ON public.songs FOR ALL TO authenticated
  USING (public.is_dept_member_or_admin(department_slug))
  WITH CHECK (public.is_dept_member_or_admin(department_slug));
CREATE TRIGGER trg_songs_updated_at BEFORE UPDATE ON public.songs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.setlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_slug text NOT NULL,
  service_date date NOT NULL,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.setlists TO authenticated;
GRANT ALL ON public.setlists TO service_role;
ALTER TABLE public.setlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "setlists dept access" ON public.setlists FOR ALL TO authenticated
  USING (public.is_dept_member_or_admin(department_slug))
  WITH CHECK (public.is_dept_member_or_admin(department_slug));
CREATE TRIGGER trg_setlists_updated_at BEFORE UPDATE ON public.setlists
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.setlist_songs (
  setlist_id uuid REFERENCES public.setlists(id) ON DELETE CASCADE,
  song_id uuid REFERENCES public.songs(id) ON DELETE CASCADE,
  order_index int NOT NULL,
  PRIMARY KEY (setlist_id, song_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.setlist_songs TO authenticated;
GRANT ALL ON public.setlist_songs TO service_role;
ALTER TABLE public.setlist_songs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "setlist_songs dept access" ON public.setlist_songs FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.setlists s WHERE s.id = setlist_id AND public.is_dept_member_or_admin(s.department_slug)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.setlists s WHERE s.id = setlist_id AND public.is_dept_member_or_admin(s.department_slug)));

-- ============ SCHOOL OF MINISTRY / DISCIPLESHIP ============
CREATE TABLE IF NOT EXISTS public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_slug text NOT NULL,
  title text NOT NULL,
  description text,
  total_lessons int NOT NULL DEFAULT 1,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT ALL ON public.courses TO service_role;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "courses dept access" ON public.courses FOR ALL TO authenticated
  USING (public.is_dept_member_or_admin(department_slug))
  WITH CHECK (public.is_dept_member_or_admin(department_slug));
CREATE TRIGGER trg_courses_updated_at BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id),
  lessons_completed int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed','withdrawn')),
  certificate_url text,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enrollments TO authenticated;
GRANT ALL ON public.enrollments TO service_role;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "enrollments student or dept" ON public.enrollments FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND public.is_dept_member_or_admin(c.department_slug)));
CREATE POLICY "enrollments insert self or dept" ON public.enrollments FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid() OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND public.is_dept_member_or_admin(c.department_slug)));
CREATE POLICY "enrollments update dept or self" ON public.enrollments FOR UPDATE TO authenticated
  USING (student_id = auth.uid() OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND public.is_dept_member_or_admin(c.department_slug)));
CREATE POLICY "enrollments delete dept" ON public.enrollments FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND public.is_dept_member_or_admin(c.department_slug)));
CREATE TRIGGER trg_enrollments_updated_at BEFORE UPDATE ON public.enrollments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ OUTREACH — SOULS WON ============
CREATE TABLE IF NOT EXISTS public.souls_won (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_slug text NOT NULL,
  name text NOT NULL,
  contact text,
  date_won date NOT NULL DEFAULT current_date,
  won_by uuid REFERENCES auth.users(id),
  assigned_to uuid REFERENCES auth.users(id),
  follow_up_status text NOT NULL DEFAULT 'new'
    CHECK (follow_up_status IN ('new','contacted','baptized','discipled','joined_church','lost_contact')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.souls_won TO authenticated;
GRANT ALL ON public.souls_won TO service_role;
ALTER TABLE public.souls_won ENABLE ROW LEVEL SECURITY;
CREATE POLICY "souls_won dept or assignee" ON public.souls_won FOR SELECT TO authenticated
  USING (public.is_dept_member_or_admin(department_slug) OR assigned_to = auth.uid());
CREATE POLICY "souls_won manage dept" ON public.souls_won FOR ALL TO authenticated
  USING (public.is_dept_member_or_admin(department_slug))
  WITH CHECK (public.is_dept_member_or_admin(department_slug));
CREATE TRIGGER trg_souls_won_updated_at BEFORE UPDATE ON public.souls_won
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ MEDIA — EDITORIAL CALENDAR ============
CREATE TABLE IF NOT EXISTS public.editorial_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_slug text NOT NULL,
  title text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('instagram','facebook','youtube','website','other')),
  scheduled_date date,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','pending_approval','approved','published','rejected')),
  asset_url text,
  created_by uuid REFERENCES auth.users(id),
  approved_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.editorial_posts TO authenticated;
GRANT ALL ON public.editorial_posts TO service_role;
ALTER TABLE public.editorial_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "editorial dept access" ON public.editorial_posts FOR ALL TO authenticated
  USING (public.is_dept_member_or_admin(department_slug))
  WITH CHECK (public.is_dept_member_or_admin(department_slug));
CREATE TRIGGER trg_editorial_updated_at BEFORE UPDATE ON public.editorial_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ CHILDREN'S / YOUTH — CHECK-IN ============
CREATE TABLE IF NOT EXISTS public.child_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_slug text NOT NULL,
  child_name text NOT NULL,
  guardian_name text NOT NULL,
  guardian_contact text NOT NULL,
  allergies text,
  classroom text,
  checked_in_at timestamptz NOT NULL DEFAULT now(),
  checked_in_by uuid REFERENCES auth.users(id),
  checked_out_at timestamptz,
  checked_out_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.child_checkins TO authenticated;
GRANT ALL ON public.child_checkins TO service_role;
ALTER TABLE public.child_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "checkins dept access" ON public.child_checkins FOR ALL TO authenticated
  USING (public.is_dept_member_or_admin(department_slug))
  WITH CHECK (public.is_dept_member_or_admin(department_slug));
CREATE TRIGGER trg_checkins_updated_at BEFORE UPDATE ON public.child_checkins
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ FINANCE — EXPENSE CLAIMS ============
CREATE TABLE IF NOT EXISTS public.expense_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_slug text NOT NULL,
  claimant_id uuid NOT NULL REFERENCES auth.users(id),
  amount numeric NOT NULL,
  description text NOT NULL,
  receipt_url text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','chair_approved','senior_pastor_approved','rejected','paid')),
  approved_by_chair uuid REFERENCES auth.users(id),
  approved_by_senior uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_claims TO authenticated;
GRANT ALL ON public.expense_claims TO service_role;
ALTER TABLE public.expense_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expense claimant reads own" ON public.expense_claims FOR SELECT TO authenticated
  USING (claimant_id = auth.uid() OR public.is_dept_member_or_admin(department_slug));
CREATE POLICY "expense claimant inserts own" ON public.expense_claims FOR INSERT TO authenticated
  WITH CHECK (claimant_id = auth.uid());
CREATE POLICY "expense dept/admin update" ON public.expense_claims FOR UPDATE TO authenticated
  USING (public.is_dept_member_or_admin(department_slug)
         OR public.has_role(auth.uid(), 'chairperson')
         OR public.has_role(auth.uid(), 'lead_pastor'));
CREATE POLICY "expense dept delete" ON public.expense_claims FOR DELETE TO authenticated
  USING (public.is_dept_member_or_admin(department_slug));
CREATE TRIGGER trg_expense_updated_at BEFORE UPDATE ON public.expense_claims
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ SEVEN MOUNTAINS — KINGDOM PROJECTS ============
CREATE TABLE IF NOT EXISTS public.kingdom_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_slug text NOT NULL,
  title text NOT NULL,
  description text,
  stage text NOT NULL DEFAULT 'idea'
    CHECK (stage IN ('idea','planning','active','paused','completed','archived')),
  owner_id uuid REFERENCES auth.users(id),
  target_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kingdom_projects TO authenticated;
GRANT ALL ON public.kingdom_projects TO service_role;
ALTER TABLE public.kingdom_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kingdom_projects dept access" ON public.kingdom_projects FOR ALL TO authenticated
  USING (public.is_dept_member_or_admin(department_slug))
  WITH CHECK (public.is_dept_member_or_admin(department_slug));
CREATE TRIGGER trg_kingdom_projects_updated_at BEFORE UPDATE ON public.kingdom_projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ GOVERNANCE — MEMBERSHIP LIFECYCLE ============
CREATE TABLE IF NOT EXISTS public.membership_lifecycle (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stage text NOT NULL CHECK (stage IN ('visitor','new_convert','member','serving','leader')),
  notes text,
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.membership_lifecycle TO authenticated;
GRANT ALL ON public.membership_lifecycle TO service_role;
ALTER TABLE public.membership_lifecycle ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lifecycle admin read" ON public.membership_lifecycle FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()) OR profile_id = auth.uid());
CREATE POLICY "lifecycle admin write" ON public.membership_lifecycle FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
