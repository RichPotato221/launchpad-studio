-- ============ helpers ============
create or replace function public.is_intercession_team(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = _user_id and p.primary_department in ('prayer-intercession','intercession','prayer')
  ) or exists (
    select 1 from public.user_roles ur
    where ur.user_id = _user_id and ur.department_slug in ('prayer-intercession','intercession','prayer')
  ) or exists (
    select 1 from public.user_roles ur
    where ur.user_id = _user_id and ur.role in ('senior_apostle','chairperson','secretary','lead_pastor','associate_pastor')
  );
$$;

create or replace function public.is_prayer_leadership(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = _user_id and ur.role in ('senior_apostle','chairperson','secretary','lead_pastor','associate_pastor')
  ) or exists (
    select 1 from public.user_roles ur
    where ur.user_id = _user_id
      and ur.department_slug in ('prayer-intercession','intercession','prayer')
      and ur.role in ('department_chair')
  );
$$;

create or replace function public.is_hospitality_team(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = _user_id and p.primary_department in ('hospitality','ushers')
  ) or exists (
    select 1 from public.user_roles ur
    where ur.user_id = _user_id and ur.department_slug in ('hospitality','ushers')
  ) or exists (
    select 1 from public.user_roles ur
    where ur.user_id = _user_id and ur.role in ('senior_apostle','chairperson','secretary','lead_pastor','associate_pastor')
  );
$$;

-- ============ INTERCESSION ============
create sequence if not exists public.int_request_seq;

create table public.int_requests (
  id uuid primary key default gen_random_uuid(),
  prayer_no text unique,
  requester_id uuid references auth.users on delete set null,
  requester_name text,
  is_anonymous boolean not null default false,
  phone text, email text,
  branch branch,
  category text not null default 'general',
  priority text not null default 'normal',
  status text not null default 'submitted',
  title text not null,
  description text,
  confidential boolean not null default false,
  leadership_only boolean not null default false,
  assigned_to uuid references auth.users on delete set null,
  assigned_department text,
  prayer_duration_days integer,
  follow_up_required boolean not null default false,
  follow_up_date date,
  answered_at timestamptz,
  answer_note text,
  attachment_url text,
  escalated boolean not null default false,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.int_requests to authenticated;
grant all on public.int_requests to service_role;
alter table public.int_requests enable row level security;
create policy "requests readable" on public.int_requests for select to authenticated
  using (
    public.is_approved_member(auth.uid())
    and (
      (not confidential and not leadership_only)
      or requester_id = auth.uid()
      or assigned_to = auth.uid()
      or public.is_prayer_leadership(auth.uid())
    )
  );
create policy "members submit requests" on public.int_requests for insert to authenticated
  with check (public.is_approved_member(auth.uid()) and (requester_id = auth.uid() or requester_id is null));
create policy "team updates requests" on public.int_requests for update to authenticated
  using (public.is_intercession_team(auth.uid()) or requester_id = auth.uid())
  with check (public.is_intercession_team(auth.uid()) or requester_id = auth.uid());
create policy "leadership deletes requests" on public.int_requests for delete to authenticated
  using (public.is_prayer_leadership(auth.uid()));

create or replace function public.set_int_request_no()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.prayer_no is null then
    new.prayer_no := 'PR-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.int_request_seq')::text, 5, '0');
  end if;
  return new;
end; $$;
create trigger int_requests_no before insert on public.int_requests
  for each row execute function public.set_int_request_no();
create trigger int_requests_touch before update on public.int_requests
  for each row execute function public.set_updated_at();

create table public.int_chains (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  focus text,
  leader_id uuid references auth.users on delete set null,
  branch branch,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  slot_minutes integer not null default 60,
  status text not null default 'active',
  notes text,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.int_chain_slots (
  id uuid primary key default gen_random_uuid(),
  chain_id uuid not null references public.int_chains on delete cascade,
  slot_start timestamptz not null,
  slot_end timestamptz not null,
  intercessor_id uuid references auth.users on delete set null,
  intercessor_name text,
  covered boolean not null default false,
  missed boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

create table public.int_meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  meeting_type text not null default 'corporate',
  branch branch,
  venue text,
  host text,
  leader_id uuid references auth.users on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  prayer_focus text,
  topics text,
  declarations text,
  scriptures text,
  testimonies text,
  minutes text,
  action_items text,
  attendance_count integer not null default 0,
  expected_count integer not null default 0,
  prayer_hours numeric not null default 0,
  recording_url text,
  recurrence text,
  status text not null default 'scheduled',
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.int_fasts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  fast_type text not null default 'corporate',
  purpose text,
  start_date date not null,
  end_date date not null,
  daily_scriptures text,
  prayer_points text,
  status text not null default 'planned',
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.int_fast_participants (
  id uuid primary key default gen_random_uuid(),
  fast_id uuid not null references public.int_fasts on delete cascade,
  user_id uuid references auth.users on delete cascade,
  participant_name text,
  days_completed integer not null default 0,
  reflections text,
  spiritual_goal text,
  created_at timestamptz not null default now(),
  unique (fast_id, user_id)
);

create table public.int_journal (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  entry_date date not null default current_date,
  entry_type text not null default 'prayer',
  title text,
  body text,
  scriptures text,
  tags text[],
  mood text,
  attachment_url text,
  shared_with_leadership boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.int_team_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete set null,
  full_name text not null,
  role text not null default 'intercessor',
  branch branch,
  phone text, email text,
  availability text,
  prayer_watch text,
  spiritual_gifts text,
  skills text,
  years_serving integer,
  training_status text default 'not_started',
  certificates text,
  safeguarding_cleared boolean not null default false,
  emergency_contact text,
  attendance_pct integer not null default 0,
  performance_note text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.int_risks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'operational',
  description text,
  likelihood integer not null default 3,
  impact integer not null default 3,
  owner_id uuid references auth.users on delete set null,
  owner_name text,
  mitigation text,
  review_date date,
  status text not null default 'open',
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.int_courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  duration_hours numeric,
  video_url text,
  document_url text,
  required boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.int_training_records (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.int_courses on delete cascade,
  user_id uuid references auth.users on delete cascade,
  member_name text,
  progress_pct integer not null default 0,
  score integer,
  certificate_url text,
  completed_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ HOSPITALITY ============
create table public.hos_guests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  family_name text,
  phone text, email text,
  branch branch,
  first_visit_date date default current_date,
  invited_by text,
  interests text,
  special_needs text,
  dietary_requirements text,
  vip boolean not null default false,
  visits integer not null default 1,
  follow_up_status text not null default 'pending',
  follow_up_owner_id uuid references auth.users on delete set null,
  satisfaction_score integer,
  feedback text,
  notes text,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.hos_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_type text not null default 'sunday_service',
  branch branch,
  venue text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  expected_attendance integer not null default 0,
  vip_guests text,
  catering_notes text,
  seating_notes text,
  equipment_needed text,
  budget_amount numeric not null default 0,
  actual_spend numeric not null default 0,
  checklist jsonb not null default '[]'::jsonb,
  volunteers_assigned text,
  risk_notes text,
  readiness_pct integer not null default 0,
  status text not null default 'planned',
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.hos_volunteers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete set null,
  full_name text not null,
  role text not null default 'volunteer',
  branch branch,
  phone text, email text,
  availability text,
  skills text,
  food_handling_certificate boolean not null default false,
  training_completed text,
  emergency_contact text,
  medical_notes text,
  serving_since date,
  attendance_pct integer not null default 0,
  reliability_score integer not null default 0,
  recognition_points integer not null default 0,
  current_assignment text,
  performance_note text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.hos_inventory (
  id uuid primary key default gen_random_uuid(),
  item_code text,
  name text not null,
  category text not null default 'refreshments',
  quantity numeric not null default 0,
  unit text default 'unit',
  min_stock numeric not null default 0,
  max_stock numeric,
  supplier text,
  purchase_date date,
  expiry_date date,
  storage_location text,
  unit_value numeric not null default 0,
  condition text default 'good',
  assigned_to text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.hos_inventory_movements (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.hos_inventory on delete cascade,
  movement_type text not null default 'receive',
  quantity numeric not null default 0,
  reason text,
  moved_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);

create table public.hos_menus (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  service_date date not null default current_date,
  menu_items text,
  dietary_options text,
  kitchen_team text,
  serving_time text,
  estimated_servings integer not null default 0,
  food_cost numeric not null default 0,
  waste_note text,
  hygiene_checked boolean not null default false,
  cleaning_checklist jsonb not null default '[]'::jsonb,
  notes text,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.hos_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  task_type text not null default 'setup',
  description text,
  event_id uuid references public.hos_events on delete set null,
  assigned_to uuid references auth.users on delete set null,
  assignee_name text,
  priority text not null default 'medium',
  due_date date,
  progress_pct integer not null default 0,
  status text not null default 'todo',
  checklist jsonb not null default '[]'::jsonb,
  evidence_url text,
  comments text,
  recurring text,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.hos_risks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'operational',
  description text,
  likelihood integer not null default 3,
  impact integer not null default 3,
  owner_name text,
  mitigation text,
  review_date date,
  status text not null default 'open',
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.hos_courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  duration_hours numeric,
  video_url text,
  document_url text,
  required boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.hos_training_records (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.hos_courses on delete cascade,
  user_id uuid references auth.users on delete cascade,
  member_name text,
  progress_pct integer not null default 0,
  score integer,
  certificate_url text,
  completed_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ grants + RLS for the remaining tables ============
do $$
declare t text;
begin
  foreach t in array array[
    'int_chains','int_chain_slots','int_meetings','int_fasts','int_fast_participants',
    'int_team_members','int_risks','int_courses','int_training_records'
  ] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "approved members read" on public.%I for select to authenticated using (public.is_approved_member(auth.uid()))', t);
    execute format('create policy "intercession team writes" on public.%I for all to authenticated using (public.is_intercession_team(auth.uid())) with check (public.is_intercession_team(auth.uid()))', t);
  end loop;

  foreach t in array array[
    'hos_guests','hos_events','hos_volunteers','hos_inventory','hos_inventory_movements',
    'hos_menus','hos_tasks','hos_risks','hos_courses','hos_training_records'
  ] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "approved members read" on public.%I for select to authenticated using (public.is_approved_member(auth.uid()))', t);
    execute format('create policy "hospitality team writes" on public.%I for all to authenticated using (public.is_hospitality_team(auth.uid())) with check (public.is_hospitality_team(auth.uid()))', t);
  end loop;

  foreach t in array array[
    'int_chains','int_meetings','int_fasts','int_team_members','int_risks','int_training_records',
    'hos_guests','hos_events','hos_volunteers','hos_inventory','hos_menus','hos_tasks','hos_risks','hos_training_records','int_journal'
  ] loop
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', t || '_touch', t);
  end loop;
end $$;

-- journal: private to owner unless shared
grant select, insert, update, delete on public.int_journal to authenticated;
grant all on public.int_journal to service_role;
alter table public.int_journal enable row level security;
create policy "own journal" on public.int_journal for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "leadership reads shared journal" on public.int_journal for select to authenticated
  using (shared_with_leadership and public.is_prayer_leadership(auth.uid()));

create index on public.int_requests (status, priority, created_at desc);
create index on public.int_chain_slots (chain_id, slot_start);
create index on public.hos_inventory (category);
create index on public.hos_tasks (status, due_date);