
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_event_type_check;

-- ============ PROCESS ORDERS ============
CREATE TABLE public.process_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number text UNIQUE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  po_type text NOT NULL DEFAULT 'EVT' CHECK (po_type IN ('SUN','EVT')),
  title text NOT NULL,
  theme text,
  venue text,
  expected_attendance integer,
  preacher text,
  worship_leader text,
  owner_id uuid,
  coordinator_id uuid,
  lead_pastor_id uuid,
  associate_pastor_id uuid,
  branch public.branch,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','PLANNED','APPROVED','RELEASED','IN_PREPARATION','READY','RUNNING','PENDING_CLOSURE','CLOSED','ON_HOLD','CANCELLED','OVERDUE')),
  readiness_pct numeric NOT NULL DEFAULT 0,
  starts_at timestamptz,
  ends_at timestamptz,
  approved_by uuid,
  approved_at timestamptz,
  released_by uuid,
  released_at timestamptz,
  running_at timestamptz,
  closed_by uuid,
  closed_at timestamptz,
  closure_notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_po_event ON public.process_orders(event_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.process_orders TO authenticated;
GRANT ALL ON public.process_orders TO service_role;
ALTER TABLE public.process_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "po_read" ON public.process_orders FOR SELECT TO authenticated USING (public.is_approved_member(auth.uid()));
CREATE POLICY "po_write" ON public.process_orders FOR INSERT TO authenticated WITH CHECK (public.is_approved_member(auth.uid()));
CREATE POLICY "po_update" ON public.process_orders FOR UPDATE TO authenticated USING (public.is_approved_member(auth.uid()));
CREATE POLICY "po_delete" ON public.process_orders FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'chairperson') OR public.has_role(auth.uid(),'senior_apostle'));

CREATE TABLE public.process_order_departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_order_id uuid NOT NULL REFERENCES public.process_orders(id) ON DELETE CASCADE,
  department_slug text NOT NULL,
  workstream_code text,
  lead_id uuid,
  status text NOT NULL DEFAULT 'NOT_STARTED' CHECK (status IN ('NOT_STARTED','READY','RUNNING','COMPLETE','BLOCKED','OVERDUE')),
  readiness_pct numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (process_order_id, department_slug)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.process_order_departments TO authenticated;
GRANT ALL ON public.process_order_departments TO service_role;
ALTER TABLE public.process_order_departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pod_read" ON public.process_order_departments FOR SELECT TO authenticated USING (public.is_approved_member(auth.uid()));
CREATE POLICY "pod_all" ON public.process_order_departments FOR ALL TO authenticated USING (public.is_approved_member(auth.uid())) WITH CHECK (public.is_approved_member(auth.uid()));

CREATE TABLE public.process_order_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_order_id uuid NOT NULL REFERENCES public.process_orders(id) ON DELETE CASCADE,
  activity_code text,
  name text NOT NULL,
  description text,
  department_slug text,
  responsible_id uuid,
  supporting_team text,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  criticality text NOT NULL DEFAULT 'STANDARD' CHECK (criticality IN ('CRITICAL','MAJOR','STANDARD')),
  starts_at timestamptz,
  due_at timestamptz,
  status text NOT NULL DEFAULT 'NOT_STARTED' CHECK (status IN ('NOT_STARTED','READY','IN_PROGRESS','COMPLETED','BLOCKED','OVERDUE','WAIVED','CANCELLED')),
  completion_pct numeric NOT NULL DEFAULT 0,
  depends_on uuid REFERENCES public.process_order_activities(id) ON DELETE SET NULL,
  required_resource text,
  evidence_required boolean NOT NULL DEFAULT false,
  approval_required boolean NOT NULL DEFAULT false,
  notes text,
  exception_note text,
  sort_order integer NOT NULL DEFAULT 0,
  completed_by uuid,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_poa_po ON public.process_order_activities(process_order_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.process_order_activities TO authenticated;
GRANT ALL ON public.process_order_activities TO service_role;
ALTER TABLE public.process_order_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "poa_read" ON public.process_order_activities FOR SELECT TO authenticated USING (public.is_approved_member(auth.uid()));
CREATE POLICY "poa_all" ON public.process_order_activities FOR ALL TO authenticated USING (public.is_approved_member(auth.uid())) WITH CHECK (public.is_approved_member(auth.uid()));

CREATE TABLE public.process_order_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_order_id uuid NOT NULL REFERENCES public.process_orders(id) ON DELETE CASCADE,
  activity_id uuid REFERENCES public.process_order_activities(id) ON DELETE SET NULL,
  department_slug text,
  description text NOT NULL,
  severity text NOT NULL DEFAULT 'MEDIUM' CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  impact text,
  responsible_id uuid,
  immediate_action text,
  escalated_to text,
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','IN_PROGRESS','RESOLVED','CLOSED')),
  resolution text,
  resolved_by uuid,
  resolved_at timestamptz,
  raised_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.process_order_exceptions TO authenticated;
GRANT ALL ON public.process_order_exceptions TO service_role;
ALTER TABLE public.process_order_exceptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "poe_read" ON public.process_order_exceptions FOR SELECT TO authenticated USING (public.is_approved_member(auth.uid()));
CREATE POLICY "poe_all" ON public.process_order_exceptions FOR ALL TO authenticated USING (public.is_approved_member(auth.uid())) WITH CHECK (public.is_approved_member(auth.uid()));

CREATE TABLE public.process_order_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_order_id uuid NOT NULL REFERENCES public.process_orders(id) ON DELETE CASCADE,
  title text NOT NULL,
  doc_type text,
  file_url text NOT NULL,
  file_name text,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.process_order_documents TO authenticated;
GRANT ALL ON public.process_order_documents TO service_role;
ALTER TABLE public.process_order_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pdoc_read" ON public.process_order_documents FOR SELECT TO authenticated USING (public.is_approved_member(auth.uid()));
CREATE POLICY "pdoc_all" ON public.process_order_documents FOR ALL TO authenticated USING (public.is_approved_member(auth.uid())) WITH CHECK (public.is_approved_member(auth.uid()));

CREATE TABLE public.process_order_closure_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_order_id uuid NOT NULL REFERENCES public.process_orders(id) ON DELETE CASCADE,
  category text NOT NULL,
  label text NOT NULL,
  is_done boolean NOT NULL DEFAULT false,
  notes text,
  checked_by uuid,
  checked_at timestamptz,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.process_order_closure_checks TO authenticated;
GRANT ALL ON public.process_order_closure_checks TO service_role;
ALTER TABLE public.process_order_closure_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pcc_read" ON public.process_order_closure_checks FOR SELECT TO authenticated USING (public.is_approved_member(auth.uid()));
CREATE POLICY "pcc_all" ON public.process_order_closure_checks FOR ALL TO authenticated USING (public.is_approved_member(auth.uid())) WITH CHECK (public.is_approved_member(auth.uid()));

CREATE TABLE public.process_order_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_order_id uuid NOT NULL REFERENCES public.process_orders(id) ON DELETE CASCADE,
  actor_id uuid,
  actor_name text,
  action text NOT NULL,
  entity text,
  entity_id text,
  previous_status text,
  new_status text,
  reason text,
  comments text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_poaudit_po ON public.process_order_audit(process_order_id);
GRANT SELECT, INSERT ON public.process_order_audit TO authenticated;
GRANT ALL ON public.process_order_audit TO service_role;
ALTER TABLE public.process_order_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "poaudit_read" ON public.process_order_audit FOR SELECT TO authenticated USING (public.is_approved_member(auth.uid()));
CREATE POLICY "poaudit_insert" ON public.process_order_audit FOR INSERT TO authenticated WITH CHECK (public.is_approved_member(auth.uid()));

CREATE TABLE public.process_order_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  po_type text NOT NULL DEFAULT 'EVT',
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.process_order_templates TO authenticated;
GRANT ALL ON public.process_order_templates TO service_role;
ALTER TABLE public.process_order_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pot_read" ON public.process_order_templates FOR SELECT TO authenticated USING (public.is_approved_member(auth.uid()));

CREATE TABLE public.process_order_template_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.process_order_templates(id) ON DELETE CASCADE,
  department_slug text NOT NULL,
  name text NOT NULL,
  criticality text NOT NULL DEFAULT 'STANDARD',
  sort_order integer NOT NULL DEFAULT 0,
  offset_hours integer NOT NULL DEFAULT 24
);
GRANT SELECT ON public.process_order_template_activities TO authenticated;
GRANT ALL ON public.process_order_template_activities TO service_role;
ALTER TABLE public.process_order_template_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pota_read" ON public.process_order_template_activities FOR SELECT TO authenticated USING (public.is_approved_member(auth.uid()));

-- PO number generator
CREATE OR REPLACE FUNCTION public.set_process_order_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE n integer;
BEGIN
  IF NEW.po_number IS NULL THEN
    SELECT COUNT(*) + 1 INTO n FROM public.process_orders
      WHERE po_type = NEW.po_type
        AND date_part('year', created_at) = date_part('year', now());
    NEW.po_number := 'TROG-PO-' || to_char(now(), 'YYYY') || '-' || NEW.po_type || '-' || lpad(n::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_po_number BEFORE INSERT ON public.process_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_process_order_number();

CREATE TRIGGER trg_po_updated BEFORE UPDATE ON public.process_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_poa_updated BEFORE UPDATE ON public.process_order_activities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_pod_updated BEFORE UPDATE ON public.process_order_departments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_poe_updated BEFORE UPDATE ON public.process_order_exceptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed templates
INSERT INTO public.process_order_templates (code, name, po_type, description) VALUES
  ('SUNDAY_SERVICE', 'Sunday Service Process Order Template', 'SUN', 'Standard readiness activities for a Sunday worship service.'),
  ('SPECIAL_EVENT', 'Special Event Process Order Template', 'EVT', 'Standard readiness activities for conferences, outreaches and special services.');

INSERT INTO public.process_order_template_activities (template_id, department_slug, name, criticality, sort_order, offset_hours)
SELECT t.id, v.dept, v.name, v.crit, v.ord, v.off
FROM public.process_order_templates t,
(VALUES
 ('leadership','Service programme approved','CRITICAL',1,72),
 ('leadership','Leadership briefing completed','MAJOR',2,24),
 ('leadership','Preacher confirmed','CRITICAL',3,96),
 ('leadership','Service coordinator assigned','MAJOR',4,96),
 ('worship','Worship set prepared','CRITICAL',5,72),
 ('worship','Worship team roster confirmed','CRITICAL',6,72),
 ('worship','Rehearsal completed','CRITICAL',7,24),
 ('worship','Service transitions reviewed','STANDARD',8,12),
 ('sound-technical','Technical equipment checked','CRITICAL',9,12),
 ('sound-technical','Microphones checked','CRITICAL',10,3),
 ('sound-technical','Sound check completed','CRITICAL',11,2),
 ('sound-technical','Backup equipment confirmed','MAJOR',12,12),
 ('ushers','Usher roster completed','CRITICAL',13,48),
 ('ushers','Seating prepared','MAJOR',14,2),
 ('ushers','Visitor process prepared','STANDARD',15,12),
 ('ushers','Safety readiness check completed','CRITICAL',16,2),
 ('hospitality','Hospitality requirements confirmed','MAJOR',17,48),
 ('hospitality','Refreshments prepared where applicable','STANDARD',18,3),
 ('hospitality','Guest hospitality prepared','STANDARD',19,3),
 ('hospitality','Hospitality area prepared','STANDARD',20,2),
 ('childrens-ministry','Teachers assigned','CRITICAL',21,48),
 ('childrens-ministry','Classes prepared','MAJOR',22,24),
 ('childrens-ministry','Safeguarding requirements confirmed','CRITICAL',23,24),
 ('childrens-ministry','Classroom readiness completed','MAJOR',24,2),
 ('prayer-intercession','Prayer preparation completed','MAJOR',25,24),
 ('prayer-intercession','Intercession team assigned','MAJOR',26,48),
 ('prayer-intercession','Service prayer coverage confirmed','CRITICAL',27,3),
 ('media','Service graphics prepared','MAJOR',28,24),
 ('media','Cameras/equipment prepared','MAJOR',29,3),
 ('media','Recording requirements confirmed','STANDARD',30,12),
 ('media','Communication materials prepared','STANDARD',31,48),
 ('finance','Offering process prepared','CRITICAL',32,12),
 ('finance','Financial requirements confirmed','MAJOR',33,48),
 ('finance','Approved event expenses monitored','STANDARD',34,12),
 ('resource-administrator','Venue readiness checked','CRITICAL',35,12),
 ('resource-administrator','Facilities inspected','MAJOR',36,12),
 ('resource-administrator','Required equipment/resources available','CRITICAL',37,24)
) AS v(dept,name,crit,ord,off)
WHERE t.code = 'SUNDAY_SERVICE';

INSERT INTO public.process_order_template_activities (template_id, department_slug, name, criticality, sort_order, offset_hours)
SELECT t.id, v.dept, v.name, v.crit, v.ord, v.off
FROM public.process_order_templates t,
(VALUES
 ('leadership','Event plan approved','CRITICAL',1,336),
 ('leadership','Programme approved','CRITICAL',2,168),
 ('leadership','Speakers confirmed','CRITICAL',3,168),
 ('leadership','Registration process prepared','MAJOR',4,168),
 ('resource-administrator','Venue secured and prepared','CRITICAL',5,168),
 ('resource-administrator','Transportation arranged','MAJOR',6,72),
 ('resource-administrator','Security arrangements confirmed','CRITICAL',7,72),
 ('sound-technical','Technical plan and sound prepared','CRITICAL',8,24),
 ('media','Media coverage and marketing prepared','MAJOR',9,168),
 ('hospitality','Hospitality and guest management prepared','MAJOR',10,72),
 ('childrens-ministry','Children''s programme prepared','MAJOR',11,72),
 ('finance','Event budget approved','CRITICAL',12,336),
 ('finance','Event expenses recorded','MAJOR',13,24),
 ('prayer-intercession','Prayer covering arranged','MAJOR',14,72),
 ('leadership','Follow-up process prepared','STANDARD',15,24),
 ('leadership','Post-event report submitted','MAJOR',16,24)
) AS v(dept,name,crit,ord,off)
WHERE t.code = 'SPECIAL_EVENT';
