CREATE SEQUENCE IF NOT EXISTS public.governance_decision_seq;
CREATE SEQUENCE IF NOT EXISTS public.governance_risk_seq;

CREATE TABLE public.governance_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_number text UNIQUE,
  category text NOT NULL DEFAULT 'leadership',
  title text NOT NULL,
  detail text,
  meeting_id uuid REFERENCES public.meetings(id) ON DELETE SET NULL,
  decision_date date NOT NULL DEFAULT current_date,
  owner_id uuid REFERENCES public.profiles(id),
  department_slug text,
  branch public.branch,
  priority text NOT NULL DEFAULT 'normal',
  due_date date,
  status text NOT NULL DEFAULT 'open',
  implementation_pct integer NOT NULL DEFAULT 0,
  evidence text,
  document_url text,
  completion_date date,
  ai_summary text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT gd_category_check CHECK (category IN ('leadership','council','board','committee','directive')),
  CONSTRAINT gd_status_check CHECK (status IN ('open','in_progress','implemented','overdue','cancelled')),
  CONSTRAINT gd_pct_check CHECK (implementation_pct BETWEEN 0 AND 100)
);

CREATE TABLE public.governance_risks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_number text UNIQUE,
  category text NOT NULL DEFAULT 'operational',
  description text NOT NULL,
  likelihood integer NOT NULL DEFAULT 3,
  impact integer NOT NULL DEFAULT 3,
  rating integer GENERATED ALWAYS AS (likelihood * impact) STORED,
  mitigation text,
  owner_id uuid REFERENCES public.profiles(id),
  department_slug text,
  branch public.branch,
  review_date date,
  status text NOT NULL DEFAULT 'open',
  escalation_level text NOT NULL DEFAULT 'department',
  closed_at timestamptz,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT gr_likelihood_check CHECK (likelihood BETWEEN 1 AND 5),
  CONSTRAINT gr_impact_check CHECK (impact BETWEEN 1 AND 5),
  CONSTRAINT gr_status_check CHECK (status IN ('open','mitigating','monitoring','closed')),
  CONSTRAINT gr_escalation_check CHECK (escalation_level IN ('department','branch','executive','council'))
);

CREATE TABLE public.governance_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type text NOT NULL,
  title text NOT NULL,
  detail text,
  reference text,
  department_slug text,
  branch public.branch,
  document_url text,
  amount numeric,
  submitted_by uuid DEFAULT auth.uid(),
  status text NOT NULL DEFAULT 'pending',
  decided_by uuid REFERENCES public.profiles(id),
  decided_at timestamptz,
  decision_comment text,
  signature_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ga_status_check CHECK (status IN ('pending','approved','rejected','withdrawn'))
);

CREATE INDEX governance_decisions_status_idx ON public.governance_decisions (status, due_date);
CREATE INDEX governance_risks_status_idx ON public.governance_risks (status, rating DESC);
CREATE INDEX governance_approvals_status_idx ON public.governance_approvals (status, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.governance_decisions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.governance_risks TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.governance_approvals TO authenticated;
GRANT ALL ON public.governance_decisions, public.governance_risks, public.governance_approvals TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.governance_decision_seq, public.governance_risk_seq TO authenticated, service_role;

ALTER TABLE public.governance_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.governance_risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.governance_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gd read" ON public.governance_decisions FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()) OR owner_id = auth.uid() OR public.gov_can_access_department(auth.uid(), department_slug));
CREATE POLICY "gd insert" ON public.governance_decisions FOR INSERT TO authenticated
WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "gd update" ON public.governance_decisions FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()) OR owner_id = auth.uid())
WITH CHECK (public.is_admin(auth.uid()) OR owner_id = auth.uid());

CREATE POLICY "gr read" ON public.governance_risks FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()) OR owner_id = auth.uid() OR public.gov_can_access_department(auth.uid(), department_slug));
CREATE POLICY "gr insert" ON public.governance_risks FOR INSERT TO authenticated
WITH CHECK (public.is_admin(auth.uid()) OR public.gov_can_access_department(auth.uid(), department_slug));
CREATE POLICY "gr update" ON public.governance_risks FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()) OR owner_id = auth.uid())
WITH CHECK (public.is_admin(auth.uid()) OR owner_id = auth.uid());

CREATE POLICY "ga read" ON public.governance_approvals FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()) OR submitted_by = auth.uid() OR public.gov_can_access_department(auth.uid(), department_slug));
CREATE POLICY "ga insert" ON public.governance_approvals FOR INSERT TO authenticated
WITH CHECK (submitted_by = auth.uid());
CREATE POLICY "ga update" ON public.governance_approvals FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()) OR submitted_by = auth.uid())
WITH CHECK (public.is_admin(auth.uid()) OR submitted_by = auth.uid());

CREATE OR REPLACE FUNCTION public.set_governance_numbers()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_TABLE_NAME = 'governance_decisions' AND NEW.decision_number IS NULL THEN
    NEW.decision_number := 'DEC-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.governance_decision_seq')::text, 6, '0');
  ELSIF TG_TABLE_NAME = 'governance_risks' AND NEW.risk_number IS NULL THEN
    NEW.risk_number := 'RSK-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.governance_risk_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER gd_number BEFORE INSERT ON public.governance_decisions
FOR EACH ROW EXECUTE FUNCTION public.set_governance_numbers();
CREATE TRIGGER gr_number BEFORE INSERT ON public.governance_risks
FOR EACH ROW EXECUTE FUNCTION public.set_governance_numbers();

CREATE TRIGGER gd_updated_at BEFORE UPDATE ON public.governance_decisions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER gr_updated_at BEFORE UPDATE ON public.governance_risks
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER ga_updated_at BEFORE UPDATE ON public.governance_approvals
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER gd_audit AFTER INSERT OR UPDATE OR DELETE ON public.governance_decisions
FOR EACH ROW EXECUTE FUNCTION public.gov_log_audit_event();
CREATE TRIGGER gr_audit AFTER INSERT OR UPDATE OR DELETE ON public.governance_risks
FOR EACH ROW EXECUTE FUNCTION public.gov_log_audit_event();
CREATE TRIGGER ga_audit AFTER INSERT OR UPDATE OR DELETE ON public.governance_approvals
FOR EACH ROW EXECUTE FUNCTION public.gov_log_audit_event();

CREATE OR REPLACE FUNCTION public.get_department_oversight()
RETURNS TABLE(
  department_slug text,
  department_name text,
  kind text,
  kpi_avg_pct numeric,
  kpi_count bigint,
  open_tasks bigint,
  overdue_tasks bigint,
  reports_90d bigint,
  open_risks bigint,
  critical_risks bigint,
  open_compliance bigint,
  open_decisions bigint,
  members bigint,
  last_activity timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  WITH latest_kpi AS (
    SELECT DISTINCT ON (department_slug, kpi_name) department_slug, kpi_name, actual, target
    FROM public.kpis
    WHERE actual IS NOT NULL AND target IS NOT NULL AND target > 0
      AND period_date >= current_date - interval '120 days'
    ORDER BY department_slug, kpi_name, period_date DESC
  )
  SELECT
    d.slug,
    d.name,
    d.kind::text,
    (SELECT round(avg((k.actual / k.target) * 100), 1) FROM latest_kpi k WHERE k.department_slug = d.slug),
    (SELECT count(*) FROM latest_kpi k WHERE k.department_slug = d.slug),
    (SELECT count(*) FROM public.tasks t WHERE t.department_slug = d.slug AND t.status NOT IN ('done','completed','cancelled')),
    (SELECT count(*) FROM public.tasks t WHERE t.department_slug = d.slug AND t.status NOT IN ('done','completed','cancelled') AND t.due_date < current_date),
    (SELECT count(*) FROM public.report_entries r WHERE r.department_slug = d.slug AND r.created_at >= now() - interval '90 days'),
    (SELECT count(*) FROM public.governance_risks g WHERE g.department_slug = d.slug AND g.status <> 'closed'),
    (SELECT count(*) FROM public.governance_risks g WHERE g.department_slug = d.slug AND g.status <> 'closed' AND g.rating >= 15),
    (SELECT count(*) FROM public.compliance_items c WHERE c.department_slug = d.slug AND c.status IN ('open','in_progress','overdue')),
    (SELECT count(*) FROM public.governance_decisions gd WHERE gd.department_slug = d.slug AND gd.status IN ('open','in_progress','overdue')),
    (SELECT count(*) FROM public.profiles p WHERE p.primary_department = d.slug AND p.approval_status = 'approved'),
    GREATEST(
      (SELECT max(t.created_at) FROM public.tasks t WHERE t.department_slug = d.slug),
      (SELECT max(r.created_at) FROM public.report_entries r WHERE r.department_slug = d.slug),
      (SELECT max(k.period_date)::timestamptz FROM public.kpis k WHERE k.department_slug = d.slug)
    )
  FROM public.departments d
  WHERE public.is_admin(auth.uid())
  ORDER BY d.name;
$$;

REVOKE EXECUTE ON FUNCTION public.get_department_oversight() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_department_oversight() TO authenticated;