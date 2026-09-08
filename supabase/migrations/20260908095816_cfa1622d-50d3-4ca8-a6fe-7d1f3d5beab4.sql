
-- Allow admins/Senior Pastors to reassign a member's branch on profiles
CREATE OR REPLACE FUNCTION public.enforce_branch_ownership()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
  mine text;
  new_branch text;
  old_branch text;
BEGIN
  IF uid IS NULL THEN RETURN NEW; END IF;
  IF public.is_head_office(uid) THEN RETURN NEW; END IF;
  IF TG_TABLE_NAME = 'profiles' AND public.is_admin(uid) THEN RETURN NEW; END IF;

  SELECT branch::text INTO mine FROM public.profiles WHERE id = uid;
  new_branch := to_jsonb(NEW) ->> 'branch';

  IF TG_OP = 'INSERT' THEN
    IF mine IS NOT NULL AND (new_branch IS DISTINCT FROM mine) THEN
      NEW := jsonb_populate_record(NEW, jsonb_build_object('branch', mine));
    END IF;
    RETURN NEW;
  END IF;

  old_branch := to_jsonb(OLD) ->> 'branch';
  IF new_branch IS DISTINCT FROM old_branch THEN
    RAISE EXCEPTION 'Branch ownership cannot be changed (% -> %)', old_branch, new_branch
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

-- Audit trail for sensitive actions
CREATE OR REPLACE FUNCTION public.audit_sensitive_change()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  rec jsonb := to_jsonb(COALESCE(NEW, OLD));
BEGIN
  INSERT INTO public.audit_log (actor_id, action, entity, entity_id, details)
  VALUES (
    auth.uid(),
    lower(TG_OP),
    TG_TABLE_NAME,
    rec ->> 'id',
    jsonb_build_object(
      'branch', rec ->> 'branch',
      'cross_branch', (auth.uid() IS NOT NULL
                       AND public.is_head_office(auth.uid())
                       AND (rec ->> 'branch') IS DISTINCT FROM public.my_branch()::text),
      'at', now()
    )
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

DO $do$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'profiles','user_roles','finance_entries','purchase_requests','budgets',
    'expense_claims','events','documents'
  ] LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename=t) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_sensitive ON public.%I', t);
      EXECUTE format(
        'CREATE TRIGGER trg_audit_sensitive AFTER INSERT OR UPDATE OR DELETE ON public.%I
           FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_change()', t);
    END IF;
  END LOOP;
END
$do$;

DROP POLICY IF EXISTS "Leadership can read audit log" ON public.audit_log;
CREATE POLICY "Leadership can read audit log" ON public.audit_log
  FOR SELECT TO authenticated
  USING (
    public.is_head_office(auth.uid())
    OR public.has_role(auth.uid(), 'chairperson')
    OR public.has_role(auth.uid(), 'secretary')
  );
