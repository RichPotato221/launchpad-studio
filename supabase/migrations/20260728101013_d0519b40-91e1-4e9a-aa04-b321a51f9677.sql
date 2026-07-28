CREATE OR REPLACE FUNCTION public.get_my_calendar_connection_status()
RETURNS TABLE (
  connector_id text,
  connected boolean,
  connected_email text,
  connected_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT provider.connector_id,
         c.id IS NOT NULL AS connected,
         c.connected_email,
         c.connected_at
  FROM (VALUES ('google_calendar'::text), ('microsoft_outlook'::text)) AS provider(connector_id)
  LEFT JOIN public.app_user_connections c
    ON c.connector_id = provider.connector_id
   AND c.user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.get_my_calendar_connection_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_calendar_connection_status() TO authenticated;