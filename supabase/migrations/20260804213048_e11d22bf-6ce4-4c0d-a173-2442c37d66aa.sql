-- ============ helpers ============
create or replace function public.is_ushering_team(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = _user_id and p.primary_department in ('ushers','protocol')
  ) or exists (
    select 1 from public.user_roles ur
    where ur.user_id = _user_id and ur.department_slug in ('ushers','protocol')
  ) or exists (
    select 1 from public.user_roles ur
    where ur.user_id = _user_id and ur.role in ('senior_apostle','chairperson','secretary','lead_pastor','associate_pastor')
  );
$$;

create or replace function public.is_media_team(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = _user_id and p.primary_department in ('media','media-communication','media-communications')
  ) or exists (
    select 1 from public.user_roles ur
    where ur.user_id = _user_id and ur.department_slug in ('media','media-communication','media-communications')
  ) or exists (
    select 1 from public.user_roles ur
    where ur.user_id = _user_id and ur.role in ('senior_apostle','chairperson','secretary','lead_pastor','associate_pastor')
  );
$$;

-- ============ USHERING ============
create table public.ush_services (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  service_type text not null default 'sunday_service',
  branch branch,
  venue text,
  service_date date not null default current_date,
  starts_at timestamptz,
  ends_at timestamptz,
  expected_attendance integer not null default 0,
  seating_capacity integer not null default 0,
  status text not null default 'planned',
  checklist jsonb not null default '[]'::jsonb,
  service_lead text,
  notes text,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ush_volunteers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete set null,
  full_name text not null,
  photo_url text,
  phone text,
  email text,
  branch branch,
  team text not null default 'auditorium',
  role text not null default 'usher',
  section text,
  availability text not null default 'available',
  training_status text not null default 'in_progress',
  certifications jsonb not null default '[]'::jsonb,
  emergency_contact text,
  emergency_phone text,
  performance_rating integer not null default 3,
  services_served integer not null default 0,
  ministry_experience text,
  mentor_name text,
  active boolean not null default true,
  notes text,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ush_roster (
  id uuid primary key default gen_random_uuid(),
  service_id uuid references public.ush_services on delete cascade,
  volunteer_id uuid references public.ush_volunteers on delete set null,
  volunteer_name text,
  duty text not null default 'entrance',
  section text,
  status text not null default 'assigned',
  is_backup boolean not null default false,
  checked_in_at timestamptz,
  swap_with text,
  leave_reason text,
  reminder_sent boolean not null default false,
  notes text,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ush_visitors (
  id uuid primary key default gen_random_uuid(),
  service_id uuid references public.ush_services on delete set null,
  full_name text not null,
  phone text,
  email text,
  branch branch,
  family_members integer not null default 0,
  children integer not null default 0,
  visitor_type text not null default 'first_time',
  invited_by text,
  prayer_request text,
  interests text,
  badge_code text,
  welcome_sms_sent boolean not null default false,
  welcome_email_sent boolean not null default false,
  followup_status text not null default 'pending',
  followup_owner text,
  assigned_pathway text,
  satisfaction integer,
  notes text,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ush_seating (
  id uuid primary key default gen_random_uuid(),
  service_id uuid references public.ush_services on delete cascade,
  section text not null,
  zone_type text not null default 'general',
  capacity integer not null default 0,
  occupied integer not null default 0,
  reserved integer not null default 0,
  usher_name text,
  notes text,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ush_attendance (
  id uuid primary key default gen_random_uuid(),
  service_id uuid references public.ush_services on delete cascade,
  service_date date not null default current_date,
  branch branch,
  adults integer not null default 0,
  children integer not null default 0,
  first_timers integer not null default 0,
  returning_visitors integer not null default 0,
  vip_guests integer not null default 0,
  volunteers_present integer not null default 0,
  peak_arrival_time text,
  avg_entry_minutes numeric,
  notes text,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ush_incidents (
  id uuid primary key default gen_random_uuid(),
  service_id uuid references public.ush_services on delete set null,
  incident_type text not null default 'medical',
  severity text not null default 'medium',
  occurred_at timestamptz not null default now(),
  location text,
  description text,
  witnesses text,
  actions_taken text,
  responsible_leader text,
  photo_url text,
  escalated_to text,
  followup_status text not null default 'open',
  resolution text,
  response_minutes integer,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ush_care (
  id uuid primary key default gen_random_uuid(),
  service_id uuid references public.ush_services on delete set null,
  member_name text not null,
  care_group text not null default 'elderly',
  assistance_requested text,
  assistance_provided text,
  assigned_volunteer text,
  followup_required boolean not null default false,
  followup_notes text,
  status text not null default 'open',
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ush_comms (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  comm_type text not null default 'duty_reminder',
  audience text not null default 'all_volunteers',
  channels jsonb not null default '["in_app"]'::jsonb,
  priority text not null default 'normal',
  send_at timestamptz,
  sent boolean not null default false,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ush_risks (
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

create table public.ush_courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  duration_hours numeric,
  video_url text,
  document_url text,
  required boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.ush_training_records (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.ush_courses on delete cascade,
  user_id uuid references auth.users on delete cascade,
  member_name text,
  progress_pct integer not null default 0,
  score integer,
  certificate_url text,
  expires_on date,
  completed_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ MEDIA ============
create table public.med_requests (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  request_type text not null default 'announcement',
  department_slug text,
  description text,
  audience text,
  priority text not null default 'medium',
  needed_by date,
  attachment_url text,
  assigned_to text,
  status text not null default 'submitted',
  approval_stage text not null default 'media_lead',
  approval_history jsonb not null default '[]'::jsonb,
  published_at timestamptz,
  requester_id uuid references auth.users on delete set null,
  requester_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.med_projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  project_type text not null default 'sermon_recording',
  ministry text,
  description text,
  assigned_team text,
  stage text not null default 'planning',
  priority text not null default 'medium',
  shoot_date date,
  deadline date,
  progress_pct integer not null default 0,
  checklist jsonb not null default '[]'::jsonb,
  publish_date date,
  publish_url text,
  archived boolean not null default false,
  request_id uuid references public.med_requests on delete set null,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.med_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  platform text not null default 'facebook',
  campaign text,
  caption text,
  hashtags text,
  asset_url text,
  scheduled_at timestamptz,
  status text not null default 'draft',
  reach integer not null default 0,
  impressions integer not null default 0,
  engagements integer not null default 0,
  shares integer not null default 0,
  comments_count integer not null default 0,
  clicks integer not null default 0,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.med_livestreams (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  stream_type text not null default 'sunday_service',
  platform text not null default 'youtube',
  starts_at timestamptz,
  status text not null default 'scheduled',
  checklist jsonb not null default '[]'::jsonb,
  viewers integer not null default 0,
  peak_viewers integer not null default 0,
  watch_minutes integer not null default 0,
  stream_quality text,
  technical_issues text,
  recording_url text,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.med_assets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  asset_type text not null default 'photo',
  category text not null default 'archive',
  event_name text,
  ministry text,
  speaker text,
  captured_on date,
  credited_to text,
  file_url text,
  thumbnail_url text,
  tags text,
  version_note text,
  brand_approved boolean not null default false,
  license_expires_on date,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.med_volunteers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete set null,
  full_name text not null,
  role text not null default 'volunteer',
  skills text,
  availability text not null default 'available',
  equipment_experience text,
  projects_completed integer not null default 0,
  attendance_pct integer not null default 0,
  performance_score integer not null default 3,
  leadership_potential text,
  mentor_name text,
  ministry_experience text,
  growth_notes text,
  active boolean not null default true,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.med_analytics (
  id uuid primary key default gen_random_uuid(),
  platform text not null default 'facebook',
  period_label text not null,
  followers integer not null default 0,
  reach integer not null default 0,
  impressions integer not null default 0,
  engagement_rate numeric not null default 0,
  views integer not null default 0,
  watch_minutes integer not null default 0,
  website_visits integer not null default 0,
  captured_on date not null default current_date,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.med_risks (
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

create table public.med_courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  duration_hours numeric,
  video_url text,
  document_url text,
  required boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.med_training_records (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.med_courses on delete cascade,
  user_id uuid references auth.users on delete cascade,
  member_name text,
  progress_pct integer not null default 0,
  score integer,
  certificate_url text,
  expires_on date,
  completed_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ grants + RLS ============
do $$
declare t text;
begin
  foreach t in array array[
    'ush_services','ush_volunteers','ush_roster','ush_visitors','ush_seating','ush_attendance',
    'ush_incidents','ush_care','ush_comms','ush_risks','ush_courses','ush_training_records'
  ] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "approved members read" on public.%I for select to authenticated using (public.is_approved_member(auth.uid()))', t);
    execute format('create policy "ushering team writes" on public.%I for all to authenticated using (public.is_ushering_team(auth.uid())) with check (public.is_ushering_team(auth.uid()))', t);
  end loop;

  foreach t in array array[
    'med_requests','med_projects','med_posts','med_livestreams','med_assets','med_volunteers',
    'med_analytics','med_risks','med_courses','med_training_records'
  ] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "approved members read" on public.%I for select to authenticated using (public.is_approved_member(auth.uid()))', t);
    execute format('create policy "media team writes" on public.%I for all to authenticated using (public.is_media_team(auth.uid())) with check (public.is_media_team(auth.uid()))', t);
  end loop;

  foreach t in array array[
    'ush_services','ush_volunteers','ush_roster','ush_visitors','ush_seating','ush_attendance',
    'ush_incidents','ush_care','ush_comms','ush_risks','ush_training_records',
    'med_requests','med_projects','med_posts','med_livestreams','med_assets','med_volunteers',
    'med_analytics','med_risks','med_training_records'
  ] loop
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', t || '_touch', t);
  end loop;
end $$;

-- any approved member may raise a media request for their department
create policy "members raise media requests" on public.med_requests for insert to authenticated
  with check (public.is_approved_member(auth.uid()) and requester_id = auth.uid());

create index on public.ush_roster (service_id, duty);
create index on public.ush_visitors (followup_status, created_at desc);
create index on public.ush_incidents (severity, followup_status);
create index on public.med_requests (status, needed_by);
create index on public.med_projects (stage, deadline);
create index on public.med_posts (platform, scheduled_at);