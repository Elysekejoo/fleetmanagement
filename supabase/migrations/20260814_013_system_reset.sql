-- ============================================================
-- FLEET MANAGEMENT SYSTEM — 013 SYSTEM DATA RESET
-- MSH Rwanda · USAID IREME Project
--
-- Dangerous, irreversible "reset all system data" for admins.
-- Wipes every transaction, GPS reading, notification, password
-- reset request and user account EXCEPT the master administrator
-- and the administrator who triggers the reset. Also removes all
-- tracked positions and un-assigns every vehicle so the fleet
-- registry itself (vehicles, departments, branding) is preserved.
--
-- The admin is always asked to confirm before this runs.
-- ============================================================

create or replace function public.admin_reset_system()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_master_id uuid;
  v_caller_id uuid := auth.uid();
  v_rows profiles%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Only an administrator can reset the system.';
  end if;

  if v_caller_id is null then
    raise exception 'You must be signed in to reset the system.';
  end if;

  select id into v_master_id
    from public.profiles
   where is_master_admin = true
   limit 1;

  if v_master_id is null then
    raise exception 'Master administrator not found. The system cannot be reset.';
  end if;

  -- 1. Wipe monitored positions and operational records.
  delete from public.gps_locations;
  delete from public.fuel_records;
  delete from public.maintenance_records;
  delete from public.trips;
  delete from public.travel_requests;

  -- 2. Wipe system chatter and password reset queues.
  delete from public.notifications;
  delete from public.password_reset_requests;

  -- 3. Un-assign all vehicles (registry preserved).
  update public.vehicles
     set current_driver_id = null,
         status = 'available';

  -- 4. Remove every account except master + the caller.
  --    travel_requests/trips already deleted above, so their
  --    ON DELETE RESTRICT foreign keys cannot block the wipe.
  delete from public.profiles
   where id <> v_master_id
     and id <> v_caller_id;

  delete from auth.users
   where id <> v_master_id
     and id <> v_caller_id;

  -- 5. The audit trail is reset too, but a single entry is kept
  --    so there is proof the reset happened and by whom.
  delete from public.audit_logs;
  perform public.log_audit(
    'system.reset',
    'system',
    null,
    jsonb_build_object('executed_by', v_caller_id, 'note', 'All system data was reset.')
  );
end;
$$;

revoke all on function public.admin_reset_system() from public;
revoke all on function public.admin_reset_system() from anon;
grant execute on function public.admin_reset_system() to authenticated;
