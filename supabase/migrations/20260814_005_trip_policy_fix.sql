-- ============================================================
-- FLEET MANAGEMENT SYSTEM — 005 TRIP POLICY FIX
-- MSH Rwanda · USAID IREME Project
--
-- 1. Trips are created by admins when approving a request;
--    the trips table had no INSERT policy, so approval failed
--    with "new row violates row-level security policy".
-- 2. Drivers may no longer edit trip rows directly (this
--    bypassed vehicle/request status sync and caused "ended"
--    trips that left the vehicle on_trip). Start/complete must
--    go through start_trip / complete_trip RPCs.
-- ============================================================

create policy trips_insert_admin on public.trips
  for insert
  to authenticated
  with check (is_admin());

drop policy if exists trips_update_active_driver on public.trips;