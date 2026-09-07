ALTER TABLE public.announcements DISABLE TRIGGER USER;

INSERT INTO public.announcements (title, body, author_id, author_department_slug, priority, target_branch, created_at)
SELECT
  'Agenda published — ' || e.title,
  'The agenda for ' || e.title || ' has been approved and published by the Secretariat.' || E'\n' ||
  to_char(e.event_date, 'DD Mon YYYY') || COALESCE(' · ' || to_char(e.start_time, 'HH24:MI'), '') || COALESCE(' · ' || e.location, '') ||
  COALESCE(E'\n\nAgenda:\n' || (
    SELECT string_agg(i.order_index || '. ' || i.title, E'\n' ORDER BY i.order_index)
    FROM public.agenda_items i WHERE i.agenda_id = a.id
  ), ''),
  COALESCE(a.approved_by, a.created_by, m.secretary_id, m.created_by, e.created_by),
  'secretary',
  false,
  CASE
    WHEN e.branch::text IN ('etwatwa', 'twatwa') THEN 'twatwa'
    WHEN e.branch::text = 'joburg_north' THEN 'joburg_north'
    WHEN e.branch::text = 'joburg_south' THEN 'joburg_south'
    ELSE 'all'
  END::public.post_branch_target,
  COALESCE(a.published_at, now())
FROM public.agendas a
JOIN public.meetings m ON m.id = a.meeting_id
JOIN public.events e ON e.id = m.event_id
WHERE a.status = 'published'
  AND COALESCE(a.approved_by, a.created_by, m.secretary_id, m.created_by, e.created_by) IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.announcements x WHERE x.title = 'Agenda published — ' || e.title
  );

ALTER TABLE public.announcements ENABLE TRIGGER USER;