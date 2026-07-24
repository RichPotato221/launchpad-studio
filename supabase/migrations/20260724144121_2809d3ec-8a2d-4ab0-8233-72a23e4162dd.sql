
-- Direct messages between members
CREATE TABLE public.direct_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_dm_pair_created ON public.direct_messages (
  LEAST(sender_id, recipient_id), GREATEST(sender_id, recipient_id), created_at
);
CREATE INDEX idx_dm_recipient_unread ON public.direct_messages (recipient_id) WHERE read_at IS NULL;

GRANT SELECT, INSERT, UPDATE ON public.direct_messages TO authenticated;
GRANT ALL ON public.direct_messages TO service_role;

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dm_select_participants" ON public.direct_messages
  FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "dm_insert_own" ON public.direct_messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id AND sender_id <> recipient_id);

CREATE POLICY "dm_update_recipient_read" ON public.direct_messages
  FOR UPDATE TO authenticated
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

-- Add a title/header to announcements (optional, backwards compatible)
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS title TEXT;

-- List conversation partners with last message + unread count
CREATE OR REPLACE FUNCTION public.list_conversations()
RETURNS TABLE (
  partner_id UUID,
  partner_name TEXT,
  partner_avatar TEXT,
  last_body TEXT,
  last_created_at TIMESTAMPTZ,
  unread_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (SELECT auth.uid() AS uid),
  msgs AS (
    SELECT
      CASE WHEN dm.sender_id = (SELECT uid FROM me) THEN dm.recipient_id ELSE dm.sender_id END AS partner_id,
      dm.body,
      dm.created_at,
      dm.read_at,
      dm.recipient_id
    FROM public.direct_messages dm
    WHERE dm.sender_id = (SELECT uid FROM me) OR dm.recipient_id = (SELECT uid FROM me)
  ),
  latest AS (
    SELECT DISTINCT ON (partner_id) partner_id, body, created_at
    FROM msgs
    ORDER BY partner_id, created_at DESC
  ),
  unread AS (
    SELECT partner_id, COUNT(*) AS c
    FROM msgs
    WHERE recipient_id = (SELECT uid FROM me) AND read_at IS NULL
    GROUP BY partner_id
  )
  SELECT l.partner_id, p.full_name, p.avatar_url, l.body, l.created_at,
         COALESCE(u.c, 0)
  FROM latest l
  LEFT JOIN public.profiles p ON p.id = l.partner_id
  LEFT JOIN unread u ON u.partner_id = l.partner_id
  ORDER BY l.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.list_conversations() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_conversations() TO authenticated;
