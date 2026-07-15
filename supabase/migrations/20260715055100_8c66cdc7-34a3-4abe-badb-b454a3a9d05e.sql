
-- Enums
CREATE TYPE public.app_role AS ENUM (
  'senior_apostle','chairperson','secretary','lead_pastor',
  'associate_pastor','department_chair','team_member'
);
CREATE TYPE public.kpi_category AS ENUM (
  'spiritual_impact','people_development','operational_excellence',
  'stewardship','kingdom_influence'
);
CREATE TYPE public.kpi_period AS ENUM ('weekly','monthly','quarterly','annual');
CREATE TYPE public.dept_kind AS ENUM ('functional','developmental','seven_mountain','five_fold');

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  bio TEXT,
  primary_department TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- USER ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  department_slug TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role, department_slug)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role helper
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('senior_apostle','secretary','chairperson')
  );
$$;

CREATE OR REPLACE FUNCTION public.user_dept_slugs(_user_id UUID)
RETURNS SETOF TEXT LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT department_slug FROM public.user_roles
  WHERE user_id = _user_id AND department_slug IS NOT NULL;
$$;

-- DEPARTMENTS
CREATE TABLE public.departments (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  kind public.dept_kind NOT NULL,
  parent_slug TEXT REFERENCES public.departments(slug) ON DELETE SET NULL,
  scripture TEXT,
  vision TEXT,
  mission TEXT,
  purpose TEXT,
  functions TEXT[],
  chair_name TEXT,
  overseer_name TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.departments TO authenticated;
GRANT ALL ON public.departments TO service_role;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read departments" ON public.departments
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write departments" ON public.departments
  FOR ALL TO authenticated USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- PROFILES POLICIES
CREATE POLICY "auth read profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "own profile update" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "admin manage profiles" ON public.profiles
  FOR ALL TO authenticated USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- USER_ROLES POLICIES
CREATE POLICY "read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "admin manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- KPIS
CREATE TABLE public.kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_slug TEXT NOT NULL REFERENCES public.departments(slug) ON DELETE CASCADE,
  category public.kpi_category NOT NULL,
  kpi_name TEXT NOT NULL,
  baseline NUMERIC,
  target NUMERIC,
  actual NUMERIC,
  period_type public.kpi_period NOT NULL,
  period_date DATE NOT NULL,
  notes TEXT,
  entered_by UUID REFERENCES auth.users(id),
  entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_kpis_dept ON public.kpis(department_slug);
CREATE INDEX idx_kpis_period ON public.kpis(period_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kpis TO authenticated;
GRANT ALL ON public.kpis TO service_role;
ALTER TABLE public.kpis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read kpis" ON public.kpis
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "dept write kpis" ON public.kpis
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()) OR department_slug IN (SELECT public.user_dept_slugs(auth.uid())));
CREATE POLICY "dept update kpis" ON public.kpis
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()) OR department_slug IN (SELECT public.user_dept_slugs(auth.uid())))
  WITH CHECK (public.is_admin(auth.uid()) OR department_slug IN (SELECT public.user_dept_slugs(auth.uid())));
CREATE POLICY "admin delete kpis" ON public.kpis
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- AUDIT LOG
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity TEXT,
  entity_id TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read audit" ON public.audit_log
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "auth insert audit" ON public.audit_log
  FOR INSERT TO authenticated WITH CHECK (actor_id = auth.uid());

-- SETTINGS (theme of year, founding date, senior pastor bio)
CREATE TABLE public.settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);
GRANT SELECT ON public.settings TO authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read settings" ON public.settings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write settings" ON public.settings
  FOR ALL TO authenticated USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'team_member');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_departments_updated BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_kpis_updated BEFORE UPDATE ON public.kpis
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
