
-- ============ TASKS & APPROVALS ============
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_slug text,
  title text NOT NULL,
  description text,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  due_date date,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','blocked','done','cancelled')),
  requires_approval boolean NOT NULL DEFAULT false,
  approval_status text CHECK (approval_status IN ('pending','chair_approved','senior_pastor_approved','rejected')),
  approved_by_chair uuid REFERENCES auth.users(id),
  approved_by_senior uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_read" ON public.tasks FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR assigned_to = auth.uid()
    OR created_by = auth.uid()
    OR (department_slug IS NOT NULL AND public.is_dept_member_or_admin(department_slug))
  );
CREATE POLICY "tasks_insert" ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "tasks_update" ON public.tasks FOR UPDATE TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR assigned_to = auth.uid()
    OR created_by = auth.uid()
    OR (department_slug IS NOT NULL AND public.is_dept_member_or_admin(department_slug))
  );
CREATE POLICY "tasks_delete" ON public.tasks FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()) OR created_by = auth.uid());

CREATE TRIGGER tasks_updated BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_tasks_dept ON public.tasks(department_slug);
CREATE INDEX idx_tasks_assigned ON public.tasks(assigned_to);
CREATE INDEX idx_tasks_status ON public.tasks(status);

-- ============ EVENTS & ROSTER ============
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_slug text,
  title text NOT NULL,
  description text,
  event_type text NOT NULL DEFAULT 'meeting' CHECK (event_type IN ('service','rehearsal','meeting','outreach','training','youth','childrens','other')),
  event_date date NOT NULL,
  start_time time,
  end_time time,
  location text,
  branch text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "events_read_all_auth" ON public.events FOR SELECT TO authenticated USING (true);
CREATE POLICY "events_insert" ON public.events FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid() AND (
      public.is_admin(auth.uid())
      OR department_slug IS NULL
      OR public.is_dept_member_or_admin(department_slug)
    )
  );
CREATE POLICY "events_update" ON public.events FOR UPDATE TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR created_by = auth.uid()
    OR (department_slug IS NOT NULL AND public.is_dept_member_or_admin(department_slug))
  );
CREATE POLICY "events_delete" ON public.events FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()) OR created_by = auth.uid());

CREATE TRIGGER events_updated BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_events_date ON public.events(event_date);
CREATE INDEX idx_events_dept ON public.events(department_slug);

CREATE TABLE public.event_rosters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  role text NOT NULL,
  status text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited','confirmed','declined','tentative')),
  notes text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_rosters TO authenticated;
GRANT ALL ON public.event_rosters TO service_role;
ALTER TABLE public.event_rosters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rosters_read_all_auth" ON public.event_rosters FOR SELECT TO authenticated USING (true);
CREATE POLICY "rosters_insert" ON public.event_rosters FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "rosters_update" ON public.event_rosters FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()) OR user_id = auth.uid() OR created_by = auth.uid());
CREATE POLICY "rosters_delete" ON public.event_rosters FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()) OR created_by = auth.uid());

CREATE TRIGGER rosters_updated BEFORE UPDATE ON public.event_rosters
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_rosters_event ON public.event_rosters(event_id);
CREATE INDEX idx_rosters_user ON public.event_rosters(user_id);

-- ============ ATTENDANCE ============
CREATE TABLE public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  department_slug text,
  service_date date NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text,
  branch text,
  present boolean NOT NULL DEFAULT true,
  visitor boolean NOT NULL DEFAULT false,
  notes text,
  recorded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO authenticated;
GRANT ALL ON public.attendance TO service_role;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attendance_read" ON public.attendance FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR recorded_by = auth.uid()
    OR user_id = auth.uid()
    OR (department_slug IS NOT NULL AND public.is_dept_member_or_admin(department_slug))
  );
CREATE POLICY "attendance_insert" ON public.attendance FOR INSERT TO authenticated
  WITH CHECK (recorded_by = auth.uid());
CREATE POLICY "attendance_update" ON public.attendance FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()) OR recorded_by = auth.uid());
CREATE POLICY "attendance_delete" ON public.attendance FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()) OR recorded_by = auth.uid());

CREATE TRIGGER attendance_updated BEFORE UPDATE ON public.attendance
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_attendance_date ON public.attendance(service_date);
CREATE INDEX idx_attendance_dept ON public.attendance(department_slug);
CREATE INDEX idx_attendance_event ON public.attendance(event_id);
