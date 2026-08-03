
-- ============ helper role function ============
CREATE OR REPLACE FUNCTION public.is_resource_team(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND (ur.role IN ('senior_apostle','chairperson','secretary','lead_pastor','associate_pastor')
           OR ur.department_slug IN ('resource-administrator','finance','finance-administration'))
  ) OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _user_id AND p.primary_department IN ('resource-administrator','finance','finance-administration')
  );
$$;
REVOKE EXECUTE ON FUNCTION public.is_resource_team(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_resource_team(uuid) TO authenticated;

-- ============ extend the existing asset register ============
ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS asset_code text,
  ADD COLUMN IF NOT EXISTS qr_token uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS barcode text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS current_value numeric,
  ADD COLUMN IF NOT EXISTS depreciation_rate numeric DEFAULT 20,
  ADD COLUMN IF NOT EXISTS warranty_expiry date,
  ADD COLUMN IF NOT EXISTS insurance_status text DEFAULT 'uninsured',
  ADD COLUMN IF NOT EXISTS condition text DEFAULT 'good',
  ADD COLUMN IF NOT EXISTS lifecycle_status text DEFAULT 'in_service',
  ADD COLUMN IF NOT EXISTS room_number text,
  ADD COLUMN IF NOT EXISTS facility_id uuid,
  ADD COLUMN IF NOT EXISTS is_bookable boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS photo_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS document_urls jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS assets_qr_token_key ON public.assets(qr_token);
CREATE UNIQUE INDEX IF NOT EXISTS assets_asset_code_key ON public.assets(asset_code);

CREATE OR REPLACE FUNCTION public.set_asset_code()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.asset_code IS NULL THEN
    NEW.asset_code := 'TRG-AST-' || to_char(now(),'YYYY') || '-' ||
      lpad((COALESCE((SELECT count(*) FROM public.assets), 0) + 1)::text, 5, '0') || '-' ||
      upper(substr(replace(NEW.id::text,'-',''), 1, 4));
  END IF;
  IF NEW.barcode IS NULL THEN
    NEW.barcode := upper(replace(NEW.asset_code, '-', ''));
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS assets_set_code ON public.assets;
CREATE TRIGGER assets_set_code BEFORE INSERT ON public.assets
FOR EACH ROW EXECUTE FUNCTION public.set_asset_code();

UPDATE public.assets SET asset_code = 'TRG-AST-LEG-' || upper(substr(replace(id::text,'-',''),1,6))
WHERE asset_code IS NULL;
UPDATE public.assets SET barcode = upper(replace(asset_code,'-','')) WHERE barcode IS NULL;

-- ============ facilities ============
CREATE TABLE IF NOT EXISTS public.res_facilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  facility_type text NOT NULL DEFAULT 'room',
  branch branch,
  building text,
  floor text,
  room_number text,
  capacity integer,
  description text,
  status text NOT NULL DEFAULT 'available',
  cleaning_schedule text,
  maintenance_schedule text,
  last_safety_inspection date,
  next_safety_inspection date,
  safety_status text NOT NULL DEFAULT 'compliant',
  access_notes text,
  photo_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  floor_plan_url text,
  pos_x numeric,
  pos_y numeric,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.res_facilities TO authenticated;
GRANT ALL ON public.res_facilities TO service_role;
ALTER TABLE public.res_facilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "res_facilities_read" ON public.res_facilities FOR SELECT TO authenticated USING (public.is_approved_member(auth.uid()));
CREATE POLICY "res_facilities_write" ON public.res_facilities FOR ALL TO authenticated
  USING (public.is_resource_team(auth.uid())) WITH CHECK (public.is_resource_team(auth.uid()));

-- ============ bookings (facilities + equipment) ============
CREATE TABLE IF NOT EXISTS public.res_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid REFERENCES public.res_facilities(id) ON DELETE CASCADE,
  asset_id uuid REFERENCES public.assets(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  title text NOT NULL,
  purpose text,
  department_slug text,
  branch branch,
  requested_by uuid DEFAULT auth.uid(),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'requested',
  waitlisted boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.res_bookings TO authenticated;
GRANT ALL ON public.res_bookings TO service_role;
ALTER TABLE public.res_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "res_bookings_read" ON public.res_bookings FOR SELECT TO authenticated USING (public.is_approved_member(auth.uid()));
CREATE POLICY "res_bookings_insert" ON public.res_bookings FOR INSERT TO authenticated WITH CHECK (public.is_approved_member(auth.uid()));
CREATE POLICY "res_bookings_update" ON public.res_bookings FOR UPDATE TO authenticated
  USING (requested_by = auth.uid() OR public.is_resource_team(auth.uid()))
  WITH CHECK (requested_by = auth.uid() OR public.is_resource_team(auth.uid()));
CREATE POLICY "res_bookings_delete" ON public.res_bookings FOR DELETE TO authenticated
  USING (requested_by = auth.uid() OR public.is_resource_team(auth.uid()));

-- ============ resource requests ============
CREATE TABLE IF NOT EXISTS public.res_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number text,
  title text NOT NULL,
  purpose text,
  event_name text,
  department_slug text NOT NULL,
  branch branch,
  requested_by uuid DEFAULT auth.uid(),
  responsible_officer uuid,
  start_date date,
  return_date date,
  priority text NOT NULL DEFAULT 'normal',
  budget_impact numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'submitted',
  admin_reviewed_by uuid,
  admin_reviewed_at timestamptz,
  chair_approved_by uuid,
  chair_approved_at timestamptz,
  issued_at timestamptz,
  returned_at timestamptz,
  inspected_at timestamptz,
  inspection_notes text,
  procurement_request_id uuid REFERENCES public.purchase_requests(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.res_request_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.res_requests(id) ON DELETE CASCADE,
  asset_id uuid REFERENCES public.assets(id) ON DELETE SET NULL,
  item_name text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  fulfilled_quantity numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.res_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.res_request_items TO authenticated;
GRANT ALL ON public.res_requests TO service_role;
GRANT ALL ON public.res_request_items TO service_role;
ALTER TABLE public.res_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.res_request_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "res_requests_read" ON public.res_requests FOR SELECT TO authenticated USING (public.is_approved_member(auth.uid()));
CREATE POLICY "res_requests_insert" ON public.res_requests FOR INSERT TO authenticated WITH CHECK (public.is_approved_member(auth.uid()));
CREATE POLICY "res_requests_update" ON public.res_requests FOR UPDATE TO authenticated
  USING (requested_by = auth.uid() OR public.is_resource_team(auth.uid()))
  WITH CHECK (requested_by = auth.uid() OR public.is_resource_team(auth.uid()));
CREATE POLICY "res_requests_delete" ON public.res_requests FOR DELETE TO authenticated
  USING (requested_by = auth.uid() OR public.is_resource_team(auth.uid()));
CREATE POLICY "res_request_items_read" ON public.res_request_items FOR SELECT TO authenticated USING (public.is_approved_member(auth.uid()));
CREATE POLICY "res_request_items_write" ON public.res_request_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.res_requests r WHERE r.id = request_id AND (r.requested_by = auth.uid() OR public.is_resource_team(auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.res_requests r WHERE r.id = request_id AND (r.requested_by = auth.uid() OR public.is_resource_team(auth.uid()))));

CREATE OR REPLACE FUNCTION public.set_res_request_number()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.request_number IS NULL THEN
    NEW.request_number := 'RR-' || to_char(now(),'YYYY') || '-' ||
      lpad((COALESCE((SELECT count(*) FROM public.res_requests), 0) + 1)::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS res_requests_number ON public.res_requests;
CREATE TRIGGER res_requests_number BEFORE INSERT ON public.res_requests
FOR EACH ROW EXECUTE FUNCTION public.set_res_request_number();

-- ============ asset check-in / check-out ============
CREATE TABLE IF NOT EXISTS public.res_asset_checkouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  request_id uuid REFERENCES public.res_requests(id) ON DELETE SET NULL,
  checked_out_to uuid,
  holder_name text,
  department_slug text,
  purpose text,
  quantity numeric NOT NULL DEFAULT 1,
  checked_out_at timestamptz NOT NULL DEFAULT now(),
  due_back_at timestamptz,
  checked_in_at timestamptz,
  condition_out text DEFAULT 'good',
  condition_in text,
  notes text,
  recorded_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.res_asset_checkouts TO authenticated;
GRANT ALL ON public.res_asset_checkouts TO service_role;
ALTER TABLE public.res_asset_checkouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "res_checkouts_read" ON public.res_asset_checkouts FOR SELECT TO authenticated USING (public.is_approved_member(auth.uid()));
CREATE POLICY "res_checkouts_write" ON public.res_asset_checkouts FOR ALL TO authenticated
  USING (recorded_by = auth.uid() OR checked_out_to = auth.uid() OR public.is_resource_team(auth.uid()))
  WITH CHECK (recorded_by = auth.uid() OR checked_out_to = auth.uid() OR public.is_resource_team(auth.uid()));

-- ============ maintenance ============
CREATE TABLE IF NOT EXISTS public.res_maintenance_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text,
  title text NOT NULL,
  fault_type text NOT NULL DEFAULT 'equipment',
  maintenance_kind text NOT NULL DEFAULT 'corrective',
  description text,
  asset_id uuid REFERENCES public.assets(id) ON DELETE SET NULL,
  facility_id uuid REFERENCES public.res_facilities(id) ON DELETE SET NULL,
  department_slug text,
  branch branch,
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  reported_by uuid DEFAULT auth.uid(),
  technician text,
  assigned_to uuid,
  estimated_cost numeric,
  actual_cost numeric,
  parts_used text,
  labour_hours numeric,
  downtime_hours numeric,
  root_cause text,
  due_date date,
  completed_at timestamptz,
  before_photo_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  after_photo_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.res_maintenance_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  asset_id uuid REFERENCES public.assets(id) ON DELETE CASCADE,
  facility_id uuid REFERENCES public.res_facilities(id) ON DELETE CASCADE,
  trigger_type text NOT NULL DEFAULT 'time',
  frequency text NOT NULL DEFAULT 'quarterly',
  usage_hours_interval numeric,
  instructions text,
  last_done_on date,
  next_due_on date,
  responsible text,
  active boolean NOT NULL DEFAULT true,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.res_maintenance_tickets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.res_maintenance_schedules TO authenticated;
GRANT ALL ON public.res_maintenance_tickets TO service_role;
GRANT ALL ON public.res_maintenance_schedules TO service_role;
ALTER TABLE public.res_maintenance_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.res_maintenance_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "res_tickets_read" ON public.res_maintenance_tickets FOR SELECT TO authenticated USING (public.is_approved_member(auth.uid()));
CREATE POLICY "res_tickets_insert" ON public.res_maintenance_tickets FOR INSERT TO authenticated WITH CHECK (public.is_approved_member(auth.uid()));
CREATE POLICY "res_tickets_update" ON public.res_maintenance_tickets FOR UPDATE TO authenticated
  USING (reported_by = auth.uid() OR public.is_resource_team(auth.uid()))
  WITH CHECK (reported_by = auth.uid() OR public.is_resource_team(auth.uid()));
CREATE POLICY "res_tickets_delete" ON public.res_maintenance_tickets FOR DELETE TO authenticated
  USING (reported_by = auth.uid() OR public.is_resource_team(auth.uid()));
CREATE POLICY "res_schedules_read" ON public.res_maintenance_schedules FOR SELECT TO authenticated USING (public.is_approved_member(auth.uid()));
CREATE POLICY "res_schedules_write" ON public.res_maintenance_schedules FOR ALL TO authenticated
  USING (public.is_resource_team(auth.uid())) WITH CHECK (public.is_resource_team(auth.uid()));

CREATE OR REPLACE FUNCTION public.set_res_ticket_number()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.ticket_number IS NULL THEN
    NEW.ticket_number := 'MT-' || to_char(now(),'YYYY') || '-' ||
      lpad((COALESCE((SELECT count(*) FROM public.res_maintenance_tickets), 0) + 1)::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS res_tickets_number ON public.res_maintenance_tickets;
CREATE TRIGGER res_tickets_number BEFORE INSERT ON public.res_maintenance_tickets
FOR EACH ROW EXECUTE FUNCTION public.set_res_ticket_number();

-- ============ church development projects ============
CREATE TABLE IF NOT EXISTS public.res_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  project_type text NOT NULL DEFAULT 'renovation',
  description text,
  branch branch,
  facility_id uuid REFERENCES public.res_facilities(id) ON DELETE SET NULL,
  department_slug text,
  contractor text,
  budget numeric DEFAULT 0,
  spent numeric DEFAULT 0,
  start_date date,
  target_end_date date,
  actual_end_date date,
  completion_pct numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'planning',
  risks text,
  approvals text,
  resource_usage text,
  photo_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  document_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  owner_id uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.res_project_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.res_projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  due_date date,
  completed_on date,
  status text NOT NULL DEFAULT 'pending',
  weight numeric NOT NULL DEFAULT 1,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.res_projects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.res_project_milestones TO authenticated;
GRANT ALL ON public.res_projects TO service_role;
GRANT ALL ON public.res_project_milestones TO service_role;
ALTER TABLE public.res_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.res_project_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "res_projects_read" ON public.res_projects FOR SELECT TO authenticated USING (public.is_approved_member(auth.uid()));
CREATE POLICY "res_projects_write" ON public.res_projects FOR ALL TO authenticated
  USING (public.is_resource_team(auth.uid())) WITH CHECK (public.is_resource_team(auth.uid()));
CREATE POLICY "res_milestones_read" ON public.res_project_milestones FOR SELECT TO authenticated USING (public.is_approved_member(auth.uid()));
CREATE POLICY "res_milestones_write" ON public.res_project_milestones FOR ALL TO authenticated
  USING (public.is_resource_team(auth.uid())) WITH CHECK (public.is_resource_team(auth.uid()));

-- ============ consumable inventory ============
CREATE TABLE IF NOT EXISTS public.res_inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'stationery',
  unit text NOT NULL DEFAULT 'unit',
  quantity_on_hand numeric NOT NULL DEFAULT 0,
  minimum_stock numeric NOT NULL DEFAULT 0,
  maximum_stock numeric,
  unit_cost numeric,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  storage_location text,
  branch branch,
  expiry_date date,
  last_counted_on date,
  notes text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.res_inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.res_inventory_items(id) ON DELETE CASCADE,
  movement_type text NOT NULL DEFAULT 'issued',
  quantity_change numeric NOT NULL,
  quantity_after numeric,
  department_slug text,
  reason text,
  performed_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.res_inventory_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.res_inventory_movements TO authenticated;
GRANT ALL ON public.res_inventory_items TO service_role;
GRANT ALL ON public.res_inventory_movements TO service_role;
ALTER TABLE public.res_inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.res_inventory_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "res_inventory_read" ON public.res_inventory_items FOR SELECT TO authenticated USING (public.is_approved_member(auth.uid()));
CREATE POLICY "res_inventory_write" ON public.res_inventory_items FOR ALL TO authenticated
  USING (public.is_resource_team(auth.uid())) WITH CHECK (public.is_resource_team(auth.uid()));
CREATE POLICY "res_inv_moves_read" ON public.res_inventory_movements FOR SELECT TO authenticated USING (public.is_approved_member(auth.uid()));
CREATE POLICY "res_inv_moves_write" ON public.res_inventory_movements FOR ALL TO authenticated
  USING (performed_by = auth.uid() OR public.is_resource_team(auth.uid()))
  WITH CHECK (performed_by = auth.uid() OR public.is_resource_team(auth.uid()));

-- ============ risks ============
CREATE TABLE IF NOT EXISTS public.res_risks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL DEFAULT 'asset_loss',
  description text,
  likelihood integer NOT NULL DEFAULT 3,
  impact integer NOT NULL DEFAULT 3,
  mitigation text,
  owner_name text,
  owner_id uuid,
  review_date date,
  status text NOT NULL DEFAULT 'open',
  asset_id uuid REFERENCES public.assets(id) ON DELETE SET NULL,
  facility_id uuid REFERENCES public.res_facilities(id) ON DELETE SET NULL,
  branch branch,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.res_risks TO authenticated;
GRANT ALL ON public.res_risks TO service_role;
ALTER TABLE public.res_risks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "res_risks_read" ON public.res_risks FOR SELECT TO authenticated USING (public.is_approved_member(auth.uid()));
CREATE POLICY "res_risks_write" ON public.res_risks FOR ALL TO authenticated
  USING (public.is_resource_team(auth.uid())) WITH CHECK (public.is_resource_team(auth.uid()));

-- ============ training & compliance ============
CREATE TABLE IF NOT EXISTS public.res_training_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_name text NOT NULL,
  user_id uuid,
  course text NOT NULL,
  competency_level text NOT NULL DEFAULT 'foundation',
  completed_on date,
  expiry_date date,
  certificate_url text,
  status text NOT NULL DEFAULT 'valid',
  notes text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.res_training_records TO authenticated;
GRANT ALL ON public.res_training_records TO service_role;
ALTER TABLE public.res_training_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "res_training_read" ON public.res_training_records FOR SELECT TO authenticated USING (public.is_approved_member(auth.uid()));
CREATE POLICY "res_training_write" ON public.res_training_records FOR ALL TO authenticated
  USING (public.is_resource_team(auth.uid())) WITH CHECK (public.is_resource_team(auth.uid()));

-- ============ updated_at triggers ============
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['res_facilities','res_bookings','res_requests','res_maintenance_tickets',
                           'res_maintenance_schedules','res_projects','res_inventory_items','res_risks','res_training_records']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I_set_updated_at ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER %I_set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', t, t);
  END LOOP;
END $$;
