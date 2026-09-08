
-- 1. Branch reference table -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code public.branch NOT NULL UNIQUE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.branches TO authenticated;
GRANT ALL ON public.branches TO service_role;

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read branches" ON public.branches;
CREATE POLICY "Authenticated can read branches" ON public.branches
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Senior pastors manage branches" ON public.branches;
CREATE POLICY "Senior pastors manage branches" ON public.branches
  FOR ALL TO authenticated
  USING (public.is_head_office(auth.uid()))
  WITH CHECK (public.is_head_office(auth.uid()));

INSERT INTO public.branches (code, name) VALUES
  ('etwatwa', 'Etwatwa'),
  ('joburg_north', 'Joburg North'),
  ('joburg_south', 'Joburg South')
ON CONFLICT (code) DO NOTHING;

-- 2. Secure helpers ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.my_branch()
RETURNS public.branch
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT branch FROM public.profiles WHERE id = auth.uid() $$;

CREATE OR REPLACE FUNCTION public.same_branch_or_admin(_branch text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT public.is_head_office(auth.uid())
     OR (_branch IS NOT NULL
         AND EXISTS (SELECT 1 FROM public.profiles p
                     WHERE p.id = auth.uid() AND p.branch::text = _branch));
$$;

REVOKE ALL ON FUNCTION public.my_branch() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_branch() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.same_branch_or_admin(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.same_branch_or_admin(text) TO authenticated, service_role;

-- 3. Branch ownership trigger ----------------------------------------------
-- Forces the branch of new rows to the creator's own branch and blocks any
-- attempt to move a row to a different branch. Senior Pastors are exempt.
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
  -- Trusted server-side / migration contexts have no JWT: leave untouched.
  IF uid IS NULL THEN RETURN NEW; END IF;
  IF public.is_head_office(uid) THEN RETURN NEW; END IF;

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

-- 4. Apply isolation policy + trigger to every branch-bearing table ---------
DO $do$
DECLARE
  t record;
  extra_using text;
BEGIN
  FOR t IN
    SELECT c.table_name
    FROM information_schema.columns c
    JOIN pg_tables pt ON pt.tablename = c.table_name AND pt.schemaname = 'public'
    WHERE c.table_schema = 'public' AND c.column_name = 'branch'
  LOOP
    extra_using := CASE WHEN t.table_name = 'profiles' THEN ' OR id = auth.uid()' ELSE '' END;

    EXECUTE format('DROP POLICY IF EXISTS branch_isolation ON public.%I', t.table_name);
    EXECUTE format($f$
      CREATE POLICY branch_isolation ON public.%I
        AS RESTRICTIVE FOR ALL TO authenticated
        USING (
          public.is_head_office(auth.uid())
          OR branch IS NULL
          OR branch::text = public.my_branch()::text
          %s
        )
        WITH CHECK (
          public.is_head_office(auth.uid())
          OR branch::text = public.my_branch()::text
          OR (branch IS NULL AND public.my_branch() IS NULL)
          %s
        )
    $f$, t.table_name, extra_using, extra_using);

    EXECUTE format('DROP TRIGGER IF EXISTS trg_enforce_branch_ownership ON public.%I', t.table_name);
    EXECUTE format($f$
      CREATE TRIGGER trg_enforce_branch_ownership
        BEFORE INSERT OR UPDATE ON public.%I
        FOR EACH ROW EXECUTE FUNCTION public.enforce_branch_ownership()
    $f$, t.table_name);
  END LOOP;
END
$do$;

-- 5. Shared views must run with the caller's permissions, not the owner's ---
DO $do$
DECLARE v record;
BEGIN
  FOR v IN
    SELECT DISTINCT c.table_name
    FROM information_schema.columns c
    JOIN pg_views pv ON pv.viewname = c.table_name AND pv.schemaname = 'public'
    WHERE c.table_schema = 'public' AND c.column_name = 'branch'
  LOOP
    EXECUTE format('ALTER VIEW public.%I SET (security_invoker = true)', v.table_name);
  END LOOP;
END
$do$;
