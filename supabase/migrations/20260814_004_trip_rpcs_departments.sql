-- ============================================================
-- FLEET MANAGEMENT SYSTEM — 004 TRIP RPCs, DEPARTMENTS,
-- STAFF ACCOUNT CREATION
-- MSH Rwanda · USAID IREME Project
-- ============================================================

-- ============================================================
-- DEPARTMENTS
-- ============================================================
create table public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);

alter table public.departments enable row level security;
alter table public.departments force row level security;

create policy departments_read_all on public.departments
  for select to authenticated using (true);

create policy departments_insert_admin on public.departments
  for insert to authenticated with check (is_admin());

create policy departments_update_admin on public.departments
  for update to authenticated using (is_admin()) with check (is_admin());

create policy departments_delete_admin on public.departments
  for delete to authenticated using (is_admin());

insert into public.departments (name, description) values
  ('Operations', 'Fleet, logistics and field operations'),
  ('Programs', 'Program delivery and field activities'),
  ('Finance & Administration', 'Finance, procurement and administration'),
  ('Human Resources', 'Staff management and welfare'),
  ('Monitoring & Evaluation', 'Data, monitoring and reporting')
on conflict (name) do nothing;

-- Link profiles to the departments table (replaces the free-text column)
alter table public.profiles add column department_id uuid references public.departments (id) on delete set null;

update public.profiles p
set department_id = d.id
from public.departments d
where lower(d.name) = lower(coalesce(p.department, ''))
  and p.department_id is null;

alter table public.profiles drop column department;

create index profiles_department_idx on public.profiles (department_id);

-- Tighten self-service updates: users may only change their phone,
-- not their role, email, department, licence or active status.
drop policy profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() = old.id
     and not public.is_admin()
     and (
       new.role is distinct from old.role
       or new.email is distinct from old.email
       or new.employee_number is distinct from old.employee_number
       or new.department_id is distinct from old.department_id
       or new.position is distinct from old.position
       or new.is_active is distinct from old.is_active
       or new.license_number is distinct from old.license_number
       or new.license_category is distinct from old.license_category
       or new.license_expiry is distinct from old.license_expiry
     )
  then
    raise exception 'Only your phone number can be changed';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_fields on public.profiles;
create trigger profiles_protect_fields
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- ============================================================
-- TRIP LIFECYCLE (security definer — drivers may complete their
-- own trips without direct write access to vehicles/requests)
-- ============================================================
create or replace function public.start_trip(
  p_trip_id uuid,
  p_start_location text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip record;
begin
  select * into v_trip from public.trips where id = p_trip_id;
  if v_trip is null then
    raise exception 'Trip not found';
  end if;
  if v_trip.status not in ('scheduled') then
    raise exception 'Only scheduled trips can be started';
  end if;
  if auth.uid() <> v_trip.driver_id and not public.is_admin() then
    raise exception 'Not authorized to start this trip';
  end if;

  update public.trips set
    status = 'active',
    start_time = now(),
    start_location = coalesce(p_start_location, start_location),
    updated_at = now()
  where id = p_trip_id;

  update public.vehicles set status = 'on_trip', updated_at = now()
  where id = v_trip.vehicle_id;

  update public.travel_requests set status = 'assigned', updated_at = now()
  where id = v_trip.request_id and status in ('approved', 'assigned');

  perform public.log_audit('trip.started', 'trips', p_trip_id::text,
    jsonb_build_object('start_location', p_start_location));
end;
$$;

create or replace function public.complete_trip(
  p_trip_id uuid,
  p_end_location text default null,
  p_distance_km numeric default null,
  p_fuel_litres numeric default null,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip record;
  v_request record;
begin
  select * into v_trip from public.trips where id = p_trip_id;
  if v_trip is null then
    raise exception 'Trip not found';
  end if;
  if v_trip.status <> 'active' then
    raise exception 'Only active trips can be completed';
  end if;
  if auth.uid() <> v_trip.driver_id and not public.is_admin() then
    raise exception 'Not authorized to complete this trip';
  end if;

  update public.trips set
    status = 'completed',
    end_time = now(),
    end_location = p_end_location,
    distance_km = p_distance_km,
    fuel_used_litres = p_fuel_litres,
    notes = coalesce(p_notes, notes),
    updated_at = now()
  where id = p_trip_id;

  update public.vehicles set status = 'available', updated_at = now()
  where id = v_trip.vehicle_id;

  update public.travel_requests set status = 'completed', updated_at = now()
  where id = v_trip.request_id;

  select * into v_request from public.travel_requests where id = v_trip.request_id;
  if v_request is not null and v_request.requester_id is not null then
    perform public.notify_user(
      v_request.requester_id,
      'Trip completed',
      format('Your trip %s has been completed.', v_request.ref_code),
      'info',
      jsonb_build_object('trip_id', p_trip_id)
    );
  end if;

  perform public.log_audit('trip.completed', 'trips', p_trip_id::text,
    jsonb_build_object('distance_km', p_distance_km, 'fuel_litres', p_fuel_litres));
end;
$$;

-- ============================================================
-- STAFF ACCOUNT CREATION / PASSWORD RESET
-- (admin-only; keeps auth rows in the exact shape GoTrue needs)
-- ============================================================
create or replace function public.create_staff_account(
  p_email text,
  p_password text,
  p_full_name text,
  p_role public.user_role default 'employee',
  p_phone text default null,
  p_department_id uuid default null,
  p_employee_number text default null,
  p_position text default null,
  p_license_number text default null,
  p_license_category text default null,
  p_license_expiry date default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_profile public.profiles;
begin
  if not public.is_admin() then
    raise exception 'Only administrators can create staff accounts';
  end if;

  v_user_id := gen_random_uuid();

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    confirmation_token, recovery_token, email_change_token_current,
    email_change_token_new, reauthentication_token, phone_change_token,
    email_change, phone_change, email_change_confirm_status,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data
  ) values (
    '00000000-0000-0000-0000-000000000000', v_user_id,
    'authenticated', 'authenticated', lower(p_email),
    crypt(p_password, gen_salt('bf', 10)),
    '', '', '', '', '', '', '', '', 0,
    now(), now(), now(),
    '{"provider": "email", "providers": ["email"]}',
    jsonb_build_object('full_name', p_full_name)
  );

  insert into auth.identities (
    id, user_id, provider_id, provider, identity_data,
    email, last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), v_user_id, lower(p_email), 'email',
    jsonb_build_object('sub', v_user_id::text, 'email', lower(p_email)),
    lower(p_email), now(), now(), now()
  );

  insert into public.profiles (
    id, full_name, email, phone, role, employee_number,
    department_id, position, license_number, license_category, license_expiry
  ) values (
    v_user_id, p_full_name, lower(p_email), p_phone, p_role,
    p_employee_number, p_department_id, p_position,
    p_license_number, p_license_category, p_license_expiry
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    email = excluded.email,
    phone = excluded.phone,
    role = excluded.role,
    employee_number = excluded.employee_number,
    department_id = excluded.department_id,
    position = excluded.position,
    license_number = excluded.license_number,
    license_category = excluded.license_category,
    license_expiry = excluded.license_expiry,
    is_active = true
  returning * into v_profile;

  return v_profile;
end;
$$;

create or replace function public.admin_reset_password(
  p_user_id uuid,
  p_new_password text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can reset passwords';
  end if;

  update auth.users set
    encrypted_password = crypt(p_new_password, gen_salt('bf', 10)),
    confirmation_token = '',
    recovery_token = '',
    email_change_token_current = '',
    email_change_token_new = '',
    reauthentication_token = '',
    phone_change_token = '',
    email_change = '',
    phone_change = '',
    email_change_confirm_status = 0,
    updated_at = now()
  where id = p_user_id;
end;
$$;