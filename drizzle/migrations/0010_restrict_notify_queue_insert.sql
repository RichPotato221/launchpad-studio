DROP POLICY IF EXISTS notify_queue_system_insert ON public.notify_queue;
REVOKE INSERT ON public.notify_queue FROM anon, authenticated;