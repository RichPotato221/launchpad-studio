CREATE TABLE public.int_prayer_roster (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  watch text,
  start_time time,
  end_time time,
  member_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  branch text,
  focus text,
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.int_prayer_roster TO authenticated;
GRANT ALL ON public.int_prayer_roster TO service_role;

ALTER TABLE public.int_prayer_roster ENABLE ROW LEVEL SECURITY;

CREATE POLICY "approved members read roster"
  ON public.int_prayer_roster FOR SELECT TO authenticated
  USING (public.is_approved_member(auth.uid()));

CREATE POLICY "intercession team writes roster"
  ON public.int_prayer_roster FOR ALL TO authenticated
  USING (public.is_intercession_team(auth.uid()))
  WITH CHECK (public.is_intercession_team(auth.uid()));

CREATE TRIGGER int_prayer_roster_updated_at
  BEFORE UPDATE ON public.int_prayer_roster
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.int_meetings ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES public.events(id) ON DELETE SET NULL;