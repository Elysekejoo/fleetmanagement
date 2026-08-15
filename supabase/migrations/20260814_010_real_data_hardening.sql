-- ============================================================
-- FLEET MANAGEMENT SYSTEM — 010 REAL DATA HARDENING
-- MSH Rwanda · USAID IREME Project
--
-- 1. Remove DEFAULT parameter values from RPCs so PostgREST
--    matches parameters by name deterministically (PGRST202
--    no longer possible on partial bodies).
-- 2. Heal requests left half-approved by the old missing
--    trips INSERT policy (assigned status with NULL vehicle).
-- 3. Backfill department_id for profiles that predate the
--    departments table.
-- 4. Purge all DEMO-* GPS data and tracker IDs (real data only).
-- ============================================================

-- 1. RPC parameter hardening -----------------------------------

drop function if exists public.notify_user(uuid, text, text, text, jsonb);

create or replace function public.notify_user(
  p_user_id uuid,
  p_title text,
  p_message text,
  p_type text,
  p_metadata jsonb
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

drop function if exists public.log_audit(text, text, text, jsonb);

create or replace function public.log_audit(
  p_action text,
  p_entity text,
  p_entity_id text,
  p_metadata jsonb
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

drop function if exists public.create_staff_account(text, text, text, public.user_role, text, uuid, text, text, text, text, date);

create or replace function public.create_staff_account(
  p_email text,
  p_password text,
  p_full_name text,
  p_role public.user_role,
  p_phone text,
  p_department_id uuid,
  p_employee_number text,
  p_position text,
  p_license_number text,
  p_license_category text,
  p_license_expiry date
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
    extensions.crypt(p_password, extensions.gen_salt('bf', 10)),
    '', '', '', '', '', '', '', '', 0,
    now(), now(), now(),
    '{"provider": "email", "providers": ["email"]}',
    jsonb_build_object('full_name', p_full_name)
  );

  insert into auth.identities (
    id, user_id, provider_id, provider, identity_data,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), v_user_id, lower(p_email), 'email',
    jsonb_build_object('sub', v_user_id::text, 'email', lower(p_email)),
    now(), now(), now()
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

-- 2. Heal requests that were approved before trips INSERT worked ------

update public.travel_requests r
set assigned_vehicle_id = t.vehicle_id
from public.trips t
where t.request_id = r.id
  and r.assigned_vehicle_id is null
  and t.vehicle_id is not null;

-- 3. Backfill department for profiles created before departments ------

update public.profiles p
set department_id = d.id
from public.departments d
where p.department_id is null
  and d.name = 'Operations'
  and p.role in ('admin', 'employee', 'driver');

-- 4. Real data only: drop simulated GPS history and tracker IDs ------

delete from public.gps_locations where device_id like 'DEMO-%';

update public.vehicles
set gps_device_id = null
where gps_device_id like 'DEMO-%';