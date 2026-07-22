-- =========================================================================
-- 09_asset_management.sql
-- SAP-style asset/stock register: what you own, what it cost, who you
-- bought it from, who else could supply it, and a running stock-take log.
-- =========================================================================

-- Who can VIEW: any approved member (so departments can see what's
-- registered, matching how KPIs/reports already work for basic visibility).
-- Who can CREATE/EDIT/DELETE: Finance & Administration department members,
-- or Admin-panel roles (Senior Pastor / Chairperson).
create or replace function public.can_manage_assets(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select
    public.can_access_admin_panel(_user_id)
    or exists (
      select 1 from public.user_roles ur
      join public.departments d on d.slug = ur.department_slug
      where ur.user_id = _user_id and d.name ilike '%finance%'
    )
    or exists (
      select 1 from public.profiles p
      join public.departments d on d.slug = p.primary_department
      where p.id = _user_id and p.approval_status = 'approved' and d.name ilike '%finance%'
    );
$$;
revoke all on function public.can_manage_assets(uuid) from public, anon;
grant execute on function public.can_manage_assets(uuid) to authenticated;

-- -------------------------------------------------------------------------
-- Asset categories (equipment, furniture, vehicles, sound gear, etc.)
-- -------------------------------------------------------------------------
create table if not exists public.asset_categories (
  slug text primary key,
  name text not null,
  sort_order int not null default 0
);
grant select on public.asset_categories to authenticated;
grant all on public.asset_categories to service_role;
alter table public.asset_categories enable row level security;

create policy "asset_categories_read" on public.asset_categories
  for select to authenticated using (true);
create policy "asset_categories_write" on public.asset_categories
  for all to authenticated
  using (public.can_manage_assets(auth.uid()))
  with check (public.can_manage_assets(auth.uid()));

insert into public.asset_categories (slug, name, sort_order) values
  ('sound-av', 'Sound & AV Equipment', 1),
  ('furniture', 'Furniture & Fittings', 2),
  ('vehicles', 'Vehicles', 3),
  ('it-equipment', 'IT Equipment', 4),
  ('kitchen', 'Kitchen & Hospitality', 5),
  ('office-supplies', 'Office Supplies', 6),
  ('building-property', 'Building & Property', 7),
  ('other', 'Other', 99)
on conflict (slug) do nothing;

-- -------------------------------------------------------------------------
-- Suppliers directory
-- -------------------------------------------------------------------------
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_person text,
  phone text,
  email text,
  address text,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.suppliers to authenticated;
grant all on public.suppliers to service_role;
alter table public.suppliers enable row level security;

create policy "suppliers_read" on public.suppliers
  for select to authenticated using (true);
create policy "suppliers_write" on public.suppliers
  for all to authenticated
  using (public.can_manage_assets(auth.uid()))
  with check (public.can_manage_assets(auth.uid()));

create trigger suppliers_updated_at before update on public.suppliers
  for each row execute function public.set_updated_at();

-- -------------------------------------------------------------------------
-- Assets — the master record (like an SAP material/asset master)
-- -------------------------------------------------------------------------
create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text,
  model text,
  serial_number text,
  category_slug text references public.asset_categories(slug),
  description text,

  department_slug text references public.departments(slug),
  branch public.branch,
  location_notes text,                       -- e.g. "Storeroom, left shelf"

  unit_of_measure text default 'unit',        -- e.g. unit, box, set
  quantity_on_hand numeric not null default 1,
  reorder_level numeric default 0,

  purchase_date date,
  purchase_price numeric,
  currency text default 'ZAR',
  primary_supplier_id uuid references public.suppliers(id),

  condition text default 'good' check (condition in ('new','good','fair','poor','damaged')),
  status text default 'in_use' check (status in ('in_use','in_storage','under_repair','disposed')),

  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.assets to authenticated;
grant all on public.assets to service_role;
alter table public.assets enable row level security;

create policy "assets_read" on public.assets
  for select to authenticated using (true);
create policy "assets_write" on public.assets
  for all to authenticated
  using (public.can_manage_assets(auth.uid()))
  with check (public.can_manage_assets(auth.uid()));

create trigger assets_updated_at before update on public.assets
  for each row execute function public.set_updated_at();

create index if not exists idx_assets_category on public.assets(category_slug);
create index if not exists idx_assets_department on public.assets(department_slug);
create index if not exists idx_assets_supplier on public.assets(primary_supplier_id);

-- -------------------------------------------------------------------------
-- Alternate suppliers — "other suppliers that could supply the same thing"
-- -------------------------------------------------------------------------
create table if not exists public.asset_suppliers (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  is_primary boolean not null default false,
  quoted_price numeric,
  lead_time_days int,
  notes text,
  created_at timestamptz not null default now(),
  unique (asset_id, supplier_id)
);
grant select, insert, update, delete on public.asset_suppliers to authenticated;
grant all on public.asset_suppliers to service_role;
alter table public.asset_suppliers enable row level security;

create policy "asset_suppliers_read" on public.asset_suppliers
  for select to authenticated using (true);
create policy "asset_suppliers_write" on public.asset_suppliers
  for all to authenticated
  using (public.can_manage_assets(auth.uid()))
  with check (public.can_manage_assets(auth.uid()));

-- -------------------------------------------------------------------------
-- Stock movements — every change to quantity, for a running audit trail
-- -------------------------------------------------------------------------
create table if not exists public.asset_stock_movements (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  movement_type text not null check (movement_type in ('received','issued','adjustment','stocktake_correction','disposed')),
  quantity_change numeric not null,          -- positive = increase, negative = decrease
  quantity_after numeric not null,
  reason text,
  performed_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
grant select, insert on public.asset_stock_movements to authenticated;
grant all on public.asset_stock_movements to service_role;
alter table public.asset_stock_movements enable row level security;

create policy "asset_movements_read" on public.asset_stock_movements
  for select to authenticated using (true);
create policy "asset_movements_write" on public.asset_stock_movements
  for insert to authenticated
  with check (public.can_manage_assets(auth.uid()));

-- -------------------------------------------------------------------------
-- Periodic stock-takes — count what's actually there vs what the system expects
-- -------------------------------------------------------------------------
create table if not exists public.asset_stocktakes (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  expected_quantity numeric not null,
  counted_quantity numeric not null,
  variance numeric generated always as (counted_quantity - expected_quantity) stored,
  counted_by uuid references auth.users(id),
  counted_at timestamptz not null default now(),
  notes text
);
grant select, insert on public.asset_stocktakes to authenticated;
grant all on public.asset_stocktakes to service_role;
alter table public.asset_stocktakes enable row level security;

create policy "asset_stocktakes_read" on public.asset_stocktakes
  for select to authenticated using (true);
create policy "asset_stocktakes_write" on public.asset_stocktakes
  for insert to authenticated
  with check (public.can_manage_assets(auth.uid()));

-- Recording a stock-take automatically corrects the asset's quantity and
-- logs the correction as a stock movement, so the two stay in sync.
create or replace function public.apply_stocktake_correction()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if NEW.variance <> 0 then
    update public.assets
      set quantity_on_hand = NEW.counted_quantity
      where id = NEW.asset_id;

    insert into public.asset_stock_movements (asset_id, movement_type, quantity_change, quantity_after, reason, performed_by)
    values (NEW.asset_id, 'stocktake_correction', NEW.variance, NEW.counted_quantity,
            coalesce(NEW.notes, 'Stock-take correction'), NEW.counted_by);
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_apply_stocktake_correction on public.asset_stocktakes;
create trigger trg_apply_stocktake_correction
  after insert on public.asset_stocktakes
  for each row execute function public.apply_stocktake_correction();

-- -------------------------------------------------------------------------
-- Convenience view: assets currently at or below their reorder level
-- -------------------------------------------------------------------------
create or replace view public.assets_low_stock as
  select a.*, s.name as primary_supplier_name
  from public.assets a
  left join public.suppliers s on s.id = a.primary_supplier_id
  where a.reorder_level > 0 and a.quantity_on_hand <= a.reorder_level;
grant select on public.assets_low_stock to authenticated;
