
CREATE OR REPLACE FUNCTION public.asset_movement_recipients(_movement_id uuid)
RETURNS TABLE (user_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH m AS (SELECT * FROM public.asset_movements WHERE id = _movement_id)
  SELECT DISTINCT p.id
    FROM public.profiles p, m
   WHERE p.approval_status = 'approved'
     AND (
       p.id = m.requested_by
       OR p.id = m.responsible_person
       OR p.primary_department IN ('resource-administrator')
       OR EXISTS (
            SELECT 1 FROM public.user_roles ur
             WHERE ur.user_id = p.id
               AND (ur.department_slug = 'resource-administrator'
                    OR ur.role = 'senior_apostle'
                    OR (ur.role IN ('chairperson','lead_pastor','associate_pastor','secretary')
                        AND p.branch IN (m.source_branch, m.destination_branch)))
          )
     );
$$;

CREATE OR REPLACE FUNCTION public.notify_asset_movement(_movement_id uuid, _kind text, _title text, _message text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer := 0;
BEGIN
  INSERT INTO public.notifications (user_id, title, message, link, type, branch)
  SELECT r.user_id, _title, _message,
         '/departments/resource-administrator?movement=' || _movement_id::text,
         COALESCE(_kind, 'SYSTEM_NOTIFICATION'), NULL
    FROM public.asset_movement_recipients(_movement_id) r;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END; $$;

CREATE OR REPLACE FUNCTION public.flag_overdue_asset_movements()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; flagged integer := 0; days integer; msg text;
BEGIN
  FOR r IN
    SELECT * FROM public.asset_movements
     WHERE status IN ('ON_LOAN','AT_EVENT','OVERDUE','RETURN_REQUESTED','RETURN_IN_TRANSIT')
       AND expected_return_date IS NOT NULL
  LOOP
    days := (CURRENT_DATE - r.expected_return_date);
    IF days > 0 AND r.status IN ('ON_LOAN','AT_EVENT') THEN
      UPDATE public.asset_movements SET overdue = true, status = 'OVERDUE' WHERE id = r.id;
      flagged := flagged + 1;
    ELSIF days > 0 AND NOT r.overdue THEN
      UPDATE public.asset_movements SET overdue = true WHERE id = r.id;
    END IF;

    msg := NULL;
    IF days IN (-7,-3,-1) THEN
      msg := format('Agreement %s: the assets are due back on %s (%s day(s) from now).',
                    r.agreement_no, to_char(r.expected_return_date,'DD Mon YYYY'), abs(days));
    ELSIF days = 0 THEN
      msg := format('Agreement %s: the assets are due back today.', r.agreement_no);
    ELSIF days IN (1,3,7) THEN
      msg := format('Agreement %s: the return date has passed by %s day(s). Please confirm the return or record an extension.',
                    r.agreement_no, days);
    END IF;

    IF msg IS NOT NULL THEN
      PERFORM public.notify_asset_movement(r.id, 'SYSTEM_NOTIFICATION', 'Asset return reminder', msg);
    END IF;
  END LOOP;
  RETURN flagged;
END; $$;

REVOKE EXECUTE ON FUNCTION public.asset_movement_recipients(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.notify_asset_movement(uuid, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.flag_overdue_asset_movements() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.notify_asset_movement(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.flag_overdue_asset_movements() TO authenticated;
