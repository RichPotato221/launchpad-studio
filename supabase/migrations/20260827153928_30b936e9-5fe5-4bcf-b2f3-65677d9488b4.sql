CREATE TABLE public.notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type text NOT NULL,
  entity_type text,
  entity_id uuid,
  recipient_id uuid,
  recipient_email text NOT NULL,
  subject text,
  status text NOT NULL DEFAULT 'PENDING',
  retry_count integer NOT NULL DEFAULT 0,
  error_message text,
  idempotency_key text NOT NULL UNIQUE,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  sent_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.notification_log TO service_role;
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notification_log_service_only" ON public.notification_log FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE INDEX notification_log_status_idx ON public.notification_log (status, retry_count, created_at);

CREATE TABLE public.notification_action_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  entity_type text NOT NULL DEFAULT 'event',
  entity_id uuid NOT NULL,
  user_id uuid,
  recipient_email text NOT NULL,
  used_at timestamptz,
  used_action text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.notification_action_tokens TO service_role;
ALTER TABLE public.notification_action_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notification_tokens_service_only" ON public.notification_action_tokens FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE public.notification_preferences (
  user_id uuid PRIMARY KEY,
  events boolean NOT NULL DEFAULT true,
  meetings boolean NOT NULL DEFAULT true,
  announcements boolean NOT NULL DEFAULT true,
  messages boolean NOT NULL DEFAULT true,
  feed boolean NOT NULL DEFAULT false,
  leadership boolean NOT NULL DEFAULT true,
  channel text NOT NULL DEFAULT 'both',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_notification_prefs" ON public.notification_preferences FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.event_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  user_id uuid,
  recipient_email text NOT NULL,
  response text NOT NULL,
  source text NOT NULL DEFAULT 'portal',
  responded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, recipient_email)
);
GRANT SELECT, INSERT, UPDATE ON public.event_responses TO authenticated;
GRANT ALL ON public.event_responses TO service_role;
ALTER TABLE public.event_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_event_responses" ON public.event_responses FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_event_responses" ON public.event_responses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_event_responses" ON public.event_responses FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER trg_notification_log_updated BEFORE UPDATE ON public.notification_log FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_notification_prefs_updated BEFORE UPDATE ON public.notification_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_event_responses_updated BEFORE UPDATE ON public.event_responses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();