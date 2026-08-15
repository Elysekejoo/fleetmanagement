-- ============================================================
-- FLEET MANAGEMENT SYSTEM — 006 RPC PARAMETER FIX
-- MSH Rwanda · Fleet FMS
--
-- PostgREST fails to resolve RPC calls against functions with
-- defaulted parameters ("no matches were found in the schema
-- cache"). The app always sends every parameter, so drop the
-- DEFAULT clauses and require explicit arguments.
-- ============================================================

drop function if exists public.start_trip(uuid, text);

create or replace function public.start_trip(
  p_trip_id uuid,
  p_start_location text
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

drop function if exists public.complete_trip(uuid, text, numeric, numeric, text);

create or replace function public.complete_trip(
  p_trip_id uuid,
  p_end_location text,
  p_distance_km numeric,
  p_fuel_litres numeric,
  p_notes text
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