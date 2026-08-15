-- ============================================================
-- FLEET MANAGEMENT SYSTEM — 003 DEMO SEED DATA
-- MSH Rwanda · Fleet FMS
-- ============================================================

-- Demo users ----------------------------------------------------
-- Passwords (bcrypt, verifiable by GoTrue):
--   admin@msh.rw     → admin123
--   employee@msh.rw  → emp123
--   driver@msh.rw    → driver123
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  confirmation_token, recovery_token,
  email_change_token_current, email_change_token_new,
  reauthentication_token, phone_change_token,
  email_change, phone_change, email_change_confirm_status,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data
) values
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'authenticated', 'authenticated', 'admin@msh.rw',
    crypt('admin123', gen_salt('bf')),
    '', '', '', '', '', '', '', '', 0,
    now(), now(), now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "System Administrator"}'
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'authenticated', 'authenticated', 'employee@msh.rw',
    crypt('emp123', gen_salt('bf')),
    '', '', '', '', '', '', '', '', 0,
    now(), now(), now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "Jeanette Uwase"}'
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'authenticated', 'authenticated', 'driver@msh.rw',
    crypt('driver123', gen_salt('bf')),
    '', '', '', '', '', '', '', '', 0,
    now(), now(), now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "Patrick Habimana"}'
  );

insert into public.profiles (
  id, full_name, email, phone, role,
  employee_number, department, position,
  license_number, license_category, license_expiry,
  is_active
) values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'System Administrator', 'admin@msh.rw', '+250 788 000 001',
    'admin', 'MSH-001', 'Operations', 'Fleet Administrator',
    null, null, null, true
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'Jeanette Uwase', 'employee@msh.rw', '+250 788 000 002',
    'employee', 'MSH-042', 'Programs', 'Program Officer',
    null, null, null, true
  ),
  (
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'Patrick Habimana', 'driver@msh.rw', '+250 788 000 003',
    'driver', 'MSH-007', 'Operations', 'Driver',
    'PC-2007-334512', 'B', '2027-04-30',
    true
  )
on conflict (id) do update set
  full_name = excluded.full_name,
  email = excluded.email,
  phone = excluded.phone,
  role = excluded.role,
  employee_number = excluded.employee_number,
  department = excluded.department,
  position = excluded.position,
  license_number = excluded.license_number,
  license_category = excluded.license_category,
  license_expiry = excluded.license_expiry,
  is_active = excluded.is_active;

-- Vehicles ------------------------------------------------------
insert into public.vehicles (
  id, registration_number, make, model, year, vehicle_type, color,
  status, current_driver_id, gps_device_id, odometer,
  last_service_date, next_service_km
) values
  (
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    'RAD 531 A', 'Toyota', 'Land Cruiser', 2019, '4WD / SUV', 'White',
    'on_trip', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'DEMO-NYG-01', 76450, '2026-06-12', 86500
  ),
  (
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    'RAD 532 B', 'Toyota', 'Hilux', 2021, '4WD / Double Cab', 'Silver',
    'available', null, 'DEMO-RUZ-01', 31220, '2026-07-03', 41500
  ),
  (
    'ffffffff-ffff-4fff-8fff-ffffffffffff',
    'RAD 533 C', 'Nissan', 'Patrol', 2020, '4WD / SUV', 'Black',
    'maintenance', null, null, 58040, '2026-05-20', 68200
  ),
  (
    '99999999-9999-4999-8999-999999999999',
    'RAD 534 D', 'Toyota', 'Hiace', 2018, 'Van', 'Grey',
    'available', null, null, 120900, '2026-07-28', 131000
  );

-- Travel requests ----------------------------------------------
insert into public.travel_requests (
  id, ref_code, requester_id, origin, destination, purpose,
  travel_date, return_date, departure_time, passenger_count,
  priority, status, approved_by, approved_at,
  assigned_vehicle_id, assigned_driver_id, rejection_reason,
  notes, created_at
) values
  (
    '11111111-1111-4111-8111-111111111111', 'REQ-001',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'Kigali (Office)', 'Nyagatare District', 'Support field operations in the northern region',
    '2026-08-15', '2026-08-15', '07:00', 3, 'high',
    'approved', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '2026-08-13 09:12:00+00',
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    null, 'Field monitoring visit to partner site.',
    '2026-08-12 14:03:00+00'
  ),
  (
    '22222222-2222-4222-8222-222222222222', 'REQ-002',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'Kigali (Office)', 'Rusizi District', 'Stakeholder consultation',
    '2026-08-21', '2026-08-22', '06:30', 3, 'normal',
    'pending', null, null, null, null,
    null, 'Two-day consultation with district health office.',
    '2026-08-14 08:40:00+00'
  ),
  (
    '33333333-3333-4333-8333-333333333333', 'REQ-003',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'Kigali (Office)', 'Huye', 'Equipment delivery',
    '2026-07-30', '2026-07-30', '08:00', 2, 'normal',
    'rejected', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '2026-07-28 10:05:00+00',
    null, null, 'No vehicle available; trip postponed to next week.',
    null, '2026-07-27 16:20:00+00'
  ),
  (
    '44444444-4444-4444-8444-444444444444', 'REQ-004',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'Kigali (Office)', 'Musanze', 'Field supervision',
    '2026-07-10', '2026-07-11', '07:00', 2, 'normal',
    'completed', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '2026-07-08 09:00:00+00',
    'ffffffff-ffff-4fff-8fff-ffffffffffff', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    null, null, '2026-07-06 11:30:00+00'
  );

-- Trips ---------------------------------------------------------
insert into public.trips (
  id, request_id, vehicle_id, driver_id,
  start_time, start_location,
  status, created_at
) values
  (
    '55555555-5555-4555-8555-555555555555',
    '11111111-1111-4111-8111-111111111111',
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    '2026-08-14 06:45:00+00', 'Kigali (Office)',
    'active', '2026-08-13 09:15:00+00'
  ),
  (
    '66666666-6666-4666-8666-666666666666',
    '44444444-4444-4444-8444-444444444444',
    'ffffffff-ffff-4fff-8fff-ffffffffffff',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    '2026-07-10 06:55:00+00', 'Kigali (Office)',
    'completed', '2026-07-08 09:05:00+00'
  );

update public.trips
set end_time = '2026-07-11 17:30:00+00',
    end_location = 'Musanze',
    distance_km = 312.5,
    fuel_used_litres = 54.2,
    status = 'completed'
where id = '66666666-6666-4666-8666-666666666666';

-- Fuel records --------------------------------------------------
insert into public.fuel_records (
  vehicle_id, date, fuel_type, quantity, unit_price, total_cost,
  odometer, station, receipt_number, notes, recorded_by
) values
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', '2026-08-13', 'Diesel', 60, 1720, 103200,
   76450, 'Total Energies — Kimironko', 'INV-88213', 'Pre-trip fill for Nyagatare.', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', '2026-08-11', 'Diesel', 45, 1715, 77175,
   31220, 'Stabex — Gikondo', 'INV-88051', null, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('99999999-9999-4999-8999-999999999999', '2026-08-05', 'Diesel', 55, 1710, 94050,
   120900, 'Total Energies — Nyabugogo', 'INV-87520', null, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('ffffffff-ffff-4fff-8fff-ffffffffffff', '2026-07-15', 'Diesel', 50, 1690, 84500,
   58040, 'Stabex — Kigali', 'INV-84810', 'Sent to garage for service afterward.', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

-- Maintenance ---------------------------------------------------
insert into public.maintenance_records (
  vehicle_id, service_type, description, date, odometer, cost,
  provider, next_service_date, status, notes, recorded_by
) values
  ('ffffffff-ffff-4fff-8fff-ffffffffffff', 'Periodic Service',
   'Oil, filter and brake inspection', '2026-08-12', 58040, 245000,
   'MOC Toyota — Kigali', null, 'in_progress',
   'Completed inspection; awaiting brake pads.', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'Interim Service',
   'Full service plus tyre rotation', '2026-06-12', 73100, 198500,
   'MOC Toyota — Kigali', '2026-11-12', 'completed', null, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

-- GPS locations (initial positions for the demo devices) --------
insert into public.gps_locations (vehicle_id, latitude, longitude, speed, heading, device_id, recorded_at) values
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', -1.2917, 30.3224, 42, 48, 'DEMO-NYG-01', now()),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', -2.4689, 28.9048, 0, 0, 'DEMO-RUZ-01', now());