-- ============================================================
-- FLEET MANAGEMENT SYSTEM — 001 INITIAL SCHEMA
-- MSH Rwanda · USAID IREME Project
-- ============================================================

-- Enums
create type public.user_role as enum ('admin', 'employee', 'driver');
create type public.vehicle_status as enum ('available', 'assigned', 'on_trip', 'maintenance', 'inactive');
create type public.request_status as enum ('pending', 'approved', 'rejected', 'cancelled', 'assigned', 'completed');
create type public.trip_status as enum ('scheduled', 'active', 'completed', 'cancelled');
create type public.priority_level as enum ('low', 'normal', 'high');
create type public.maint_status as enum ('scheduled', 'in_progress', 'completed');

-- updated_at trigger helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- PROFILES
-- Linked 1:1 to auth.users via the id column.
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null unique,
  phone text,
  role public.user_role not null default 'employee',
  employee_number text,
  department text,
  position text,
  license_number text,
  license_category text,
  license_expiry date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_role_idx on public.profiles (role);
create index profiles_active_idx on public.profiles (is_active);

-- Auto-create a profile whenever an auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- VEHICLES
-- ============================================================
create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  registration_number text not null unique,
  make text not null,
  model text not null,
  year integer not null,
  vehicle_type text not null default '4WD / SUV',
  color text,
  status public.vehicle_status not null default 'available',
  current_driver_id uuid references public.profiles (id) on delete set null,
  gps_device_id text,
  odometer integer not null default 0,
  last_service_date date,
  next_service_km integer not null default 10000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index vehicles_status_idx on public.vehicles (status);
create index vehicles_driver_idx on public.vehicles (current_driver_id);
create unique index vehicles_gps_device_idx on public.vehicles (gps_device_id) where gps_device_id is not null;

create trigger vehicles_updated_at before update on public.vehicles
  for each row execute function public.set_updated_at();

-- ============================================================
-- TRAVEL REQUESTS
-- ============================================================
create sequence public.request_ref_seq start 1;

create or replace function public.generate_request_ref()
returns trigger
language plpgsql
as $$
begin
  new.ref_code := 'REQ-' || lpad(nextval('public.request_ref_seq')::text, 3, '0');
  return new;
end;
$$;

create table public.travel_requests (
  id uuid primary key default gen_random_uuid(),
  ref_code text not null unique,
  requester_id uuid not null references public.profiles (id) on delete restrict,
  origin text not null,
  destination text not null,
  purpose text not null,
  travel_date date not null,
  return_date date,
  departure_time time,
  passenger_count integer not null default 1,
  priority public.priority_level not null default 'normal',
  status public.request_status not null default 'pending',
  approved_by uuid references public.profiles (id) on delete set null,
  approved_at timestamptz,
  assigned_vehicle_id uuid references public.vehicles (id) on delete set null,
  assigned_driver_id uuid references public.profiles (id) on delete set null,
  rejection_reason text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index requests_status_idx on public.travel_requests (status);
create index requests_requester_idx on public.travel_requests (requester_id);
create index requests_driver_idx on public.travel_requests (assigned_driver_id);
create index requests_vehicle_idx on public.travel_requests (assigned_vehicle_id);
create index requests_travel_date_idx on public.travel_requests (travel_date);

create trigger requests_ref_trigger before insert on public.travel_requests
  for each row execute function public.generate_request_ref();

create trigger requests_updated_at before update on public.travel_requests
  for each row execute function public.set_updated_at();

-- ============================================================
-- TRIPS
-- One trip per approved request.
-- ============================================================
create table public.trips (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.travel_requests (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete restrict,
  driver_id uuid not null references public.profiles (id) on delete restrict,
  start_time timestamptz,
  end_time timestamptz,
  start_location text,
  end_location text,
  distance_km numeric(8, 2),
  fuel_used_litres numeric(8, 2),
  status public.trip_status not null default 'scheduled',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index trips_driver_idx on public.trips (driver_id);
create index trips_vehicle_idx on public.trips (vehicle_id);
create index trips_status_idx on public.trips (status);
create index trips_start_time_idx on public.trips (start_time);

create trigger trips_updated_at before update on public.trips
  for each row execute function public.set_updated_at();

-- ============================================================
-- GPS LOCATIONS
-- Written by GPS devices (currently demonstration service).
-- ============================================================
create table public.gps_locations (
  id bigint generated always as identity primary key,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  latitude numeric(9, 6) not null,
  longitude numeric(9, 6) not null,
  speed numeric(6, 2),
  heading numeric(5, 2),
  accuracy numeric(6, 2),
  device_id text,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index gps_vehicle_recency_idx on public.gps_locations (vehicle_id, recorded_at desc);

-- ============================================================
-- FUEL RECORDS
-- ============================================================
create table public.fuel_records (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  date date not null,
  fuel_type text not null default 'Diesel',
  quantity numeric(8, 2) not null check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  total_cost numeric(14, 2) not null check (total_cost >= 0),
  odometer integer not null default 0,
  station text not null,
  receipt_number text,
  notes text,
  recorded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index fuel_vehicle_idx on public.fuel_records (vehicle_id);
create index fuel_date_idx on public.fuel_records (date);

-- ============================================================
-- MAINTENANCE RECORDS
-- ============================================================
create table public.maintenance_records (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  service_type text not null,
  description text,
  date date not null,
  odometer integer not null default 0,
  cost numeric(14, 2) not null default 0 check (cost >= 0),
  provider text,
  next_service_date date,
  status public.maint_status not null default 'completed',
  notes text,
  recorded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index maint_vehicle_idx on public.maintenance_records (vehicle_id);
create index maint_date_idx on public.maintenance_records (date);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'info',
  is_read boolean not null default false,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- Insert a notification for a user (security definer so the
-- application can notify any user while RLS stays strict).
create or replace function public.notify_user(
  p_user_id uuid,
  p_title text,
  p_message text,
  p_type text default 'info',
  p_metadata jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, title, message, type, metadata)
  values (p_user_id, p_title, p_message, p_type, p_metadata);
end;
$$;

-- ============================================================
-- AUDIT LOGS
-- ============================================================
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_created_idx on public.audit_logs (created_at desc);

create or replace function public.log_audit(
  p_action text,
  p_entity text,
  p_entity_id text default null,
  p_metadata jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_logs (user_id, action, entity, entity_id, metadata)
  values (auth.uid(), p_action, p_entity, p_entity_id, p_metadata);
end;
$$;

-- ============================================================
-- DASHBOARD STATISTICS
-- Aggregates for the admin dashboard.
-- ============================================================
create or replace function public.get_dashboard_stats()
returns table (
  total_vehicles bigint,
  available_vehicles bigint,
  vehicles_on_trip bigint,
  vehicles_maintenance bigint,
  total_drivers bigint,
  total_employees bigint,
  pending_requests bigint,
  active_trips bigint,
  completed_trips bigint,
  fuel_expenditure numeric,
  maintenance_expenditure numeric
)
language sql
security definer
set search_path = public
as $$
  select
    (select count(*) from public.vehicles),
    (select count(*) from public.vehicles where status = 'available'),
    (select count(*) from public.vehicles where status = 'on_trip'),
    (select count(*) from public.vehicles where status = 'maintenance'),
    (select count(*) from public.profiles where role = 'driver' and is_active),
    (select count(*) from public.profiles where role = 'employee' and is_active),
    (select count(*) from public.travel_requests where status = 'pending'),
    (select count(*) from public.trips where status = 'active'),
    (select count(*) from public.trips where status = 'completed'),
    coalesce((select sum(total_cost) from public.fuel_records), 0),
    coalesce((select sum(cost) from public.maintenance_records), 0);
$$;
