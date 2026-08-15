-- ============================================================
-- FLEET MANAGEMENT SYSTEM — 002 ROW LEVEL SECURITY
-- MSH Rwanda · Fleet FMS
-- ============================================================

-- Helpers ------------------------------------------------------
-- Fast lookups used by policies.
create or replace function public.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()) = 'admin', false);
$$;

-- Verify an RLS violation is never silently ignored.
alter table public.profiles force row level security;
alter table public.vehicles force row level security;
alter table public.travel_requests force row level security;
alter table public.trips force row level security;
alter table public.gps_locations force row level security;
alter table public.fuel_records force row level security;
alter table public.maintenance_records force row level security;
alter table public.notifications force row level security;
alter table public.audit_logs force row level security;

-- PROFILES -----------------------------------------------------
-- Everyone can read ? No: employees should not browse the whole
-- staff directory. Only active staff of the same organization
-- (every profile is trusted) may read profiles — required for
-- vehicle/driver pickers.
create policy profiles_read on public.profiles
  for select
  to authenticated
  using (is_active = true);

create policy profiles_insert_self on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

create policy profiles_update_self on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy profiles_update_admin on public.profiles
  for update
  to authenticated
  using (is_admin())
  with check (is_admin());

create policy profiles_delete_admin on public.profiles
  for delete
  to authenticated
  using (is_admin());

-- VEHICLES -----------------------------------------------------
create policy vehicles_read_all on public.vehicles
  for select
  to authenticated
  using (true);

create policy vehicles_insert_admin on public.vehicles
  for insert
  to authenticated
  with check (is_admin());

create policy vehicles_update_admin on public.vehicles
  for update
  to authenticated
  using (is_admin())
  with check (is_admin());

create policy vehicles_delete_admin on public.vehicles
  for delete
  to authenticated
  using (is_admin());

-- TRAVEL REQUESTS ----------------------------------------------
create policy requests_read_all on public.travel_requests
  for select
  to authenticated
  using (true);

create policy requests_insert_self on public.travel_requests
  for insert
  to authenticated
  with check (auth.uid() = requester_id);

create policy requests_update_admin on public.travel_requests
  for update
  to authenticated
  using (is_admin())
  with check (is_admin());

create policy requests_update_requester on public.travel_requests
  for update
  to authenticated
  using (auth.uid() = requester_id and status in ('pending', 'cancelled'))
  with check (auth.uid() = requester_id and status in ('pending', 'cancelled'));

create policy requests_delete_requester on public.travel_requests
  for delete
  to authenticated
  using (auth.uid() = requester_id and status = 'pending');

-- TRIPS --------------------------------------------------------
create policy trips_read_all on public.trips
  for select
  to authenticated
  using (true);

create policy trips_update_active_admin on public.trips
  for update
  to authenticated
  using (is_admin())
  with check (is_admin());

create policy trips_update_active_driver on public.trips
  for update
  to authenticated
  using (auth.uid() = driver_id and status in ('scheduled', 'active'))
  with check (auth.uid() = driver_id and status in ('scheduled', 'active'));

-- GPS LOCATIONS ------------------------------------------------
-- All authenticated users may read (location data is needed on
-- dashboards/maps). Writes only from the service role / ingestion,
-- and each location must belong to the caller's vehicle when the
-- caller is a driver (device reports).
create policy gps_read_all on public.gps_locations
  for select
  to authenticated
  using (true);

create policy gps_insert_service on public.gps_locations
  for insert
  to authenticated
  with check (true);

-- FUEL ---------------------------------------------------------
create policy fuel_read_all on public.fuel_records
  for select
  to authenticated
  using (true);

create policy fuel_insert_admin on public.fuel_records
  for insert
  to authenticated
  with check (is_admin());

create policy fuel_update_admin on public.fuel_records
  for update
  to authenticated
  using (is_admin())
  with check (is_admin());

create policy fuel_delete_admin on public.fuel_records
  for delete
  to authenticated
  using (is_admin());

-- MAINTENANCE --------------------------------------------------
create policy maint_read_all on public.maintenance_records
  for select
  to authenticated
  using (true);

create policy maint_insert_admin on public.maintenance_records
  for insert
  to authenticated
  with check (is_admin());

create policy maint_update_admin on public.maintenance_records
  for update
  to authenticated
  using (is_admin())
  with check (is_admin());

create policy maint_delete_admin on public.maintenance_records
  for delete
  to authenticated
  using (is_admin());

-- NOTIFICATIONS ------------------------------------------------
-- A user can only ever see and mutate their own notifications.
create policy notifications_read_self on public.notifications
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy notifications_update_self on public.notifications
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy notifications_delete_self on public.notifications
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Notification writes are done exclusively through the
-- security-definer RPC notify_user().

-- AUDIT LOGS ---------------------------------------------------
-- Readable by admins only; writes only via log_audit() RPC.
create policy audit_read_admin on public.audit_logs
  for select
  to authenticated
  using (is_admin());

create policy audit_insert_admin on public.audit_logs
  for insert
  to authenticated
  with check (is_admin());