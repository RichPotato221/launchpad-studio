
-- ============ ASSET REGISTER EXTENSIONS ============
CREATE SEQUENCE IF NOT EXISTS public.asset_ref_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.movement_no_seq START 1;

ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS asset_ref text,
  ADD COLUMN IF NOT EXISTS home_branch public.branch,
  ADD COLUMN IF NOT EXISTS current_branch public.branch,
  ADD COLUMN IF NOT EXISTS current_custodian_id uuid,
  ADD COLUMN IF NOT EXISTS movement_status text NOT NULL DEFAULT 'AVAILABLE',
  ADD COLUMN IF NOT EXISTS subcategory text,
  ADD COLUMN IF NOT EXISTS acquisition_method text,
  ADD COLUMN IF NOT EXISTS accessories text,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_by uuid;

CREATE UNIQUE INDEX IF NOT EXISTS assets_asset_ref_key ON public.assets(asset_ref);
CREATE UNIQUE INDEX IF NOT EXISTS assets_qr_token_key ON public.assets(qr_token);

CREATE OR REPLACE FUNCTION public.set_asset_ref()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.asset_ref IS NULL THEN
    NEW.asset_ref := 'TRG-ASSET-' || lpad(nextval('public.asset_ref_seq')::text, 6, '0');
  END IF;
  IF NEW.home_branch IS NULL THEN NEW.home_branch := NEW.branch; END IF;
  IF NEW.current_branch IS NULL THEN NEW.current_branch := COALESCE(NEW.branch, NEW.home_branch); END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_set_asset_ref ON public.assets;
CREATE TRIGGER trg_set_asset_ref BEFORE INSERT ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.set_asset_ref();

UPDATE public.assets
   SET asset_ref = COALESCE(asset_ref, 'TRG-ASSET-' || lpad(nextval('public.asset_ref_seq')::text, 6, '0')),
       home_branch = COALESCE(home_branch, branch),
       current_branch = COALESCE(current_branch, branch)
 WHERE asset_ref IS NULL OR home_branch IS NULL OR current_branch IS NULL;

-- ============ MOVEMENT AGREEMENTS ============
CREATE TABLE IF NOT EXISTS public.asset_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_no text UNIQUE,
  movement_type text NOT NULL DEFAULT 'temporary_loan',
  status text NOT NULL DEFAULT 'DRAFT',
  source_branch public.branch,
  destination_branch public.branch,
  destination_location text,
  purpose text,
  purpose_notes text,
  department_slug text,
  requested_by uuid,
  responsible_person uuid,
  responsible_name text,
  dispatch_date date,
  expected_return_date date,
  original_return_date date,
  actual_return_date date,
  transport_details text,
  driver_name text,
  vehicle_details text,
  event_name text,
  event_location text,
  event_start date,
  event_end date,
  is_emergency boolean NOT NULL DEFAULT false,
  emergency_reason text,
  notes text,
  overdue boolean NOT NULL DEFAULT false,
  closed_at timestamptz,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.asset_movement_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movement_id uuid NOT NULL REFERENCES public.asset_movements(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE RESTRICT,
  quantity integer NOT NULL DEFAULT 1,
  accessories text,
  condition_before text,
  condition_after text,
  dispatched boolean NOT NULL DEFAULT false,
  received boolean NOT NULL DEFAULT false,
  returned boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (movement_id, asset_id)
);

CREATE TABLE IF NOT EXISTS public.asset_movement_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movement_id uuid NOT NULL REFERENCES public.asset_movements(id) ON DELETE CASCADE,
  decision text NOT NULL,
  decided_by uuid NOT NULL,
  decided_by_role text,
  decided_by_branch public.branch,
  comment text,
  retrospective boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.asset_handover_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movement_id uuid NOT NULL REFERENCES public.asset_movements(id) ON DELETE CASCADE,
  kind text NOT NULL,
  branch public.branch,
  acknowledged_by uuid,
  person_name text,
  person_role text,
  condition_summary text,
  accessories text,
  quantity_confirmed integer,
  discrepancies text,
  photo_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  acknowledged_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.asset_condition_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  movement_id uuid REFERENCES public.asset_movements(id) ON DELETE SET NULL,
  stage text NOT NULL,
  condition text NOT NULL,
  previous_condition text,
  branch public.branch,
  recorded_by uuid,
  notes text,
  photo_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.asset_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid REFERENCES public.assets(id) ON DELETE SET NULL,
  movement_id uuid REFERENCES public.asset_movements(id) ON DELETE SET NULL,
  incident_type text NOT NULL,
  status text NOT NULL DEFAULT 'REPORTED',
  branch public.branch,
  occurred_at timestamptz,
  reported_by uuid,
  description text NOT NULL,
  condition text,
  estimated_cost numeric,
  actions_taken text,
  investigation_status text,
  resolution text,
  approved_outcome text,
  photo_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.asset_extensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movement_id uuid NOT NULL REFERENCES public.asset_movements(id) ON DELETE CASCADE,
  original_return_date date,
  requested_return_date date NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'REQUESTED',
  requested_by uuid,
  approved_by uuid,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.asset_custody_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  movement_id uuid REFERENCES public.asset_movements(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  branch public.branch,
  location text,
  custodian_id uuid,
  custodian_name text,
  condition text,
  status text,
  notes text,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.asset_movement_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity text NOT NULL,
  record_id uuid,
  action text NOT NULL,
  actor_id uuid,
  actor_branch public.branch,
  branch public.branch,
  previous_value jsonb,
  new_value jsonb,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mov_status ON public.asset_movements(status);
CREATE INDEX IF NOT EXISTS idx_mov_branches ON public.asset_movements(source_branch, destination_branch);
CREATE INDEX IF NOT EXISTS idx_mov_items_asset ON public.asset_movement_items(asset_id);
CREATE INDEX IF NOT EXISTS idx_custody_asset ON public.asset_custody_events(asset_id);
CREATE INDEX IF NOT EXISTS idx_audit_record ON public.asset_movement_audit(entity, record_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON public.asset_incidents(status);

-- ============ GRANTS ============
GRANT SELECT, INSERT, UPDATE, DELETE ON public.asset_movements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.asset_movement_items TO authenticated;
GRANT SELECT, INSERT ON public.asset_movement_approvals TO authenticated;
GRANT SELECT, INSERT ON public.asset_handover_records TO authenticated;
GRANT SELECT, INSERT ON public.asset_condition_records TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.asset_incidents TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.asset_extensions TO authenticated;
GRANT SELECT, INSERT ON public.asset_custody_events TO authenticated;
GRANT SELECT ON public.asset_movement_audit TO authenticated;
GRANT ALL ON public.asset_movements, public.asset_movement_items, public.asset_movement_approvals,
  public.asset_handover_records, public.asset_condition_records, public.asset_incidents,
  public.asset_extensions, public.asset_custody_events, public.asset_movement_audit TO service_role;
GRANT USAGE ON SEQUENCE public.asset_ref_seq, public.movement_no_seq TO authenticated, service_role;

-- ============ HELPERS ============
CREATE OR REPLACE FUNCTION public.can_see_movement(_source public.branch, _destination public.branch, _requested_by uuid, _responsible uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_head_office(auth.uid())
      OR public.is_resource_team(auth.uid())
      OR auth.uid() = _requested_by
      OR auth.uid() = _responsible
      OR EXISTS (SELECT 1 FROM public.profiles p
                  WHERE p.id = auth.uid()
                    AND (p.branch = _source OR p.branch = _destination));
$$;

CREATE OR REPLACE FUNCTION public.can_see_movement_id(_movement_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.asset_movements m
     WHERE m.id = _movement_id
       AND public.can_see_movement(m.source_branch, m.destination_branch, m.requested_by, m.responsible_person)
  );
$$;

REVOKE EXECUTE ON FUNCTION public.set_asset_ref() FROM PUBLIC, anon, authenticated;

-- ============ NUMBERING, RULES, AUDIT ============
CREATE OR REPLACE FUNCTION public.set_movement_no()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.agreement_no IS NULL THEN
    NEW.agreement_no := 'TROG-MOV-' || to_char(now(), 'YYYY') || '-' ||
      lpad(nextval('public.movement_no_seq')::text, 6, '0');
  END IF;
  IF NEW.original_return_date IS NULL THEN NEW.original_return_date := NEW.expected_return_date; END IF;
  IF NEW.requested_by IS NULL THEN NEW.requested_by := auth.uid(); END IF;
  IF NEW.created_by IS NULL THEN NEW.created_by := auth.uid(); END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_set_movement_no ON public.asset_movements;
CREATE TRIGGER trg_set_movement_no BEFORE INSERT ON public.asset_movements
  FOR EACH ROW EXECUTE FUNCTION public.set_movement_no();

CREATE OR REPLACE FUNCTION public.guard_movement_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  allowed text[];
  open_incidents int;
BEGIN
  NEW.updated_at := now();
  NEW.updated_by := COALESCE(auth.uid(), NEW.updated_by);
  IF NEW.agreement_no IS DISTINCT FROM OLD.agreement_no THEN
    RAISE EXCEPTION 'Agreement number cannot be changed' USING ERRCODE = '42501';
  END IF;
  IF NEW.original_return_date IS DISTINCT FROM OLD.original_return_date AND OLD.original_return_date IS NOT NULL THEN
    RAISE EXCEPTION 'The original return date is part of the permanent record' USING ERRCODE = '42501';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    allowed := CASE OLD.status
      WHEN 'DRAFT' THEN ARRAY['REQUESTED','CANCELLED']
      WHEN 'REQUESTED' THEN ARRAY['PENDING_APPROVAL','APPROVED','REJECTED','CANCELLED']
      WHEN 'PENDING_APPROVAL' THEN ARRAY['APPROVED','REJECTED','CANCELLED']
      WHEN 'APPROVED' THEN ARRAY['READY_FOR_DISPATCH','CANCELLED']
      WHEN 'READY_FOR_DISPATCH' THEN ARRAY['IN_TRANSIT','CANCELLED']
      WHEN 'IN_TRANSIT' THEN ARRAY['RECEIVED','INCIDENT_REVIEW']
      WHEN 'RECEIVED' THEN ARRAY['ON_LOAN','AT_EVENT','RETURN_REQUESTED','CLOSED','INCIDENT_REVIEW']
      WHEN 'AT_EVENT' THEN ARRAY['RETURN_REQUESTED','OVERDUE','INCIDENT_REVIEW']
      WHEN 'ON_LOAN' THEN ARRAY['RETURN_REQUESTED','OVERDUE','INCIDENT_REVIEW']
      WHEN 'OVERDUE' THEN ARRAY['RETURN_REQUESTED','ON_LOAN','INCIDENT_REVIEW']
      WHEN 'RETURN_REQUESTED' THEN ARRAY['RETURN_IN_TRANSIT','INCIDENT_REVIEW']
      WHEN 'RETURN_IN_TRANSIT' THEN ARRAY['RETURNED','INCIDENT_REVIEW']
      WHEN 'RETURNED' THEN ARRAY['CLOSED','INCIDENT_REVIEW']
      WHEN 'INCIDENT_REVIEW' THEN ARRAY['RETURNED','CLOSED','ON_LOAN','CANCELLED']
      ELSE ARRAY[]::text[]
    END;
    IF NOT (NEW.status = ANY(allowed)) THEN
      RAISE EXCEPTION 'Movement cannot go from % to %', OLD.status, NEW.status USING ERRCODE = '22023';
    END IF;

    IF NEW.status = 'CLOSED' THEN
      SELECT count(*) INTO open_incidents FROM public.asset_incidents i
        WHERE i.movement_id = NEW.id AND i.status NOT IN ('RESOLVED','CLOSED');
      IF open_incidents > 0 THEN
        RAISE EXCEPTION 'This agreement has % unresolved incident(s) and cannot be closed', open_incidents
          USING ERRCODE = '22023';
      END IF;
      NEW.closed_at := now();
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_guard_movement_update ON public.asset_movements;
CREATE TRIGGER trg_guard_movement_update BEFORE UPDATE ON public.asset_movements
  FOR EACH ROW EXECUTE FUNCTION public.guard_movement_update();

CREATE OR REPLACE FUNCTION public.guard_movement_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE requester uuid;
BEGIN
  SELECT requested_by INTO requester FROM public.asset_movements WHERE id = NEW.movement_id;
  IF NEW.decided_by IS NULL THEN NEW.decided_by := auth.uid(); END IF;
  IF requester IS NOT NULL AND NEW.decided_by = requester THEN
    RAISE EXCEPTION 'A requester cannot approve their own movement request' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_guard_movement_approval ON public.asset_movement_approvals;
CREATE TRIGGER trg_guard_movement_approval BEFORE INSERT ON public.asset_movement_approvals
  FOR EACH ROW EXECUTE FUNCTION public.guard_movement_approval();

CREATE OR REPLACE FUNCTION public.guard_movement_item()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a record; mstatus text;
BEGIN
  SELECT movement_status, name INTO a FROM public.assets WHERE id = NEW.asset_id;
  IF a IS NULL THEN RAISE EXCEPTION 'Asset not found' USING ERRCODE = '23503'; END IF;
  IF a.movement_status IN ('DISPOSED','RETIRED','ARCHIVED','LOST','STOLEN') THEN
    RAISE EXCEPTION '% is % and cannot be moved', a.name, a.movement_status USING ERRCODE = '22023';
  END IF;
  SELECT status INTO mstatus FROM public.asset_movements WHERE id = NEW.movement_id;
  IF a.movement_status IN ('ON_LOAN','IN_TRANSIT','AT_EVENT')
     AND NOT public.is_resource_team(auth.uid()) THEN
    RAISE EXCEPTION '% is currently % on another agreement', a.name, a.movement_status USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_guard_movement_item ON public.asset_movement_items;
CREATE TRIGGER trg_guard_movement_item BEFORE INSERT ON public.asset_movement_items
  FOR EACH ROW EXECUTE FUNCTION public.guard_movement_item();

CREATE OR REPLACE FUNCTION public.asset_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b public.branch;
BEGIN
  SELECT branch INTO b FROM public.profiles WHERE id = auth.uid();
  INSERT INTO public.asset_movement_audit(entity, record_id, action, actor_id, actor_branch, previous_value, new_value)
  VALUES (
    TG_TABLE_NAME,
    COALESCE((to_jsonb(NEW) ->> 'id')::uuid, (to_jsonb(OLD) ->> 'id')::uuid),
    TG_OP,
    auth.uid(),
    b,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END
  );
  RETURN COALESCE(NEW, OLD);
END; $$;

DROP TRIGGER IF EXISTS trg_audit_movements ON public.asset_movements;
CREATE TRIGGER trg_audit_movements AFTER INSERT OR UPDATE OR DELETE ON public.asset_movements
  FOR EACH ROW EXECUTE FUNCTION public.asset_audit();
DROP TRIGGER IF EXISTS trg_audit_incidents ON public.asset_incidents;
CREATE TRIGGER trg_audit_incidents AFTER INSERT OR UPDATE ON public.asset_incidents
  FOR EACH ROW EXECUTE FUNCTION public.asset_audit();
DROP TRIGGER IF EXISTS trg_audit_handover ON public.asset_handover_records;
CREATE TRIGGER trg_audit_handover AFTER INSERT ON public.asset_handover_records
  FOR EACH ROW EXECUTE FUNCTION public.asset_audit();
DROP TRIGGER IF EXISTS trg_audit_approvals ON public.asset_movement_approvals;
CREATE TRIGGER trg_audit_approvals AFTER INSERT ON public.asset_movement_approvals
  FOR EACH ROW EXECUTE FUNCTION public.asset_audit();
DROP TRIGGER IF EXISTS trg_audit_extensions ON public.asset_extensions;
CREATE TRIGGER trg_audit_extensions AFTER INSERT OR UPDATE ON public.asset_extensions
  FOR EACH ROW EXECUTE FUNCTION public.asset_audit();

REVOKE EXECUTE ON FUNCTION public.set_movement_no(), public.guard_movement_update(),
  public.guard_movement_approval(), public.guard_movement_item(), public.asset_audit()
  FROM PUBLIC, anon, authenticated;

-- ============ RLS ============
ALTER TABLE public.asset_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_movement_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_movement_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_handover_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_condition_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_extensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_custody_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_movement_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "movements readable in scope" ON public.asset_movements FOR SELECT TO authenticated
  USING (public.can_see_movement(source_branch, destination_branch, requested_by, responsible_person));
CREATE POLICY "movements insert in scope" ON public.asset_movements FOR INSERT TO authenticated
  WITH CHECK (public.is_approved_member(auth.uid()));
CREATE POLICY "movements update in scope" ON public.asset_movements FOR UPDATE TO authenticated
  USING (public.can_see_movement(source_branch, destination_branch, requested_by, responsible_person))
  WITH CHECK (public.can_see_movement(source_branch, destination_branch, requested_by, responsible_person));
CREATE POLICY "movements delete draft" ON public.asset_movements FOR DELETE TO authenticated
  USING (status = 'DRAFT' AND (requested_by = auth.uid() OR public.is_resource_team(auth.uid())));

CREATE POLICY "items readable" ON public.asset_movement_items FOR SELECT TO authenticated
  USING (public.can_see_movement_id(movement_id));
CREATE POLICY "items writable" ON public.asset_movement_items FOR INSERT TO authenticated
  WITH CHECK (public.can_see_movement_id(movement_id));
CREATE POLICY "items updatable" ON public.asset_movement_items FOR UPDATE TO authenticated
  USING (public.can_see_movement_id(movement_id)) WITH CHECK (public.can_see_movement_id(movement_id));
CREATE POLICY "items removable" ON public.asset_movement_items FOR DELETE TO authenticated
  USING (public.can_see_movement_id(movement_id));

CREATE POLICY "approvals readable" ON public.asset_movement_approvals FOR SELECT TO authenticated
  USING (public.can_see_movement_id(movement_id));
CREATE POLICY "approvals insertable" ON public.asset_movement_approvals FOR INSERT TO authenticated
  WITH CHECK (public.can_see_movement_id(movement_id)
              AND (public.is_head_office(auth.uid()) OR public.is_admin(auth.uid()) OR public.is_resource_team(auth.uid())));

CREATE POLICY "handover readable" ON public.asset_handover_records FOR SELECT TO authenticated
  USING (public.can_see_movement_id(movement_id));
CREATE POLICY "handover insertable" ON public.asset_handover_records FOR INSERT TO authenticated
  WITH CHECK (public.can_see_movement_id(movement_id));

CREATE POLICY "conditions readable" ON public.asset_condition_records FOR SELECT TO authenticated
  USING (public.is_approved_member(auth.uid()));
CREATE POLICY "conditions insertable" ON public.asset_condition_records FOR INSERT TO authenticated
  WITH CHECK (public.is_approved_member(auth.uid()));

CREATE POLICY "incidents readable" ON public.asset_incidents FOR SELECT TO authenticated
  USING (public.is_resource_team(auth.uid()) OR public.same_branch_or_admin(branch)
         OR (movement_id IS NOT NULL AND public.can_see_movement_id(movement_id)));
CREATE POLICY "incidents insertable" ON public.asset_incidents FOR INSERT TO authenticated
  WITH CHECK (public.is_approved_member(auth.uid()));
CREATE POLICY "incidents updatable" ON public.asset_incidents FOR UPDATE TO authenticated
  USING (public.is_resource_team(auth.uid()) OR reported_by = auth.uid())
  WITH CHECK (public.is_resource_team(auth.uid()) OR reported_by = auth.uid());

CREATE POLICY "extensions readable" ON public.asset_extensions FOR SELECT TO authenticated
  USING (public.can_see_movement_id(movement_id));
CREATE POLICY "extensions insertable" ON public.asset_extensions FOR INSERT TO authenticated
  WITH CHECK (public.can_see_movement_id(movement_id));
CREATE POLICY "extensions updatable" ON public.asset_extensions FOR UPDATE TO authenticated
  USING (public.is_resource_team(auth.uid()) OR public.is_head_office(auth.uid()))
  WITH CHECK (public.is_resource_team(auth.uid()) OR public.is_head_office(auth.uid()));

CREATE POLICY "custody readable" ON public.asset_custody_events FOR SELECT TO authenticated
  USING (public.is_approved_member(auth.uid()));
CREATE POLICY "custody insertable" ON public.asset_custody_events FOR INSERT TO authenticated
  WITH CHECK (public.is_approved_member(auth.uid()));

CREATE POLICY "audit readable by oversight" ON public.asset_movement_audit FOR SELECT TO authenticated
  USING (public.is_head_office(auth.uid()) OR public.is_admin(auth.uid()) OR public.is_resource_team(auth.uid()));
