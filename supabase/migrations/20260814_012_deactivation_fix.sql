-- ============================================================
-- FLEET MANAGEMENT SYSTEM - 012 DEACTIVATION FIX
-- MSH Rwanda . USAID IREME Project
--
-- 1. Fix profiles_read RLS: admins must see deactivated users
--    so they can manage / re-activate them. Previously a user
--    who was deactivated disappeared from every screen forever
--    (they could not be re-activated or edited).
-- 2. Replace direct profile updates with a validated
--    admin_set_user_active RPC that returns meaningful errors:
--    - only admins may change access
--    - the master administrator can never be deactivated
--    - you cannot deactivate your own account
--    - the last active administrator cannot be deactivated
--      (prevents locking everyone out of the system)
-- ============================================================

-- 1. RLS READ FIX ----------------------------------------------
-- Non-admins only see active staff (privacy + pickers).
-- Admins see every profile (active or not) so deactivated
-- accounts remain visible and manageable.
drop policy if exists profiles_read on public.profiles;

create policy profiles_read_active on public.profiles
  for select
  to authenticated
  using (is_active = true);

create policy profiles_read_all_admin on public.profiles
  for select
  to authenticated
  using (is_admin());

-- 2. VALIDATED ACTIVATION / DEACTIVATION RPC -------------------
create or replace function public.admin_set_user_active(
  p_user_id uuid,
  p_active boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target public.profiles;
  v_active_admins bigint;
begin
  if not public.is_admin() then
    raise exception 'Only administrators can change user access.';
  end if;

  select * into v_target from public.profiles where id = p_user_id;
  if not found then
    raise exception 'User not found.';
  end if;

  if v_target.is_master_admin then
    raise exception 'The master administrator account cannot be deactivated or its access changed.';
  end if;

  if p_active = false and v_target.id = auth.uid() then
    raise exception 'You cannot deactivate your own account.';
  end if;

  if p_active = false then
    if v_target.role = 'admin' then
      select count(*) into v_active_admins
        from public.profiles
       where role = 'admin' and is_active and id <> p_user_id;
      if v_active_admins = 0 then
        raise exception 'You cannot deactivate the last active administrator. Promote another user to administrator first.';
      end if;
    end if;
  end if;

  update public.profiles set is_active = p_active, updated_at = now()
  where id = p_user_id;

  perform public.log_audit(
    case when p_active then 'user.activated' else 'user.deactivated' end,
    'profiles',
    p_user_id::text,
    jsonb_build_object('full_name', v_target.full_name, 'email', v_target.email)
  );
end;
$$;
