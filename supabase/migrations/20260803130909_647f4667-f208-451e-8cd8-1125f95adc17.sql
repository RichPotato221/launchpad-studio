
CREATE OR REPLACE FUNCTION public.is_kids_team(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.gov_is_admin(_user_id)
     OR public.is_pastoral_team(_user_id)
     OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = _user_id
                  AND ur.department_slug IN ('childrens-ministry','children','youth-ministry'))
     OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = _user_id AND p.approval_status = 'approved'
                  AND p.primary_department IN ('childrens-ministry','children','youth-ministry'));
$$;
REVOKE EXECUTE ON FUNCTION public.is_kids_team(uuid) FROM anon;

CREATE TABLE public.children (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_code text UNIQUE NOT NULL DEFAULT ('TRK-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,6))),
  full_name text NOT NULL,
  nickname text,
  date_of_birth date,
  gender text,
  age_group text,
  branch public.branch,
  photo_url text,
  address text,
  medical_conditions text,
  allergies text,
  medication text,
  special_needs text,
  notes text,
  classroom_id uuid,
  status text NOT NULL DEFAULT 'active',
  pin text,
  consent_media boolean NOT NULL DEFAULT false,
  consent_medical boolean NOT NULL DEFAULT false,
  consent_signed_by text,
  consent_signed_at timestamptz,
  created_by uuid REFERENCES auth.users ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.child_guardians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES public.children ON DELETE CASCADE,
  profile_id uuid REFERENCES auth.users ON DELETE SET NULL,
  full_name text NOT NULL,
  relationship text,
  phone text,
  email text,
  is_primary boolean NOT NULL DEFAULT false,
  can_pickup boolean NOT NULL DEFAULT true,
  is_emergency boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.kids_classrooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  age_min integer,
  age_max integer,
  capacity integer NOT NULL DEFAULT 20,
  teacher_id uuid REFERENCES auth.users ON DELETE SET NULL,
  assistant_id uuid REFERENCES auth.users ON DELETE SET NULL,
  branch public.branch,
  room text,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.children
  ADD CONSTRAINT children_classroom_fk FOREIGN KEY (classroom_id) REFERENCES public.kids_classrooms ON DELETE SET NULL;

CREATE TABLE public.kids_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES public.children ON DELETE CASCADE,
  classroom_id uuid REFERENCES public.kids_classrooms ON DELETE SET NULL,
  service_date date NOT NULL DEFAULT current_date,
  checked_in_at timestamptz NOT NULL DEFAULT now(),
  checked_in_by uuid REFERENCES auth.users ON DELETE SET NULL,
  method text NOT NULL DEFAULT 'manual',
  checked_out_at timestamptz,
  checked_out_by uuid REFERENCES auth.users ON DELETE SET NULL,
  released_to text,
  is_first_time boolean NOT NULL DEFAULT false,
  late_arrival boolean NOT NULL DEFAULT false,
  notes text,
  branch public.branch,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.kids_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  scripture text,
  theme text,
  age_group text,
  objectives text,
  memory_verse text,
  teaching_notes text,
  activities text,
  games text,
  crafts text,
  video_url text,
  songs text,
  discussion_questions text,
  homework text,
  assessment text,
  resources_url text,
  scheduled_date date,
  status text NOT NULL DEFAULT 'draft',
  created_by uuid REFERENCES auth.users ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.kids_lesson_delivery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.kids_lessons ON DELETE CASCADE,
  classroom_id uuid REFERENCES public.kids_classrooms ON DELETE SET NULL,
  delivered_on date NOT NULL DEFAULT current_date,
  taught_by uuid REFERENCES auth.users ON DELETE SET NULL,
  attendance_count integer NOT NULL DEFAULT 0,
  memory_verses_completed integer NOT NULL DEFAULT 0,
  parent_summary_sent boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.kids_volunteers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE SET NULL,
  full_name text NOT NULL,
  role_title text,
  classroom_id uuid REFERENCES public.kids_classrooms ON DELETE SET NULL,
  branch public.branch,
  phone text,
  emergency_contact text,
  skills text,
  availability text,
  status text NOT NULL DEFAULT 'active',
  background_check_status text NOT NULL DEFAULT 'not_started',
  background_check_expiry date,
  safeguarding_expiry date,
  services_attended integer NOT NULL DEFAULT 0,
  services_missed integer NOT NULL DEFAULT 0,
  total_hours numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.kids_certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  volunteer_id uuid NOT NULL REFERENCES public.kids_volunteers ON DELETE CASCADE,
  cert_type text NOT NULL,
  status text NOT NULL DEFAULT 'not_started',
  issued_on date,
  expires_on date,
  hours numeric NOT NULL DEFAULT 0,
  certificate_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.kids_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid REFERENCES public.children ON DELETE SET NULL,
  classroom_id uuid REFERENCES public.kids_classrooms ON DELETE SET NULL,
  incident_type text NOT NULL DEFAULT 'safeguarding',
  severity text NOT NULL DEFAULT 'low',
  occurred_at timestamptz NOT NULL DEFAULT now(),
  description text NOT NULL,
  action_taken text,
  reported_by uuid REFERENCES auth.users ON DELETE SET NULL,
  assigned_to uuid REFERENCES auth.users ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'open',
  resolution text,
  resolved_at timestamptz,
  branch public.branch,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.kids_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES public.children ON DELETE CASCADE,
  milestone_type text NOT NULL,
  detail text,
  achieved_on date NOT NULL DEFAULT current_date,
  recorded_by uuid REFERENCES auth.users ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.kids_family_engagement (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid REFERENCES public.children ON DELETE SET NULL,
  family_name text,
  engagement_type text NOT NULL DEFAULT 'parent_meeting',
  engaged_on date NOT NULL DEFAULT current_date,
  summary text,
  feedback text,
  participation_score integer,
  branch public.branch,
  recorded_by uuid REFERENCES auth.users ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.children, public.child_guardians, public.kids_classrooms,
  public.kids_checkins, public.kids_lessons, public.kids_lesson_delivery, public.kids_volunteers,
  public.kids_certifications, public.kids_incidents, public.kids_milestones, public.kids_family_engagement
  TO authenticated;
GRANT ALL ON public.children, public.child_guardians, public.kids_classrooms,
  public.kids_checkins, public.kids_lessons, public.kids_lesson_delivery, public.kids_volunteers,
  public.kids_certifications, public.kids_incidents, public.kids_milestones, public.kids_family_engagement
  TO service_role;

ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.child_guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kids_classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kids_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kids_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kids_lesson_delivery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kids_volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kids_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kids_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kids_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kids_family_engagement ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_child_guardian(_child_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.child_guardians g WHERE g.child_id = _child_id AND g.profile_id = _user_id);
$$;
REVOKE EXECUTE ON FUNCTION public.is_child_guardian(uuid, uuid) FROM anon;

CREATE POLICY "kids team manage children" ON public.children FOR ALL TO authenticated
  USING (public.is_kids_team(auth.uid())) WITH CHECK (public.is_kids_team(auth.uid()));
CREATE POLICY "guardians view their child" ON public.children FOR SELECT TO authenticated
  USING (public.is_child_guardian(id, auth.uid()));

CREATE POLICY "kids team manage guardians" ON public.child_guardians FOR ALL TO authenticated
  USING (public.is_kids_team(auth.uid())) WITH CHECK (public.is_kids_team(auth.uid()));
CREATE POLICY "guardians view own link" ON public.child_guardians FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "kids team manage classrooms" ON public.kids_classrooms FOR ALL TO authenticated
  USING (public.is_kids_team(auth.uid())) WITH CHECK (public.is_kids_team(auth.uid()));
CREATE POLICY "approved members read classrooms" ON public.kids_classrooms FOR SELECT TO authenticated
  USING (public.is_approved_member(auth.uid()));

CREATE POLICY "kids team manage checkins" ON public.kids_checkins FOR ALL TO authenticated
  USING (public.is_kids_team(auth.uid())) WITH CHECK (public.is_kids_team(auth.uid()));
CREATE POLICY "guardians view child checkins" ON public.kids_checkins FOR SELECT TO authenticated
  USING (public.is_child_guardian(child_id, auth.uid()));

CREATE POLICY "kids team manage lessons" ON public.kids_lessons FOR ALL TO authenticated
  USING (public.is_kids_team(auth.uid())) WITH CHECK (public.is_kids_team(auth.uid()));
CREATE POLICY "approved members read lessons" ON public.kids_lessons FOR SELECT TO authenticated
  USING (public.is_approved_member(auth.uid()));

CREATE POLICY "kids team manage delivery" ON public.kids_lesson_delivery FOR ALL TO authenticated
  USING (public.is_kids_team(auth.uid())) WITH CHECK (public.is_kids_team(auth.uid()));
CREATE POLICY "approved members read delivery" ON public.kids_lesson_delivery FOR SELECT TO authenticated
  USING (public.is_approved_member(auth.uid()));

CREATE POLICY "kids team manage volunteers" ON public.kids_volunteers FOR ALL TO authenticated
  USING (public.is_kids_team(auth.uid())) WITH CHECK (public.is_kids_team(auth.uid()));
CREATE POLICY "volunteers view own record" ON public.kids_volunteers FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "kids team manage certifications" ON public.kids_certifications FOR ALL TO authenticated
  USING (public.is_kids_team(auth.uid())) WITH CHECK (public.is_kids_team(auth.uid()));

CREATE POLICY "kids team manage incidents" ON public.kids_incidents FOR ALL TO authenticated
  USING (public.is_kids_team(auth.uid())) WITH CHECK (public.is_kids_team(auth.uid()));

CREATE POLICY "kids team manage milestones" ON public.kids_milestones FOR ALL TO authenticated
  USING (public.is_kids_team(auth.uid())) WITH CHECK (public.is_kids_team(auth.uid()));
CREATE POLICY "guardians view child milestones" ON public.kids_milestones FOR SELECT TO authenticated
  USING (public.is_child_guardian(child_id, auth.uid()));

CREATE POLICY "kids team manage family engagement" ON public.kids_family_engagement FOR ALL TO authenticated
  USING (public.is_kids_team(auth.uid())) WITH CHECK (public.is_kids_team(auth.uid()));

CREATE TRIGGER children_updated BEFORE UPDATE ON public.children FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER kids_classrooms_updated BEFORE UPDATE ON public.kids_classrooms FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER kids_lessons_updated BEFORE UPDATE ON public.kids_lessons FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER kids_volunteers_updated BEFORE UPDATE ON public.kids_volunteers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER kids_incidents_updated BEFORE UPDATE ON public.kids_incidents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX kids_checkins_date_idx ON public.kids_checkins (service_date DESC);
CREATE INDEX kids_checkins_child_idx ON public.kids_checkins (child_id);
CREATE INDEX child_guardians_child_idx ON public.child_guardians (child_id);
CREATE INDEX kids_milestones_child_idx ON public.kids_milestones (child_id);
