CREATE TABLE IF NOT EXISTS public.app_user_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connector_id text NOT NULL CHECK (connector_id IN ('google_calendar', 'microsoft_outlook')),
  connection_key_ciphertext text NOT NULL,
  connected_email text,
  connected_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, connector_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_user_connections TO authenticated;
GRANT ALL ON public.app_user_connections TO service_role;
ALTER TABLE public.app_user_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their own calendar connections"
ON public.app_user_connections
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Members can create their own calendar connections"
ON public.app_user_connections
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Members can update their own calendar connections"
ON public.app_user_connections
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Members can remove their own calendar connections"
ON public.app_user_connections
FOR DELETE TO authenticated
USING (user_id = auth.uid());

DROP TRIGGER IF EXISTS app_user_connections_updated_at ON public.app_user_connections;
CREATE TRIGGER app_user_connections_updated_at
BEFORE UPDATE ON public.app_user_connections
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.calendar_sync_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connector_id text NOT NULL CHECK (connector_id IN ('google_calendar', 'microsoft_outlook')),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  external_calendar_id text,
  external_event_id text NOT NULL,
  external_event_etag text,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, connector_id, event_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_sync_map TO authenticated;
GRANT ALL ON public.calendar_sync_map TO service_role;
ALTER TABLE public.calendar_sync_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their own calendar sync links"
ON public.calendar_sync_map
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Members can manage their own calendar sync links"
ON public.calendar_sync_map
FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP TRIGGER IF EXISTS calendar_sync_map_updated_at ON public.calendar_sync_map;
CREATE TRIGGER calendar_sync_map_updated_at
BEFORE UPDATE ON public.calendar_sync_map
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.calendar_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  connector_id text NOT NULL CHECK (connector_id IN ('google_calendar', 'microsoft_outlook')),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  operation text NOT NULL CHECK (operation IN ('create','update','cancel','rsvp','retry','connect','disconnect')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','success','failed','skipped')),
  attempts integer NOT NULL DEFAULT 0,
  next_retry_at timestamptz,
  error_message text,
  provider_response jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_sync_log TO authenticated;
GRANT ALL ON public.calendar_sync_log TO service_role;
ALTER TABLE public.calendar_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their own calendar sync logs"
ON public.calendar_sync_log
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Members can create their own calendar sync logs"
ON public.calendar_sync_log
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Members can update their own calendar sync logs"
ON public.calendar_sync_log
FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR public.is_admin(auth.uid()))
WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Only leadership can remove calendar sync logs"
ON public.calendar_sync_log
FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));

DROP TRIGGER IF EXISTS calendar_sync_log_updated_at ON public.calendar_sync_log;
CREATE TRIGGER calendar_sync_log_updated_at
BEFORE UPDATE ON public.calendar_sync_log
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_app_user_connections_user_connector ON public.app_user_connections(user_id, connector_id);
CREATE INDEX IF NOT EXISTS idx_calendar_sync_map_user_event ON public.calendar_sync_map(user_id, event_id);
CREATE INDEX IF NOT EXISTS idx_calendar_sync_log_retry ON public.calendar_sync_log(status, next_retry_at);
CREATE INDEX IF NOT EXISTS idx_calendar_sync_log_event ON public.calendar_sync_log(event_id);

CREATE OR REPLACE FUNCTION public.queue_calendar_sync_for_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.calendar_sync_log (user_id, connector_id, event_id, operation, status, next_retry_at)
  SELECT c.user_id,
         c.connector_id,
         COALESCE(NEW.id, OLD.id),
         CASE
           WHEN TG_OP = 'DELETE' THEN 'cancel'
           WHEN TG_OP = 'UPDATE' THEN 'update'
           ELSE 'create'
         END,
         'pending',
         now()
  FROM public.app_user_connections c
  JOIN public.profiles p ON p.id = c.user_id
  WHERE p.approval_status = 'approved'
    AND (
      COALESCE(NEW.department_slug, OLD.department_slug) IS NULL
      OR p.primary_department = COALESCE(NEW.department_slug, OLD.department_slug)
      OR public.is_admin(c.user_id)
      OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = c.user_id
          AND ur.department_slug = COALESCE(NEW.department_slug, OLD.department_slug)
      )
    );

  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE ALL ON FUNCTION public.queue_calendar_sync_for_event() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.queue_calendar_sync_for_event() TO authenticated;

DROP TRIGGER IF EXISTS events_queue_calendar_insert ON public.events;
CREATE TRIGGER events_queue_calendar_insert
AFTER INSERT ON public.events
FOR EACH ROW EXECUTE FUNCTION public.queue_calendar_sync_for_event();

DROP TRIGGER IF EXISTS events_queue_calendar_update ON public.events;
CREATE TRIGGER events_queue_calendar_update
AFTER UPDATE OF title, description, event_type, event_date, start_time, end_time, location, branch, department_slug, status, is_recurring, recurrence_pattern, recurrence_interval, recurrence_end_date ON public.events
FOR EACH ROW EXECUTE FUNCTION public.queue_calendar_sync_for_event();

DROP TRIGGER IF EXISTS events_queue_calendar_delete ON public.events;
CREATE TRIGGER events_queue_calendar_delete
AFTER DELETE ON public.events
FOR EACH ROW EXECUTE FUNCTION public.queue_calendar_sync_for_event();