-- ============================================================
-- FLEET MANAGEMENT SYSTEM - 011 CORE FEATURES
-- MSH Rwanda . Fleet FMS
--
-- 1. app_settings: single-row table for dynamic / admin-editable
--    branding (web name, org name, taglines, footers, hero copy).
-- 2. password_reset_requests: employee/driver self-service
--    password recovery with admin approval.
-- 3. Master administrator account (admin@fleet.com), hidden and
--    protected from deactivation / deletion / role changes.
-- 4. admin_update_email: allow admins to change a user's email
--    (auth.users + auth.identities + profiles).
-- ============================================================

-- ============================================================
-- 1. APP SETTINGS
-- ============================================================
create table public.app_settings (
  id integer primary key default 1 check (id = 1),
  system_name text not null default 'Fleet FMS',
  org_name text not null default 'Management Sciences for Health',
  org_line text not null default 'MSH Rwanda',
  location_line text not null default 'Kigali, Rwanda',
  footer_line_1 text not null default 'FMS v2.0 - MSH Rwanda',
  footer_line_2 text not null default 'MSH Rwanda . Kigali, Rwanda',
  hero_title text not null default 'Fleet Management & GPS Tracking System',
  hero_subtitle text not null default 'A centralized platform for managing organizational vehicles, travel requests, driver assignments, fuel and maintenance records, and fleet visibility across Rwanda.',
  mission_title text not null default 'Rwanda',
  mission_text text not null default 'Dependable fleet operations in support of health programs across Rwanda.',
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

alter table public.app_settings enable row level security;
alter table public.app_settings force row level security;

create policy app_settings_read_all on public.app_settings
  for select to authenticated using (true);

-- Branding text is shown on the public login page, so it is also
-- readable by anonymous users.
create policy app_settings_read_anon on public.app_settings
  for select to anon using (true);

create policy app_settings_update_admin on public.app_settings
  for update to authenticated using (is_admin()) with check (is_admin());

create policy app_settings_insert_admin on public.app_settings
  for insert to authenticated with check (is_admin());

insert into public.app_settings (id) values (1)
on conflict (id) do nothing;

-- ============================================================
-- 2. PASSWORD RESET REQUESTS (admin approval flow)
-- ============================================================
create table public.password_reset_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  email text not null,
  full_name text not null,
  role public.user_role not null,
  new_password_hash text not null,
  status text not null default 'pending',
  rejection_reason text,
  reviewed_by uuid references public.profiles (id) on delete set null,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  constraint password_reset_status_check
    check (status in ('pending', 'approved', 'rejected'))
);

create index password_reset_status_idx on public.password_reset_requests (status, submitted_at desc);

alter table public.password_reset_requests enable row level security;
alter table public.password_reset_requests force row level security;

create policy reset_requests_read_self_or_admin on public.password_reset_requests
  for select to authenticated using (auth.uid() = user_id or is_admin());

create policy reset_requests_update_admin on public.password_reset_requests
  for update to authenticated using (is_admin()) with check (is_admin());

create policy reset_requests_delete_admin on public.password_reset_requests
  for delete to authenticated using (is_admin());

-- Request a password reset. Verifies that p_last_used_password
-- matches the account's current password before creating a
-- pending request for admin review.
create or replace function public.request_password_reset(
  p_email text,
  p_last_used_password text,
  p_new_password text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
  v_hash text;
  v_admin uuid;
begin
  select * into v_profile
    from public.profiles
   where lower(email) = lower(p_email)
   limit 1;

  if not found then
    raise exception 'No active account was found with this email address.';
  end if;
  if v_profile.is_active is not true then
    raise exception 'This account has been deactivated. Contact your administrator.';
  end if;
  if v_profile.role not in ('employee', 'driver') then
    raise exception 'Administrators cannot request a password reset here. Please contact another administrator.';
  end if;

  select encrypted_password into v_hash from auth.users where id = v_profile.id;
  if v_hash is null or v_hash = '' then
    raise exception 'This account does not support a password reset. Contact your administrator.';
  end if;
  if extensions.crypt(p_last_used_password, v_hash) <> v_hash then
    raise exception
      'The recent password you entered does not match our records. Please use the password you last used to sign in.';
  end if;

  if exists (
    select 1 from public.password_reset_requests
    where user_id = v_profile.id and status = 'pending'
  ) then
    raise exception 'You already have a pending password reset request. Please wait for the administrator to review it.';
  end if;

  if length(coalesce(p_new_password, '')) < 6 then
    raise exception 'The new password must be at least 6 characters long.';
  end if;

  insert into public.password_reset_requests (
    user_id, email, full_name, role, new_password_hash, status
  ) values (
    v_profile.id, v_profile.email, v_profile.full_name, v_profile.role,
    extensions.crypt(p_new_password, extensions.gen_salt('bf', 10)), 'pending'
  );

  for v_admin in
    select id from public.profiles where role = 'admin' and is_active
  loop
    perform public.notify_user(
      v_admin,
      'Password reset request',
      format('%s (%s) requested a password reset. Review it in the admin panel.', v_profile.full_name, v_profile.email),
      'warning',
      jsonb_build_object('reset_request_id', NULL)
    );
  end loop;

  perform public.log_audit('password_reset.requested', 'password_reset_requests', v_profile.id::text,
    jsonb_build_object('email', v_profile.email));
end;
$$;

-- Approve a pending reset request: activates the new password.
create or replace function public.approve_password_reset(
  p_request_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.password_reset_requests;
begin
  if not public.is_admin() then
    raise exception 'Only administrators can approve password reset requests';
  end if;

  select * into v_request from public.password_reset_requests where id = p_request_id;
  if not found then
    raise exception 'Password reset request not found';
  end if;
  if v_request.status <> 'pending' then
    raise exception 'This password reset request has already been processed';
  end if;
  if v_request.new_password_hash is null or v_request.new_password_hash = '' then
    raise exception 'This request has no password to activate';
  end if;

  update auth.users set
    encrypted_password = v_request.new_password_hash,
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
  where id = v_request.user_id;

  update public.password_reset_requests
  set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_request_id;

  perform public.notify_user(
    v_request.user_id,
    'Password reset approved',
    'Your password reset request was approved. Use your new password to sign in.',
    'success',
    jsonb_build_object('reset_request_id', p_request_id)
  );

  perform public.log_audit('password_reset.approved', 'password_reset_requests', p_request_id::text,
    jsonb_build_object('user_id', v_request.user_id));
end;
$$;

-- Reject a pending reset request with a reason for the user.
create or replace function public.reject_password_reset(
  p_request_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.password_reset_requests;
begin
  if not public.is_admin() then
    raise exception 'Only administrators can reject password reset requests';
  end if;

  select * into v_request from public.password_reset_requests where id = p_request_id;
  if not found then
    raise exception 'Password reset request not found';
  end if;
  if v_request.status <> 'pending' then
    raise exception 'This password reset request has already been processed';
  end if;

  update public.password_reset_requests
  set status = 'rejected',
      rejection_reason = coalesce(p_reason, 'No reason provided'),
      reviewed_by = auth.uid(),
      reviewed_at = now()
  where id = p_request_id;

  perform public.notify_user(
    v_request.user_id,
    'Password reset rejected',
    format('Your password reset request was rejected. Reason: %s', coalesce(p_reason, 'No reason provided.')),
    'error',
    jsonb_build_object('reset_request_id', p_request_id)
  );

  perform public.log_audit('password_reset.rejected', 'password_reset_requests', p_request_id::text,
    jsonb_build_object('user_id', v_request.user_id));
end;
$$;

-- ============================================================
-- 3. MASTER ADMINISTRATOR (hidden + protected)
-- ============================================================
alter table public.profiles add column is_master_admin boolean not null default false;

-- Freeze the master administrator account: it can never be
-- deactivated, deleted, re-rolled, or re-emailed.
create or replace function public.protect_master_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.is_master_admin then
    if old.role is distinct from new.role then
      raise exception 'The master administrator role cannot be changed.';
    end if;
    if old.is_active is distinct from new.is_active or new.is_active is not true then
      raise exception 'The master administrator account cannot be deactivated.';
    end if;
    if new.is_master_admin is distinct from old.is_master_admin then
      raise exception 'The master administrator flag cannot be changed.';
    end if;
    if lower(old.email) <> lower(new.email) then
      raise exception 'The master administrator email cannot be changed.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_master_admin on public.profiles;
create trigger profiles_protect_master_admin
  before update on public.profiles
  for each row execute function public.protect_master_admin();

create or replace function public.protect_master_admin_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.is_master_admin then
    raise exception 'The master administrator account cannot be deleted.';
  end if;
  return old;
end;
$$;

drop trigger if exists profiles_protect_master_admin_del on public.profiles;
create trigger profiles_protect_master_admin_del
  before delete on public.profiles
  for each row execute function public.protect_master_admin_delete();

-- Also protect the master flag in the general self-service guard.
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
       or new.is_master_admin is distinct from old.is_master_admin
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

-- Ensure the master administrator exists (idempotent). Password is
-- Kejoo2007@ for admin@fleet.com and is re-applied on every run so
-- the account can never be lost or misconfigured.
do $$
declare
  v_user_id uuid;
begin
  select id into v_user_id from auth.users where lower(email) = 'admin@fleet.com';

  if v_user_id is null then
    v_user_id := '00000000-0000-4000-8000-0000000000f1';

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      confirmation_token, recovery_token, email_change_token_current,
      email_change_token_new, reauthentication_token, phone_change_token,
      email_change, phone_change, email_change_confirm_status,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data
    ) values (
      '00000000-0000-0000-0000-000000000000', v_user_id,
      'authenticated', 'authenticated', 'admin@fleet.com',
      extensions.crypt('Kejoo2007@', extensions.gen_salt('bf', 10)),
      '', '', '', '', '', '', '', '', 0,
      now(), now(), now(),
      '{"provider": "email", "providers": ["email"]}',
      '{"full_name": "System Administrator", "is_master_admin": true}'
    );

    insert into auth.identities (
      id, user_id, provider_id, provider, identity_data,
      last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), v_user_id, 'admin@fleet.com', 'email',
      jsonb_build_object('sub', v_user_id::text, 'email', 'admin@fleet.com'),
      now(), now(), now()
    );
  else
    -- Keep the known credentials authoritative (re-apply each run).
    update auth.users set
      encrypted_password = extensions.crypt('Kejoo2007@', extensions.gen_salt('bf', 10)),
      email = 'admin@fleet.com',
      confirmation_token = '',
      recovery_token = '',
      email_change_token_current = '',
      email_change_token_new = '',
      reauthentication_token = '',
      phone_change_token = '',
      email_change = '',
      phone_change = '',
      email_change_confirm_status = 0,
      email_confirmed_at = now(),
      updated_at = now()
    where id = v_user_id;
  end if;

  insert into public.profiles (
    id, full_name, email, role, is_master_admin, is_active,
    employee_number, position
  ) values (
    v_user_id, 'System Administrator', 'admin@fleet.com', 'admin', true, true,
    'MSH-000', 'Master Administrator'
  )
  on conflict (id) do update set
    email = 'admin@fleet.com',
    role = 'admin',
    is_master_admin = true,
    is_active = true;
end;
$$;

-- ============================================================
-- 4. ADMIN EMAIL CHANGE
-- ============================================================
create or replace function public.admin_update_email(
  p_user_id uuid,
  p_email text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_email text := lower(p_email);
  v_is_master boolean;
begin
  if not public.is_admin() then
    raise exception 'Only administrators can change user email addresses';
  end if;

  select is_master_admin into v_is_master from public.profiles where id = p_user_id;
  if v_is_master then
    raise exception 'The master administrator email cannot be changed.';
  end if;

  if exists (
    select 1 from public.profiles
    where lower(email) = v_new_email and id <> p_user_id
  ) then
    raise exception 'A user with this email address already exists.';
  end if;

  update auth.users set
    email = v_new_email,
    email_change = '',
    email_change_token_current = '',
    email_change_token_new = '',
    raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
      || jsonb_build_object('email', v_new_email),
    updated_at = now()
  where id = p_user_id;

  -- auth.identities.email is a generated column (from identity_data->
  -- >'email'), so it must not be updated directly.
  update auth.identities
  set provider_id = v_new_email,
      identity_data = jsonb_build_object('sub', p_user_id::text, 'email', v_new_email),
      updated_at = now()
  where user_id = p_user_id and provider = 'email';

  update public.profiles set email = v_new_email, updated_at = now()
  where id = p_user_id;

  perform public.log_audit('user.email_changed', 'profiles', p_user_id::text,
    jsonb_build_object('email', v_new_email));
end;
$$;

-- ============================================================
-- 5. DEACTIVATE LEGACY DEMO SEED ACCOUNTS
-- ============================================================
-- The app no longer advertises demo credentials. Deactivate the
-- seed demo accounts (records are preserved so history remains
-- intact) so that only real credentials can be used to sign in.
-- To restore a demo account, set is_active back to true.
update public.profiles
set is_active = false,
    updated_at = now()
where id in (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', -- admin@msh.rw (demo)
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', -- employee@msh.rw (demo)
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc'  -- driver@msh.rw (demo)
);
