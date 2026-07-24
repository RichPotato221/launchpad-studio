CREATE OR REPLACE FUNCTION public.can_view_profile(_viewer uuid, _target uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    _viewer = _target
    OR public.is_admin(_viewer)
    OR EXISTS (
      SELECT 1
      FROM public.profiles v
      JOIN public.profiles t ON t.id = _target
      WHERE v.id = _viewer
        AND v.approval_status = 'approved'
        AND t.approval_status = 'approved'
    );
$function$;