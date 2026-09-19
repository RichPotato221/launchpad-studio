CREATE OR REPLACE FUNCTION public.get_sunday_rsvp_status(_service_date date)
 RETURNS TABLE(user_id uuid, full_name text, branch branch, response text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT sr.user_id, p.full_name, sr.branch, sr.response
  FROM public.sunday_rsvps sr
  JOIN public.profiles p ON p.id = sr.user_id
  WHERE sr.service_date = _service_date
    AND (
      public.has_role(auth.uid(), 'senior_apostle')
      OR sr.branch IS NOT DISTINCT FROM public.my_branch()
    )
  ORDER BY p.full_name;
$function$;