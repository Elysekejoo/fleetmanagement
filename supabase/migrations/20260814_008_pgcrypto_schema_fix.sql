-- ============================================================
-- FLEET MANAGEMENT SYSTEM — 008 PGGCRYPTO SCHEMA FIX
-- MSH Rwanda · Fleet FMS
--
-- On Supabase, pgcrypto (gen_salt / crypt) is installed in the
-- `extensions` schema. With `set search_path = public` the
-- functions were unresolvable. Qualify them explicitly.
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
    extensions.crypt(p_password, extensions.gen_salt('bf', 10)),
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
    encrypted_password = extensions.crypt(p_new_password, extensions.gen_salt('bf', 10)),
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