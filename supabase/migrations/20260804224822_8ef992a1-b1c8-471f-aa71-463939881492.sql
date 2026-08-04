
CREATE OR REPLACE FUNCTION public.is_apostolic_office(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text IN ('senior_apostle','chairperson','lead_pastor','associate_pastor','secretary','strategic_adviser')
  )
$$;
REVOKE EXECUTE ON FUNCTION public.is_apostolic_office(uuid) FROM anon;

-- Vision
CREATE TABLE public.apo_vision (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year integer NOT NULL,
  theme text NOT NULL,
  scripture text,
  vision_statement text,
  kingdom_priorities text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.apo_vision TO authenticated;
GRANT ALL ON public.apo_vision TO service_role;
ALTER TABLE public.apo_vision ENABLE ROW LEVEL SECURITY;
CREATE POLICY "apo_vision read" ON public.apo_vision FOR SELECT TO authenticated
  USING (status = 'published' OR public.is_apostolic_office(auth.uid()));
CREATE POLICY "apo_vision manage" ON public.apo_vision FOR ALL TO authenticated
  USING (public.is_apostolic_office(auth.uid())) WITH CHECK (public.is_apostolic_office(auth.uid()));

CREATE TABLE public.apo_objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vision_id uuid REFERENCES public.apo_vision(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  department_slug text,
  owner_id uuid,
  target_date date,
  progress_pct integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'in_progress',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.apo_objectives TO authenticated;
GRANT ALL ON public.apo_objectives TO service_role;
ALTER TABLE public.apo_objectives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "apo_objectives read" ON public.apo_objectives FOR SELECT TO authenticated USING (true);
CREATE POLICY "apo_objectives manage" ON public.apo_objectives FOR ALL TO authenticated
  USING (public.is_apostolic_office(auth.uid())) WITH CHECK (public.is_apostolic_office(auth.uid()));

CREATE TABLE public.apo_directives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vision_id uuid REFERENCES public.apo_vision(id) ON DELETE SET NULL,
  title text NOT NULL,
  body text NOT NULL,
  category text NOT NULL DEFAULT 'directive',
  status text NOT NULL DEFAULT 'issued',
  issued_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.apo_directives TO authenticated;
GRANT ALL ON public.apo_directives TO service_role;
ALTER TABLE public.apo_directives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "apo_directives read" ON public.apo_directives FOR SELECT TO authenticated USING (true);
CREATE POLICY "apo_directives manage" ON public.apo_directives FOR ALL TO authenticated
  USING (public.is_apostolic_office(auth.uid())) WITH CHECK (public.is_apostolic_office(auth.uid()));

-- Fivefold ministry
CREATE TABLE public.apo_fivefold (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  full_name text NOT NULL,
  office text NOT NULL,
  calling text,
  appointment_date date,
  ordination_history text,
  spiritual_gifts text[] NOT NULL DEFAULT '{}',
  mentor_name text,
  ministry_assignments text,
  teaching_schedule text,
  development_plan text,
  performance_pct integer NOT NULL DEFAULT 0,
  succession_readiness text NOT NULL DEFAULT 'developing',
  branch text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.apo_fivefold TO authenticated;
GRANT ALL ON public.apo_fivefold TO service_role;
ALTER TABLE public.apo_fivefold ENABLE ROW LEVEL SECURITY;
CREATE POLICY "apo_fivefold read" ON public.apo_fivefold FOR SELECT TO authenticated
  USING (public.is_apostolic_office(auth.uid()) OR user_id = auth.uid());
CREATE POLICY "apo_fivefold manage" ON public.apo_fivefold FOR ALL TO authenticated
  USING (public.is_apostolic_office(auth.uid())) WITH CHECK (public.is_apostolic_office(auth.uid()));

-- Appointments
CREATE TABLE public.apo_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_name text NOT NULL,
  user_id uuid,
  kind text NOT NULL DEFAULT 'appointment',
  role_title text,
  department_slug text,
  branch text,
  effective_date date,
  end_date date,
  status text NOT NULL DEFAULT 'pending',
  approved_by uuid,
  approved_at timestamptz,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.apo_appointments TO authenticated;
GRANT ALL ON public.apo_appointments TO service_role;
ALTER TABLE public.apo_appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "apo_appointments read" ON public.apo_appointments FOR SELECT TO authenticated
  USING (public.is_apostolic_office(auth.uid()) OR user_id = auth.uid());
CREATE POLICY "apo_appointments manage" ON public.apo_appointments FOR ALL TO authenticated
  USING (public.is_apostolic_office(auth.uid())) WITH CHECK (public.is_apostolic_office(auth.uid()));

-- Executive approvals with digital signature
CREATE TABLE public.apo_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text,
  category text NOT NULL,
  title text NOT NULL,
  summary text,
  amount numeric,
  requested_by uuid,
  status text NOT NULL DEFAULT 'pending',
  decided_by uuid,
  decided_at timestamptz,
  signature_name text,
  decision_notes text,
  document_url text,
  document_name text,
  audit jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.apo_approvals TO authenticated;
GRANT ALL ON public.apo_approvals TO service_role;
ALTER TABLE public.apo_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "apo_approvals read" ON public.apo_approvals FOR SELECT TO authenticated
  USING (public.is_apostolic_office(auth.uid()) OR requested_by = auth.uid());
CREATE POLICY "apo_approvals insert" ON public.apo_approvals FOR INSERT TO authenticated
  WITH CHECK (requested_by = auth.uid() OR public.is_apostolic_office(auth.uid()));
CREATE POLICY "apo_approvals manage" ON public.apo_approvals FOR UPDATE TO authenticated
  USING (public.is_apostolic_office(auth.uid())) WITH CHECK (public.is_apostolic_office(auth.uid()));
CREATE POLICY "apo_approvals delete" ON public.apo_approvals FOR DELETE TO authenticated
  USING (public.is_apostolic_office(auth.uid()));

-- Development projects
CREATE TABLE public.apo_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'building',
  description text,
  branch text,
  budget numeric NOT NULL DEFAULT 0,
  spent numeric NOT NULL DEFAULT 0,
  start_date date,
  target_date date,
  progress_pct integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'planning',
  contractor text,
  milestones text,
  risks text,
  owner_name text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.apo_projects TO authenticated;
GRANT ALL ON public.apo_projects TO service_role;
ALTER TABLE public.apo_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "apo_projects read" ON public.apo_projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "apo_projects manage" ON public.apo_projects FOR ALL TO authenticated
  USING (public.is_apostolic_office(auth.uid())) WITH CHECK (public.is_apostolic_office(auth.uid()));

-- Executive risk register
CREATE TABLE public.apo_risks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  description text NOT NULL,
  likelihood integer NOT NULL DEFAULT 1,
  impact integer NOT NULL DEFAULT 1,
  rating integer GENERATED ALWAYS AS (likelihood * impact) STORED,
  mitigation text,
  owner_name text,
  review_date date,
  status text NOT NULL DEFAULT 'open',
  evidence text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.apo_risks TO authenticated;
GRANT ALL ON public.apo_risks TO service_role;
ALTER TABLE public.apo_risks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "apo_risks read" ON public.apo_risks FOR SELECT TO authenticated
  USING (public.is_apostolic_office(auth.uid()));
CREATE POLICY "apo_risks manage" ON public.apo_risks FOR ALL TO authenticated
  USING (public.is_apostolic_office(auth.uid())) WITH CHECK (public.is_apostolic_office(auth.uid()));

-- Executive circulars / communications
CREATE TABLE public.apo_communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL DEFAULT 'circular',
  subject text NOT NULL,
  body text NOT NULL,
  channels text[] NOT NULL DEFAULT '{in_app}',
  audience text NOT NULL DEFAULT 'all',
  status text NOT NULL DEFAULT 'draft',
  sent_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.apo_communications TO authenticated;
GRANT ALL ON public.apo_communications TO service_role;
ALTER TABLE public.apo_communications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "apo_comms read" ON public.apo_communications FOR SELECT TO authenticated
  USING (status = 'sent' OR public.is_apostolic_office(auth.uid()));
CREATE POLICY "apo_comms manage" ON public.apo_communications FOR ALL TO authenticated
  USING (public.is_apostolic_office(auth.uid())) WITH CHECK (public.is_apostolic_office(auth.uid()));

CREATE TRIGGER apo_vision_touch BEFORE UPDATE ON public.apo_vision FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER apo_objectives_touch BEFORE UPDATE ON public.apo_objectives FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER apo_fivefold_touch BEFORE UPDATE ON public.apo_fivefold FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER apo_appointments_touch BEFORE UPDATE ON public.apo_appointments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER apo_approvals_touch BEFORE UPDATE ON public.apo_approvals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER apo_projects_touch BEFORE UPDATE ON public.apo_projects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER apo_risks_touch BEFORE UPDATE ON public.apo_risks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
