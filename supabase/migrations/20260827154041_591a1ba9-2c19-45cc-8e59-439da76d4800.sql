CREATE TABLE public.group_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_conversations TO authenticated;
GRANT ALL ON public.group_conversations TO service_role;
ALTER TABLE public.group_conversations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.group_conversation_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.group_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.group_conversation_members TO authenticated;
GRANT ALL ON public.group_conversation_members TO service_role;
ALTER TABLE public.group_conversation_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.group_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.group_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.group_messages TO authenticated;
GRANT ALL ON public.group_messages TO service_role;
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX group_messages_conv_idx ON public.group_messages (conversation_id, created_at);

CREATE OR REPLACE FUNCTION public.is_group_member(_conversation_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_conversation_members m
    WHERE m.conversation_id = _conversation_id AND m.user_id = _user_id
  );
$$;
REVOKE EXECUTE ON FUNCTION public.is_group_member(uuid, uuid) FROM anon;

CREATE POLICY "members_read_group" ON public.group_conversations FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR public.is_group_member(id, auth.uid()));
CREATE POLICY "create_group" ON public.group_conversations FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "owner_update_group" ON public.group_conversations FOR UPDATE TO authenticated
  USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "owner_delete_group" ON public.group_conversations FOR DELETE TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "members_read_group_members" ON public.group_conversation_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_group_member(conversation_id, auth.uid()));
CREATE POLICY "owner_add_group_members" ON public.group_conversation_members FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.group_conversations c WHERE c.id = conversation_id AND c.created_by = auth.uid()));
CREATE POLICY "leave_or_owner_remove" ON public.group_conversation_members FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.group_conversations c WHERE c.id = conversation_id AND c.created_by = auth.uid()));

CREATE POLICY "members_read_group_messages" ON public.group_messages FOR SELECT TO authenticated
  USING (public.is_group_member(conversation_id, auth.uid()));
CREATE POLICY "members_send_group_messages" ON public.group_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND public.is_group_member(conversation_id, auth.uid()));

CREATE TRIGGER trg_group_conversations_updated BEFORE UPDATE ON public.group_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();