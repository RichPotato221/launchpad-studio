
-- Helper: who counts as the pastoral team
CREATE OR REPLACE FUNCTION public.is_pastoral_team(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.gov_is_admin(_user_id)
     OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = _user_id
                 AND (ur.role IN ('associate_pastor','lead_pastor','senior_apostle')
                      OR ur.department_slug IN ('pastoral','pastoral-care','counselling','hospitality')))
     OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = _user_id AND p.approval_status = 'approved'
                 AND p.primary_department IN ('pastoral','pastoral-care','counselling'));
$$;

GRANT EXECUTE ON FUNCTION public.is_pastoral_team(uuid) TO authenticated;

-- 1. Pastoral care cases
CREATE TABLE public.pastoral_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number text,
  case_type text NOT NULL DEFAULT 'home_visit',
  subject_name text NOT NULL,
  member_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  contact text,
  location text,
  branch public.branch,
  department_slug text,
  summary text,
  care_plan text,
  priority text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'open',
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  opened_on date NOT NULL DEFAULT current_date,
  scheduled_for date,
  follow_up_date date,
  closed_at timestamptz,
  closed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  outcome text,
  referral_to text,
  confidential boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pastoral_cases TO authenticated;
GRANT ALL ON public.pastoral_cases TO service_role;
ALTER TABLE public.pastoral_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pastoral team reads cases" ON public.pastoral_cases FOR SELECT TO authenticated
  USING (public.is_pastoral_team(auth.uid()) OR assigned_to = auth.uid() OR created_by = auth.uid());
CREATE POLICY "Pastoral team writes cases" ON public.pastoral_cases FOR INSERT TO authenticated
  WITH CHECK (public.is_pastoral_team(auth.uid()));
CREATE POLICY "Pastoral team updates cases" ON public.pastoral_cases FOR UPDATE TO authenticated
  USING (public.is_pastoral_team(auth.uid()) OR assigned_to = auth.uid());
CREATE POLICY "Leadership deletes cases" ON public.pastoral_cases FOR DELETE TO authenticated
  USING (public.gov_is_admin(auth.uid()));
CREATE TRIGGER pastoral_cases_updated BEFORE UPDATE ON public.pastoral_cases
  FOR EACH ROW EXECUTE FUNCTION public.gov_set_updated_at();

-- 2. Confidential case notes
CREATE TABLE public.pastoral_case_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.pastoral_cases(id) ON DELETE CASCADE,
  note text NOT NULL,
  note_type text NOT NULL DEFAULT 'visit',
  visit_date date NOT NULL DEFAULT current_date,
  confidential boolean NOT NULL DEFAULT true,
  author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pastoral_case_notes TO authenticated;
GRANT ALL ON public.pastoral_case_notes TO service_role;
ALTER TABLE public.pastoral_case_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pastoral team reads notes" ON public.pastoral_case_notes FOR SELECT TO authenticated
  USING (public.is_pastoral_team(auth.uid()) OR author_id = auth.uid());
CREATE POLICY "Pastoral team adds notes" ON public.pastoral_case_notes FOR INSERT TO authenticated
  WITH CHECK (public.is_pastoral_team(auth.uid()) AND author_id = auth.uid());
CREATE POLICY "Authors update notes" ON public.pastoral_case_notes FOR UPDATE TO authenticated
  USING (author_id = auth.uid() OR public.gov_is_admin(auth.uid()));
CREATE POLICY "Leadership deletes notes" ON public.pastoral_case_notes FOR DELETE TO authenticated
  USING (public.gov_is_admin(auth.uid()));

-- 3. Prayer requests
CREATE TABLE public.prayer_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request text NOT NULL,
  requester_name text,
  requester_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  branch public.branch,
  department_slug text,
  urgency text NOT NULL DEFAULT 'normal',
  confidential boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'open',
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  answered_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prayer_requests TO authenticated;
GRANT ALL ON public.prayer_requests TO service_role;
ALTER TABLE public.prayer_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read prayer requests" ON public.prayer_requests FOR SELECT TO authenticated
  USING (public.is_pastoral_team(auth.uid()) OR requester_id = auth.uid()
         OR (confidential = false AND public.is_approved_member(auth.uid())));
CREATE POLICY "Members raise prayer requests" ON public.prayer_requests FOR INSERT TO authenticated
  WITH CHECK (public.is_approved_member(auth.uid()));
CREATE POLICY "Pastoral team updates prayer requests" ON public.prayer_requests FOR UPDATE TO authenticated
  USING (public.is_pastoral_team(auth.uid()) OR requester_id = auth.uid());
CREATE POLICY "Leadership deletes prayer requests" ON public.prayer_requests FOR DELETE TO authenticated
  USING (public.gov_is_admin(auth.uid()));
CREATE TRIGGER prayer_requests_updated BEFORE UPDATE ON public.prayer_requests
  FOR EACH ROW EXECUTE FUNCTION public.gov_set_updated_at();

-- 4. Leadership profiles
CREATE TABLE public.leader_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  department_slug text,
  branch public.branch,
  leadership_role text,
  spiritual_gifts text,
  calling_assessment text,
  training_history text,
  mentor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  mentorship_plan text,
  leadership_journey text,
  courses_completed integer NOT NULL DEFAULT 0,
  certificates integer NOT NULL DEFAULT 0,
  readiness_score integer NOT NULL DEFAULT 0,
  promotion_readiness text NOT NULL DEFAULT 'developing',
  succession_status text NOT NULL DEFAULT 'not_ready',
  competency_notes text,
  burnout_risk text NOT NULL DEFAULT 'low',
  last_coached_on date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leader_profiles TO authenticated;
GRANT ALL ON public.leader_profiles TO service_role;
ALTER TABLE public.leader_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read leader profiles" ON public.leader_profiles FOR SELECT TO authenticated
  USING (public.is_pastoral_team(auth.uid()) OR user_id = auth.uid() OR mentor_id = auth.uid());
CREATE POLICY "Pastoral team writes leader profiles" ON public.leader_profiles FOR INSERT TO authenticated
  WITH CHECK (public.is_pastoral_team(auth.uid()));
CREATE POLICY "Pastoral team updates leader profiles" ON public.leader_profiles FOR UPDATE TO authenticated
  USING (public.is_pastoral_team(auth.uid()) OR mentor_id = auth.uid());
CREATE POLICY "Leadership deletes leader profiles" ON public.leader_profiles FOR DELETE TO authenticated
  USING (public.gov_is_admin(auth.uid()));
CREATE TRIGGER leader_profiles_updated BEFORE UPDATE ON public.leader_profiles
  FOR EACH ROW EXECUTE FUNCTION public.gov_set_updated_at();

-- 5. Coaching sessions
CREATE TABLE public.coaching_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  leader_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  coach_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  session_type text NOT NULL DEFAULT 'monthly_coaching',
  session_date date NOT NULL DEFAULT current_date,
  department_slug text,
  branch public.branch,
  topics text,
  notes text,
  action_plan text,
  growth_plan text,
  rating integer,
  follow_up_date date,
  status text NOT NULL DEFAULT 'scheduled',
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coaching_sessions TO authenticated;
GRANT ALL ON public.coaching_sessions TO service_role;
ALTER TABLE public.coaching_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read coaching sessions" ON public.coaching_sessions FOR SELECT TO authenticated
  USING (public.is_pastoral_team(auth.uid()) OR leader_id = auth.uid() OR coach_id = auth.uid());
CREATE POLICY "Pastoral team writes coaching" ON public.coaching_sessions FOR INSERT TO authenticated
  WITH CHECK (public.is_pastoral_team(auth.uid()));
CREATE POLICY "Coach updates coaching" ON public.coaching_sessions FOR UPDATE TO authenticated
  USING (public.is_pastoral_team(auth.uid()) OR coach_id = auth.uid());
CREATE POLICY "Leadership deletes coaching" ON public.coaching_sessions FOR DELETE TO authenticated
  USING (public.gov_is_admin(auth.uid()));
CREATE TRIGGER coaching_sessions_updated BEFORE UPDATE ON public.coaching_sessions
  FOR EACH ROW EXECUTE FUNCTION public.gov_set_updated_at();

-- 6. Ministry plans
CREATE TABLE public.ministry_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  department_slug text,
  branch public.branch,
  horizon text NOT NULL DEFAULT 'quarterly',
  period_label text,
  start_date date,
  end_date date,
  objectives text,
  milestones text,
  dependencies text,
  budget_amount numeric(14,2) NOT NULL DEFAULT 0,
  expected_outcomes text,
  risk_assessment text,
  progress_pct integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  owner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ministry_plans TO authenticated;
GRANT ALL ON public.ministry_plans TO service_role;
ALTER TABLE public.ministry_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read ministry plans" ON public.ministry_plans FOR SELECT TO authenticated
  USING (public.is_pastoral_team(auth.uid()) OR department_slug IS NULL
         OR public.is_dept_member_or_admin(department_slug));
CREATE POLICY "Members write ministry plans" ON public.ministry_plans FOR INSERT TO authenticated
  WITH CHECK (public.is_pastoral_team(auth.uid())
              OR (department_slug IS NOT NULL AND public.is_dept_member_or_admin(department_slug)));
CREATE POLICY "Owners update ministry plans" ON public.ministry_plans FOR UPDATE TO authenticated
  USING (public.is_pastoral_team(auth.uid()) OR owner_id = auth.uid()
         OR (department_slug IS NOT NULL AND public.is_dept_member_or_admin(department_slug)));
CREATE POLICY "Leadership deletes ministry plans" ON public.ministry_plans FOR DELETE TO authenticated
  USING (public.gov_is_admin(auth.uid()));
CREATE TRIGGER ministry_plans_updated BEFORE UPDATE ON public.ministry_plans
  FOR EACH ROW EXECUTE FUNCTION public.gov_set_updated_at();

-- 7. Volunteer profiles
CREATE TABLE public.volunteer_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  department_slug text,
  branch public.branch,
  role_title text,
  availability text,
  skills text,
  training_status text NOT NULL DEFAULT 'not_started',
  serving_since date,
  services_attended integer NOT NULL DEFAULT 0,
  services_missed integer NOT NULL DEFAULT 0,
  total_hours numeric(10,2) NOT NULL DEFAULT 0,
  performance_rating integer,
  recognition text,
  badges text,
  burnout_risk text NOT NULL DEFAULT 'low',
  on_leave boolean NOT NULL DEFAULT false,
  leave_reason text,
  leave_until date,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.volunteer_profiles TO authenticated;
GRANT ALL ON public.volunteer_profiles TO service_role;
ALTER TABLE public.volunteer_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read volunteer profiles" ON public.volunteer_profiles FOR SELECT TO authenticated
  USING (public.is_pastoral_team(auth.uid()) OR user_id = auth.uid()
         OR (department_slug IS NOT NULL AND public.is_dept_member_or_admin(department_slug)));
CREATE POLICY "Leaders write volunteer profiles" ON public.volunteer_profiles FOR INSERT TO authenticated
  WITH CHECK (public.is_pastoral_team(auth.uid())
              OR (department_slug IS NOT NULL AND public.is_dept_member_or_admin(department_slug)));
CREATE POLICY "Leaders update volunteer profiles" ON public.volunteer_profiles FOR UPDATE TO authenticated
  USING (public.is_pastoral_team(auth.uid()) OR user_id = auth.uid()
         OR (department_slug IS NOT NULL AND public.is_dept_member_or_admin(department_slug)));
CREATE POLICY "Leadership deletes volunteer profiles" ON public.volunteer_profiles FOR DELETE TO authenticated
  USING (public.gov_is_admin(auth.uid()));
CREATE TRIGGER volunteer_profiles_updated BEFORE UPDATE ON public.volunteer_profiles
  FOR EACH ROW EXECUTE FUNCTION public.gov_set_updated_at();

-- 8. Volunteer service logs
CREATE TABLE public.volunteer_service_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  volunteer_id uuid NOT NULL REFERENCES public.volunteer_profiles(id) ON DELETE CASCADE,
  service_date date NOT NULL DEFAULT current_date,
  department_slug text,
  hours numeric(6,2) NOT NULL DEFAULT 0,
  attended boolean NOT NULL DEFAULT true,
  notes text,
  logged_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.volunteer_service_logs TO authenticated;
GRANT ALL ON public.volunteer_service_logs TO service_role;
ALTER TABLE public.volunteer_service_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read volunteer logs" ON public.volunteer_service_logs FOR SELECT TO authenticated
  USING (public.is_pastoral_team(auth.uid())
         OR (department_slug IS NOT NULL AND public.is_dept_member_or_admin(department_slug)));
CREATE POLICY "Leaders log volunteer service" ON public.volunteer_service_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_pastoral_team(auth.uid())
              OR (department_slug IS NOT NULL AND public.is_dept_member_or_admin(department_slug)));
CREATE POLICY "Leaders update volunteer logs" ON public.volunteer_service_logs FOR UPDATE TO authenticated
  USING (public.is_pastoral_team(auth.uid()));
CREATE POLICY "Leadership deletes volunteer logs" ON public.volunteer_service_logs FOR DELETE TO authenticated
  USING (public.gov_is_admin(auth.uid()));

-- 9. Succession candidates
CREATE TABLE public.succession_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  position_title text NOT NULL,
  department_slug text,
  branch public.branch,
  incumbent_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  candidate_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  candidate_name text,
  readiness_score integer NOT NULL DEFAULT 0,
  readiness_band text NOT NULL DEFAULT 'long_term',
  mentorship_progress integer NOT NULL DEFAULT 0,
  training_status text NOT NULL DEFAULT 'not_started',
  competency_assessment text,
  delegated_responsibilities text,
  recommendation text,
  target_date date,
  status text NOT NULL DEFAULT 'active',
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.succession_candidates TO authenticated;
GRANT ALL ON public.succession_candidates TO service_role;
ALTER TABLE public.succession_candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pastoral team reads succession" ON public.succession_candidates FOR SELECT TO authenticated
  USING (public.is_pastoral_team(auth.uid()) OR candidate_id = auth.uid() OR incumbent_id = auth.uid());
CREATE POLICY "Pastoral team writes succession" ON public.succession_candidates FOR INSERT TO authenticated
  WITH CHECK (public.is_pastoral_team(auth.uid()));
CREATE POLICY "Pastoral team updates succession" ON public.succession_candidates FOR UPDATE TO authenticated
  USING (public.is_pastoral_team(auth.uid()));
CREATE POLICY "Leadership deletes succession" ON public.succession_candidates FOR DELETE TO authenticated
  USING (public.gov_is_admin(auth.uid()));
CREATE TRIGGER succession_candidates_updated BEFORE UPDATE ON public.succession_candidates
  FOR EACH ROW EXECUTE FUNCTION public.gov_set_updated_at();
