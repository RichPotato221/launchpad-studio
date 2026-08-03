
-- Helper: worship team or leadership
CREATE OR REPLACE FUNCTION public.is_worship_team(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.can_access_admin_panel(_user_id)
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = _user_id AND p.primary_department IN ('worship','worship-music','music','media','media-communications'));
$$;

-- Music library enrichment
ALTER TABLE public.songs
  ADD COLUMN IF NOT EXISTS artist text,
  ADD COLUMN IF NOT EXISTS composer text,
  ADD COLUMN IF NOT EXISTS time_signature text,
  ADD COLUMN IF NOT EXISTS arrangement text,
  ADD COLUMN IF NOT EXISTS duration_seconds integer,
  ADD COLUMN IF NOT EXISTS lyrics text,
  ADD COLUMN IF NOT EXISTS sheet_music_url text,
  ADD COLUMN IF NOT EXISTS mp3_url text,
  ADD COLUMN IF NOT EXISTS multitrack_url text,
  ADD COLUMN IF NOT EXISTS practice_url text,
  ADD COLUMN IF NOT EXISTS scripture_theme text,
  ADD COLUMN IF NOT EXISTS language text,
  ADD COLUMN IF NOT EXISTS themes text[],
  ADD COLUMN IF NOT EXISTS tags text[],
  ADD COLUMN IF NOT EXISTS is_favourite boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS licence_notes text,
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_used_on date,
  ADD COLUMN IF NOT EXISTS times_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes text;

-- 1. Services
CREATE TABLE public.worship_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_slug text NOT NULL DEFAULT 'worship',
  branch branch,
  service_date date NOT NULL,
  start_time time,
  title text NOT NULL,
  service_type text NOT NULL DEFAULT 'sunday',
  theme text,
  sermon_title text,
  sermon_scriptures text,
  preacher text,
  worship_leader text,
  worship_leader_id uuid,
  venue text,
  status text NOT NULL DEFAULT 'planning',
  set_approved boolean NOT NULL DEFAULT false,
  scriptures_loaded boolean NOT NULL DEFAULT false,
  stage_layout_ready boolean NOT NULL DEFAULT false,
  tech_team_confirmed boolean NOT NULL DEFAULT false,
  livestream_ready boolean NOT NULL DEFAULT false,
  backup_plan text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.worship_services TO authenticated;
GRANT ALL ON public.worship_services TO service_role;
ALTER TABLE public.worship_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "worship services read" ON public.worship_services FOR SELECT TO authenticated USING (public.is_approved_member(auth.uid()));
CREATE POLICY "worship services write" ON public.worship_services FOR ALL TO authenticated USING (public.is_worship_team(auth.uid())) WITH CHECK (public.is_worship_team(auth.uid()));
CREATE TRIGGER trg_worship_services_updated_at BEFORE UPDATE ON public.worship_services FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Service flow items
CREATE TABLE public.worship_service_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.worship_services(id) ON DELETE CASCADE,
  order_index integer NOT NULL DEFAULT 1,
  item_type text NOT NULL DEFAULT 'other',
  title text NOT NULL,
  detail text,
  duration_min integer NOT NULL DEFAULT 5,
  responsible text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.worship_service_items TO authenticated;
GRANT ALL ON public.worship_service_items TO service_role;
ALTER TABLE public.worship_service_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "worship items read" ON public.worship_service_items FOR SELECT TO authenticated USING (public.is_approved_member(auth.uid()));
CREATE POLICY "worship items write" ON public.worship_service_items FOR ALL TO authenticated USING (public.is_worship_team(auth.uid())) WITH CHECK (public.is_worship_team(auth.uid()));
CREATE TRIGGER trg_worship_service_items_updated_at BEFORE UPDATE ON public.worship_service_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Worship set songs
CREATE TABLE public.worship_set_songs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.worship_services(id) ON DELETE CASCADE,
  song_id uuid REFERENCES public.songs(id) ON DELETE SET NULL,
  order_index integer NOT NULL DEFAULT 1,
  song_key text,
  segment text NOT NULL DEFAULT 'worship',
  duration_seconds integer,
  transition_note text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.worship_set_songs TO authenticated;
GRANT ALL ON public.worship_set_songs TO service_role;
ALTER TABLE public.worship_set_songs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "worship set read" ON public.worship_set_songs FOR SELECT TO authenticated USING (public.is_approved_member(auth.uid()));
CREATE POLICY "worship set write" ON public.worship_set_songs FOR ALL TO authenticated USING (public.is_worship_team(auth.uid())) WITH CHECK (public.is_worship_team(auth.uid()));
CREATE TRIGGER trg_worship_set_songs_updated_at BEFORE UPDATE ON public.worship_set_songs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Team members
CREATE TABLE public.worship_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  full_name text NOT NULL,
  branch branch,
  role_title text NOT NULL DEFAULT 'vocalist',
  instruments text[],
  vocal_range text,
  skills text,
  availability text,
  mentor text,
  experience_years integer,
  email text,
  phone text,
  emergency_contact_name text,
  emergency_contact_phone text,
  status text NOT NULL DEFAULT 'active',
  services_served integer NOT NULL DEFAULT 0,
  rehearsals_attended integer NOT NULL DEFAULT 0,
  rehearsals_missed integer NOT NULL DEFAULT 0,
  performance_score integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.worship_team_members TO authenticated;
GRANT ALL ON public.worship_team_members TO service_role;
ALTER TABLE public.worship_team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "worship team read" ON public.worship_team_members FOR SELECT TO authenticated USING (public.is_approved_member(auth.uid()));
CREATE POLICY "worship team write" ON public.worship_team_members FOR ALL TO authenticated USING (public.is_worship_team(auth.uid())) WITH CHECK (public.is_worship_team(auth.uid()));
CREATE TRIGGER trg_worship_team_members_updated_at BEFORE UPDATE ON public.worship_team_members FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Rehearsals
CREATE TABLE public.worship_rehearsals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid REFERENCES public.worship_services(id) ON DELETE SET NULL,
  branch branch,
  rehearsal_date date NOT NULL,
  start_time time,
  venue text,
  objectives text,
  practice_notes text,
  technical_runthrough boolean NOT NULL DEFAULT false,
  prayer_session boolean NOT NULL DEFAULT false,
  recording_url text,
  readiness_score integer,
  status text NOT NULL DEFAULT 'scheduled',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.worship_rehearsals TO authenticated;
GRANT ALL ON public.worship_rehearsals TO service_role;
ALTER TABLE public.worship_rehearsals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "worship rehearsals read" ON public.worship_rehearsals FOR SELECT TO authenticated USING (public.is_approved_member(auth.uid()));
CREATE POLICY "worship rehearsals write" ON public.worship_rehearsals FOR ALL TO authenticated USING (public.is_worship_team(auth.uid())) WITH CHECK (public.is_worship_team(auth.uid()));
CREATE TRIGGER trg_worship_rehearsals_updated_at BEFORE UPDATE ON public.worship_rehearsals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.worship_rehearsal_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rehearsal_id uuid NOT NULL REFERENCES public.worship_rehearsals(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.worship_team_members(id) ON DELETE CASCADE,
  present boolean NOT NULL DEFAULT true,
  on_time boolean NOT NULL DEFAULT true,
  prepared boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rehearsal_id, member_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.worship_rehearsal_attendance TO authenticated;
GRANT ALL ON public.worship_rehearsal_attendance TO service_role;
ALTER TABLE public.worship_rehearsal_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "worship rehearsal attendance read" ON public.worship_rehearsal_attendance FOR SELECT TO authenticated USING (public.is_approved_member(auth.uid()));
CREATE POLICY "worship rehearsal attendance write" ON public.worship_rehearsal_attendance FOR ALL TO authenticated USING (public.is_worship_team(auth.uid())) WITH CHECK (public.is_worship_team(auth.uid()));

-- 6. Scheduling assignments
CREATE TABLE public.worship_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.worship_services(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.worship_team_members(id) ON DELETE CASCADE,
  role_title text NOT NULL,
  response text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (service_id, member_id, role_title)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.worship_assignments TO authenticated;
GRANT ALL ON public.worship_assignments TO service_role;
ALTER TABLE public.worship_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "worship assignments read" ON public.worship_assignments FOR SELECT TO authenticated USING (public.is_approved_member(auth.uid()));
CREATE POLICY "worship assignments write" ON public.worship_assignments FOR ALL TO authenticated USING (public.is_worship_team(auth.uid())) WITH CHECK (public.is_worship_team(auth.uid()));
CREATE TRIGGER trg_worship_assignments_updated_at BEFORE UPDATE ON public.worship_assignments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 7. Equipment
CREATE TABLE public.worship_equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch branch,
  asset_number text,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'other',
  serial_number text,
  purchase_date date,
  warranty_expiry date,
  condition text NOT NULL DEFAULT 'good',
  status text NOT NULL DEFAULT 'in_service',
  assigned_to text,
  location text,
  last_service_date date,
  next_service_date date,
  replacement_year integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.worship_equipment TO authenticated;
GRANT ALL ON public.worship_equipment TO service_role;
ALTER TABLE public.worship_equipment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "worship equipment read" ON public.worship_equipment FOR SELECT TO authenticated USING (public.is_approved_member(auth.uid()));
CREATE POLICY "worship equipment write" ON public.worship_equipment FOR ALL TO authenticated USING (public.is_worship_team(auth.uid())) WITH CHECK (public.is_worship_team(auth.uid()));
CREATE TRIGGER trg_worship_equipment_updated_at BEFORE UPDATE ON public.worship_equipment FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.worship_equipment_faults (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id uuid NOT NULL REFERENCES public.worship_equipment(id) ON DELETE CASCADE,
  reported_by uuid,
  reported_on date NOT NULL DEFAULT CURRENT_DATE,
  description text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  resolution text,
  resolved_on date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.worship_equipment_faults TO authenticated;
GRANT ALL ON public.worship_equipment_faults TO service_role;
ALTER TABLE public.worship_equipment_faults ENABLE ROW LEVEL SECURITY;
CREATE POLICY "worship faults read" ON public.worship_equipment_faults FOR SELECT TO authenticated USING (public.is_approved_member(auth.uid()));
CREATE POLICY "worship faults write" ON public.worship_equipment_faults FOR ALL TO authenticated USING (public.is_worship_team(auth.uid())) WITH CHECK (public.is_worship_team(auth.uid()));
CREATE TRIGGER trg_worship_equipment_faults_updated_at BEFORE UPDATE ON public.worship_equipment_faults FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 8. Technical checklist
CREATE TABLE public.worship_tech_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.worship_services(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'sound',
  label text NOT NULL,
  detail text,
  assigned_to text,
  done boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.worship_tech_items TO authenticated;
GRANT ALL ON public.worship_tech_items TO service_role;
ALTER TABLE public.worship_tech_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "worship tech read" ON public.worship_tech_items FOR SELECT TO authenticated USING (public.is_approved_member(auth.uid()));
CREATE POLICY "worship tech write" ON public.worship_tech_items FOR ALL TO authenticated USING (public.is_worship_team(auth.uid())) WITH CHECK (public.is_worship_team(auth.uid()));
CREATE TRIGGER trg_worship_tech_items_updated_at BEFORE UPDATE ON public.worship_tech_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 9. Training
CREATE TABLE public.worship_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL DEFAULT 'musicianship',
  description text,
  facilitator text,
  duration_hours numeric,
  renewal_months integer,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.worship_courses TO authenticated;
GRANT ALL ON public.worship_courses TO service_role;
ALTER TABLE public.worship_courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "worship courses read" ON public.worship_courses FOR SELECT TO authenticated USING (public.is_approved_member(auth.uid()));
CREATE POLICY "worship courses write" ON public.worship_courses FOR ALL TO authenticated USING (public.is_worship_team(auth.uid())) WITH CHECK (public.is_worship_team(auth.uid()));
CREATE TRIGGER trg_worship_courses_updated_at BEFORE UPDATE ON public.worship_courses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.worship_training_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.worship_courses(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.worship_team_members(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'enrolled',
  completed_on date,
  score integer,
  certificate_url text,
  renewal_due date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.worship_training_records TO authenticated;
GRANT ALL ON public.worship_training_records TO service_role;
ALTER TABLE public.worship_training_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "worship training read" ON public.worship_training_records FOR SELECT TO authenticated USING (public.is_approved_member(auth.uid()));
CREATE POLICY "worship training write" ON public.worship_training_records FOR ALL TO authenticated USING (public.is_worship_team(auth.uid())) WITH CHECK (public.is_worship_team(auth.uid()));
CREATE TRIGGER trg_worship_training_records_updated_at BEFORE UPDATE ON public.worship_training_records FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 10. Risk register
CREATE TABLE public.worship_risks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch branch,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'operational',
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
GRANT SELECT, INSERT, UPDATE, DELETE ON public.worship_risks TO authenticated;
GRANT ALL ON public.worship_risks TO service_role;
ALTER TABLE public.worship_risks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "worship risks read" ON public.worship_risks FOR SELECT TO authenticated USING (public.is_approved_member(auth.uid()));
CREATE POLICY "worship risks write" ON public.worship_risks FOR ALL TO authenticated USING (public.is_worship_team(auth.uid())) WITH CHECK (public.is_worship_team(auth.uid()));
CREATE TRIGGER trg_worship_risks_updated_at BEFORE UPDATE ON public.worship_risks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 11. Spiritual formation log
CREATE TABLE public.worship_spiritual_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES public.worship_team_members(id) ON DELETE CASCADE,
  activity_type text NOT NULL DEFAULT 'prayer',
  activity_date date NOT NULL DEFAULT CURRENT_DATE,
  detail text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.worship_spiritual_log TO authenticated;
GRANT ALL ON public.worship_spiritual_log TO service_role;
ALTER TABLE public.worship_spiritual_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "worship spiritual read" ON public.worship_spiritual_log FOR SELECT TO authenticated USING (public.is_approved_member(auth.uid()));
CREATE POLICY "worship spiritual write" ON public.worship_spiritual_log FOR ALL TO authenticated USING (public.is_worship_team(auth.uid())) WITH CHECK (public.is_worship_team(auth.uid()));

-- Extend the helper now that the team table exists
CREATE OR REPLACE FUNCTION public.is_worship_team(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.can_access_admin_panel(_user_id)
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = _user_id AND p.primary_department IN ('worship','worship-music','music','media','media-communications'))
      OR EXISTS (SELECT 1 FROM public.worship_team_members w WHERE w.user_id = _user_id AND w.status = 'active');
$$;
REVOKE EXECUTE ON FUNCTION public.is_worship_team(uuid) FROM anon;
