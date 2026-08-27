CREATE POLICY "dm_delete_participants" ON public.direct_messages FOR DELETE TO authenticated USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "group_messages_delete_own_or_owner" ON public.group_messages FOR DELETE TO authenticated USING (
  sender_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.group_conversations c WHERE c.id = group_messages.conversation_id AND c.created_by = auth.uid())
);

GRANT DELETE ON public.direct_messages TO authenticated;
GRANT DELETE ON public.group_messages TO authenticated;