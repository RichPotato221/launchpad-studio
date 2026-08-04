-- ===== Shared Ministry Team workspace (youth / women / men) =====
create table public.mt_members (
  id uuid primary key default gen_random_uuid(),
  team text not null,
  full_name text not null,
  photo_url text,
  gender text,
  date_of_birth date,
  phone text,
  email text,
  address text,
  marital_status text,
  occupation text,
  school text,
  branch branch,
  guardian_name text,
  guardian_phone text,
  emergency_contact text,
  emergency_phone text,
  small_group_id uuid,
  mentor_name text,
  ministry_involvement text,
  spiritual_gifts text,
  talents text,
  baptism_status text not null default 'not_baptised',
  salvation_date date,
  membership_status text not null default 'active',
  stage text not null default 'first_time_visitor',
  leadership_level text not null default 'member',
  safeguarding_status text not null default 'pending',
  training_completed text,
  notes text,
  user_id uuid references auth.users on delete set null,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.mt_groups (
  id uuid primary key default gen_random_uuid(),
  team text not null,
  name text not null,
  leader_name text,
  assistant_name text,
  mentor_name text,
  venue text,
  meeting_day text,
  meeting_time text,
  capacity integer,
  focus text,
  notes text,
  status text not null default 'active',
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.mt_mentorships (
  id uuid primary key default gen_random_uuid(),
  team text not null,
  mentor_name text not null,
  mentee_name text not null,
  member_id uuid references public.mt_members on delete set null,
  goals text,
  cadence text not null default 'monthly',
  last_session_date date,
  next_session_date date,
  sessions_completed integer not null default 0,
  progress_pct integer not null default 0,
  prayer_notes text,
  progress_notes text,
  confidential_notes text,
  status text not null default 'active',
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.mt_events (
  id uuid primary key default gen_random_uuid(),
  team text not null,
  title text not null,
  event_type text not null default 'service',
  event_date date not null,
  start_time text,
  venue text,
  speaker text,
  theme text,
  capacity integer,
  budget numeric,
  actual_cost numeric,
  resources text,
  checklist text,
  risk_notes text,
  registrations integer not null default 0,
  attendance_count integer not null default 0,
  feedback text,
  follow_up text,
  status text not null default 'planned',
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.mt_attendance (
  id uuid primary key default gen_random_uuid(),
  team text not null,
  event_id uuid references public.mt_events on delete cascade,
  member_id uuid references public.mt_members on delete cascade,
  member_name text,
  attended_on date not null default current_date,
  present boolean not null default true,
  context text not null default 'event',
  notes text,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);

create table public.mt_outreach (
  id uuid primary key default gen_random_uuid(),
  team text not null,
  title text not null,
  category text not null default 'community',
  location text,
  leader_name text,
  start_date date,
  end_date date,
  budget numeric,
  volunteers integer not null default 0,
  volunteer_hours numeric not null default 0,
  people_reached integer not null default 0,
  salvations integer not null default 0,
  follow_ups integer not null default 0,
  beneficiaries text,
  impact text,
  status text not null default 'planned',
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.mt_prayer (
  id uuid primary key default gen_random_uuid(),
  team text not null,
  requester_name text,
  category text not null default 'general',
  request text not null,
  confidential boolean not null default false,
  assigned_to text,
  follow_up_date date,
  answered_note text,
  status text not null default 'open',
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.mt_tasks (
  id uuid primary key default gen_random_uuid(),
  team text not null,
  title text not null,
  description text,
  assignee_name text,
  priority text not null default 'medium',
  due_date date,
  progress_pct integer not null default 0,
  status text not null default 'todo',
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.mt_risks (
  id uuid primary key default gen_random_uuid(),
  team text not null default 'youth',
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

create table public.mt_courses (
  id uuid primary key default gen_random_uuid(),
  team text not null default 'youth',
  title text not null,
  description text,
  duration_hours numeric,
  video_url text,
  document_url text,
  required boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.mt_training_records (
  id uuid primary key default gen_random_uuid(),
  team text not null default 'youth',
  course_id uuid not null references public.mt_courses on delete cascade,
  user_id uuid references auth.users on delete cascade,
  member_name text,
  progress_pct integer not null default 0,
  score integer,
  certificate_url text,
  completed_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array[
    'mt_members','mt_groups','mt_mentorships','mt_events','mt_attendance',
    'mt_outreach','mt_prayer','mt_tasks','mt_risks','mt_courses','mt_training_records'
  ] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "approved members read %1$s" on public.%1$I for select to authenticated using (public.is_approved_member(auth.uid()))', t);
    execute format(
      'create policy "approved members write %1$s" on public.%1$I for all to authenticated using (public.is_approved_member(auth.uid())) with check (public.is_approved_member(auth.uid()))', t);
    execute format(
      'create trigger %1$s_touch before update on public.%1$I for each row execute function public.set_updated_at()', t)
      ;
  end loop;
end $$;
