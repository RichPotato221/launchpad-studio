
-- ============ role helpers ============
CREATE OR REPLACE FUNCTION public.is_tech_team(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_admin(_user_id)
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = _user_id
                 AND p.primary_department IN ('sound-technical','sound-and-technical','technical','media','media-communications','av','sound'))
$$;
REVOKE EXECUTE ON FUNCTION public.is_tech_team(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_tech_team(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_strategy_team(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_admin(_user_id)
      OR public.has_role(_user_id, 'strategic_adviser')
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = _user_id
                 AND p.primary_department IN ('strategic-adviser','strategic-adviser-planner','strategy','planning'))
$$;
REVOKE EXECUTE ON FUNCTION public.is_strategy_team(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_strategy_team(uuid) TO authenticated;

-- ============ TECHNICAL OPERATIONS CENTRE ============
CREATE TABLE public.tech_productions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  theme text,
  service_date date NOT NULL,
  start_time time,
  venue text,
  branch branch,
  service_type text NOT NULL DEFAULT 'sunday_service',
  preacher text,
  worship_leader text,
  service_flow jsonb NOT NULL DEFAULT '[]'::jsonb,
  audio_plan text,
  lighting_plan text,
  camera_plan text,
  livestream_plan text,
  presentation_plan text,
  technical_notes text,
  audio_ready boolean NOT NULL DEFAULT false,
  visual_ready boolean NOT NULL DEFAULT false,
  livestream_ready boolean NOT NULL DEFAULT false,
  cameras_ready boolean NOT NULL DEFAULT false,
  lighting_ready boolean NOT NULL DEFAULT false,
  presentation_ready boolean NOT NULL DEFAULT false,
  internet_ok boolean NOT NULL DEFAULT false,
  power_ok boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'planning',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.tech_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_number text,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'audio',
  subcategory text,
  make text,
  model text,
  serial_number text,
  barcode text,
  qr_payload text,
  purchase_date date,
  purchase_cost numeric(14,2),
  supplier text,
  warranty_expiry date,
  insurance_ref text,
  replacement_date date,
  condition text NOT NULL DEFAULT 'good',
  status text NOT NULL DEFAULT 'in_service',
  location text,
  branch branch,
  assigned_to text,
  battery_level integer,
  photo_url text,
  manual_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.tech_maintenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid REFERENCES public.tech_assets(id) ON DELETE CASCADE,
  task text NOT NULL,
  maintenance_type text NOT NULL DEFAULT 'cleaning',
  frequency text NOT NULL DEFAULT 'monthly',
  due_date date NOT NULL,
  completed_on date,
  completed_by uuid,
  cost numeric(14,2),
  status text NOT NULL DEFAULT 'scheduled',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.tech_faults (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid REFERENCES public.tech_assets(id) ON DELETE SET NULL,
  fault_type text NOT NULL DEFAULT 'equipment',
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  branch branch,
  reported_by uuid,
  assigned_to text,
  resolution text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.tech_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item text NOT NULL,
  category text NOT NULL DEFAULT 'cables',
  unit text DEFAULT 'each',
  quantity integer NOT NULL DEFAULT 0,
  reorder_level integer NOT NULL DEFAULT 0,
  missing_count integer NOT NULL DEFAULT 0,
  location text,
  branch branch,
  unit_cost numeric(14,2),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.tech_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  role_title text NOT NULL DEFAULT 'sound_engineer',
  skills text,
  certifications text,
  branch branch,
  availability text,
  email text,
  phone text,
  emergency_contact_name text,
  emergency_contact_phone text,
  status text NOT NULL DEFAULT 'active',
  attendance_pct integer,
  performance_score integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.tech_streams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_id uuid REFERENCES public.tech_productions(id) ON DELETE SET NULL,
  stream_date date NOT NULL,
  platform text NOT NULL DEFAULT 'youtube',
  status text NOT NULL DEFAULT 'scheduled',
  health text NOT NULL DEFAULT 'good',
  bitrate_kbps integer,
  resolution text,
  internet_mbps numeric(10,2),
  encoder text,
  camera_status text,
  audio_feed_ok boolean NOT NULL DEFAULT true,
  peak_viewers integer,
  total_views integer,
  uptime_pct integer,
  recording_url text,
  incident_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.tech_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL DEFAULT 'audio',
  description text,
  duration_hours numeric(6,2),
  certification boolean NOT NULL DEFAULT false,
  validity_months integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.tech_training_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES public.tech_team_members(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.tech_courses(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'enrolled',
  score integer,
  completed_on date,
  expires_on date,
  certificate_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.tech_risks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL DEFAULT 'equipment_failure',
  description text,
  likelihood integer NOT NULL DEFAULT 3,
  impact integer NOT NULL DEFAULT 3,
  mitigation text,
  owner text,
  review_date date,
  status text NOT NULL DEFAULT 'open',
  escalation_level text NOT NULL DEFAULT 'department',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ STRATEGY MANAGEMENT OFFICE ============
CREATE TABLE public.smo_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  plan_type text NOT NULL DEFAULT 'annual',
  vision_statement text,
  mission_statement text,
  themes jsonb NOT NULL DEFAULT '[]'::jsonb,
  horizon_start date,
  horizon_end date,
  status text NOT NULL DEFAULT 'draft',
  progress_pct integer NOT NULL DEFAULT 0,
  owner text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.smo_objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES public.smo_plans(id) ON DELETE CASCADE,
  title text NOT NULL,
  theme text,
  perspective text NOT NULL DEFAULT 'kingdom_impact',
  description text,
  key_results jsonb NOT NULL DEFAULT '[]'::jsonb,
  owner text,
  department_slug text,
  branch branch,
  period text NOT NULL DEFAULT 'annual',
  start_date date,
  due_date date,
  budget numeric(14,2),
  progress_pct integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'on_track',
  dependencies text,
  risks text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.smo_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id uuid REFERENCES public.smo_objectives(id) ON DELETE SET NULL,
  name text NOT NULL,
  project_type text NOT NULL DEFAULT 'kingdom_expansion',
  scope text,
  business_case text,
  objectives text,
  department_slug text,
  branch branch,
  sponsor text,
  manager text,
  stakeholders text,
  budget_requested numeric(14,2),
  budget_approved numeric(14,2),
  spent numeric(14,2) NOT NULL DEFAULT 0,
  funding_source text,
  start_date date,
  end_date date,
  progress_pct integer NOT NULL DEFAULT 0,
  stage text NOT NULL DEFAULT 'proposed',
  status text NOT NULL DEFAULT 'on_track',
  risks text,
  approval_status text NOT NULL DEFAULT 'pending',
  photo_url text,
  document_url text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.smo_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.smo_projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  due_date date,
  completed_on date,
  status text NOT NULL DEFAULT 'pending',
  deliverable text,
  owner text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.smo_kpis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id uuid REFERENCES public.smo_objectives(id) ON DELETE SET NULL,
  name text NOT NULL,
  kpi_group text NOT NULL DEFAULT 'vision',
  department_slug text,
  branch branch,
  period text NOT NULL DEFAULT 'quarterly',
  period_label text,
  target numeric(14,2) NOT NULL DEFAULT 0,
  actual numeric(14,2) NOT NULL DEFAULT 0,
  forecast numeric(14,2),
  unit text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.smo_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  decision_type text NOT NULL DEFAULT 'strategic',
  decision_date date NOT NULL DEFAULT CURRENT_DATE,
  owner text,
  impact text,
  affected_departments text,
  action_items text,
  deadline date,
  vote_outcome text,
  implementation_status text NOT NULL DEFAULT 'pending',
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.smo_risks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL DEFAULT 'vision',
  description text,
  likelihood integer NOT NULL DEFAULT 3,
  impact integer NOT NULL DEFAULT 3,
  mitigation text,
  owner text,
  review_date date,
  status text NOT NULL DEFAULT 'open',
  escalation_level text NOT NULL DEFAULT 'executive',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.smo_ideas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  idea_type text NOT NULL DEFAULT 'ministry',
  description text,
  submitted_by uuid,
  submitter_name text,
  department_slug text,
  branch branch,
  stage text NOT NULL DEFAULT 'submitted',
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.smo_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  request_type text NOT NULL DEFAULT 'strategic',
  description text,
  department_slug text,
  branch branch,
  amount numeric(14,2),
  requested_by uuid,
  requester_name text,
  route_to text NOT NULL DEFAULT 'chairperson',
  status text NOT NULL DEFAULT 'pending',
  decision_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.smo_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL DEFAULT 'strategic_planning',
  description text,
  duration_hours numeric(6,2),
  certification boolean NOT NULL DEFAULT false,
  validity_months integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.smo_training_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES public.smo_courses(id) ON DELETE CASCADE,
  learner_name text NOT NULL,
  department_slug text,
  status text NOT NULL DEFAULT 'enrolled',
  score integer,
  completed_on date,
  expires_on date,
  certificate_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ GRANTS ============
GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.tech_productions, public.tech_assets, public.tech_maintenance, public.tech_faults,
  public.tech_inventory, public.tech_team_members, public.tech_streams, public.tech_courses,
  public.tech_training_records, public.tech_risks,
  public.smo_plans, public.smo_objectives, public.smo_projects, public.smo_milestones,
  public.smo_kpis, public.smo_decisions, public.smo_risks, public.smo_ideas,
  public.smo_requests, public.smo_courses, public.smo_training_records
TO authenticated;

GRANT ALL ON
  public.tech_productions, public.tech_assets, public.tech_maintenance, public.tech_faults,
  public.tech_inventory, public.tech_team_members, public.tech_streams, public.tech_courses,
  public.tech_training_records, public.tech_risks,
  public.smo_plans, public.smo_objectives, public.smo_projects, public.smo_milestones,
  public.smo_kpis, public.smo_decisions, public.smo_risks, public.smo_ideas,
  public.smo_requests, public.smo_courses, public.smo_training_records
TO service_role;

-- ============ RLS ============
ALTER TABLE public.tech_productions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tech_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tech_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tech_faults ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tech_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tech_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tech_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tech_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tech_training_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tech_risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smo_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smo_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smo_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smo_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smo_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smo_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smo_risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smo_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smo_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smo_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smo_training_records ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['tech_productions','tech_assets','tech_maintenance','tech_faults','tech_inventory','tech_team_members','tech_streams','tech_courses','tech_training_records','tech_risks']
  LOOP
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.is_approved_member(auth.uid()))', t || ' read', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_tech_team(auth.uid())) WITH CHECK (public.is_tech_team(auth.uid()))', t || ' write', t);
  END LOOP;

  FOREACH t IN ARRAY ARRAY['smo_plans','smo_objectives','smo_projects','smo_milestones','smo_kpis','smo_decisions','smo_risks','smo_courses','smo_training_records']
  LOOP
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.is_approved_member(auth.uid()))', t || ' read', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_strategy_team(auth.uid())) WITH CHECK (public.is_strategy_team(auth.uid()))', t || ' write', t);
  END LOOP;
END $$;

-- members may log faults themselves
CREATE POLICY "tech faults report" ON public.tech_faults
  FOR INSERT TO authenticated
  WITH CHECK (public.is_approved_member(auth.uid()) AND reported_by = auth.uid());

-- innovation ideas / requests: any approved member may submit and see
CREATE POLICY "smo ideas read" ON public.smo_ideas FOR SELECT TO authenticated USING (public.is_approved_member(auth.uid()));
CREATE POLICY "smo ideas submit" ON public.smo_ideas FOR INSERT TO authenticated WITH CHECK (public.is_approved_member(auth.uid()) AND submitted_by = auth.uid());
CREATE POLICY "smo ideas manage" ON public.smo_ideas FOR ALL TO authenticated USING (public.is_strategy_team(auth.uid())) WITH CHECK (public.is_strategy_team(auth.uid()));

CREATE POLICY "smo requests read" ON public.smo_requests FOR SELECT TO authenticated USING (public.is_approved_member(auth.uid()));
CREATE POLICY "smo requests submit" ON public.smo_requests FOR INSERT TO authenticated WITH CHECK (public.is_approved_member(auth.uid()) AND requested_by = auth.uid());
CREATE POLICY "smo requests manage" ON public.smo_requests FOR ALL TO authenticated USING (public.is_strategy_team(auth.uid())) WITH CHECK (public.is_strategy_team(auth.uid()));

-- ============ updated_at triggers ============
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['tech_productions','tech_assets','tech_maintenance','tech_faults','tech_inventory','tech_team_members','tech_streams','tech_courses','tech_training_records','tech_risks','smo_plans','smo_objectives','smo_projects','smo_milestones','smo_kpis','smo_decisions','smo_risks','smo_ideas','smo_requests','smo_courses','smo_training_records']
  LOOP
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', 'set_updated_at_' || t, t);
  END LOOP;
END $$;

CREATE INDEX idx_tech_maintenance_due ON public.tech_maintenance(due_date);
CREATE INDEX idx_tech_faults_status ON public.tech_faults(status);
CREATE INDEX idx_smo_projects_stage ON public.smo_projects(stage);
CREATE INDEX idx_smo_objectives_plan ON public.smo_objectives(plan_id);
