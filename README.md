# Fleet Management System with GPS Tracking

A production-ready **role-based Fleet Management System** (React + TypeScript + Supabase) for organizations (government / NGO style) to manage vehicles, track movements in real time, and control travel requests efficiently.

**Author:** Elyse Kejoo

---

## Overview

- Manage vehicles and drivers
- Handle employee travel requests (approve / reject, assign vehicle + driver)
- Track vehicles in real time on a live map (Leaflet + OpenStreetMap)
- Monitor fuel usage and maintenance
- Role-based dashboards for admin, employee and driver
- Notifications, audit log, and operational reports

---

## Tech Stack

| Layer    | Technology                                                       |
| -------- | ---------------------------------------------------------------- |
| Frontend | React 19, TypeScript, Vite 6                                      |
| Styling  | Tailwind CSS 3.4 (design tokens preserved from the original mockup) |
| Data     | Supabase (PostgreSQL, Auth, Realtime, Row Level Security)         |
| Forms    | React Hook Form + Zod                                            |
| Queries  | TanStack Query                                                   |
| Maps     | Leaflet + React Leaflet                                          |
| Charts   | Recharts                                                         |
| Icons    | lucide-react                                                     |

---

## System Architecture

```
GPS Device (Vehicle)          ← future hardware (ESP32 / NodeMCU + SIM)
        ↓
GPS Ingestion (Supabase RPC / Edge Function)   ← planned
        ↓
Supabase (PostgreSQL + Auth + Realtime + RLS)
        ↓
React Dashboard (Vite SPA)
```

The current version ships with a **demonstration GPS feed** — two simulated vehicles (`DEMO-NYG-01` Nyagatare, `DEMO-RUZ-01` Rusizi) publish a location every 10 seconds. The simulation is isolated in `src/services/gps.ts` and can be replaced by real device ingestion without touching the UI.

---

## Getting Started

### 1. Install

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Required variables:

| Variable                     | Purpose                          |
| ---------------------------- | -------------------------------- |
| `VITE_SUPABASE_URL`          | Supabase project URL             |
| `VITE_SUPABASE_ANON_KEY`     | Supabase anon (public) key       |
| `VITE_MAP_API_KEY`           | Optional map tile provider key   |
| `VITE_GPS_DEMO`              | `true` to run the demo GPS feed  |

### 3. Set up the database

Create a `public` schema inside the Supabase **SQL Editor**:

1. `supabase/migrations/20260814_001_initial_schema.sql` — tables, function RPCs
2. `supabase/migrations/20260814_002_rls_policies.sql` — row level security
3. `supabase/migrations/20260814_003_seed_demo_data.sql` — demo users, vehicles, trips

### 4. Run in development

```bash
npm run dev
```

Open http://localhost:5173

---

## Demo Accounts

| Role     | Email            | Password    |
| -------- | ---------------- | ----------- |
| Admin    | `admin@msh.rw`   | `admin123`  |
| Employee | `employee@msh.rw`| `emp123`    |
| Driver   | `driver@msh.rw`  | `driver123` |

> Production note: the demo users are created by the seed migration. For a fresh hosted project without the CLI, run `npm run db:demo` (requires `SUPABASE_SERVICE_ROLE_KEY` in `.env`) and then assign roles via the SQL Editor.

---

## User Roles

### 1. Admin — full system control
- Manage users (create, edit, deactivate)
- Manage vehicles and assign drivers
- Approve / reject travel requests (assign vehicle + driver)
- Monitor live vehicle tracking
- Manage fuel & maintenance records
- View reports and audit log

### 2. Employee — request vehicles for official travel
- Create travel request (min. 24h in advance, origin → destination, purpose, date, priority)
- View personal requests and status
- Withdraw pending requests
- Update phone / password

### 3. Driver — execute assigned trips
- View assigned upcoming trips, current trip and vehicle
- Start / end trips (updates vehicle and request status automatically)
- Update phone / password

---

## System Workflow

```
Employee → Create Request  (status: pending)
        ↓
Admin → Review → Reject (with reason, requester notified)
        ↓  Approve + Assign Driver & Vehicle  (trip created, both notified)
Driver → Starts Trip       (vehicle → on_trip, request → assigned)
        ↓
Admin → Monitor Live Map   (GPS stream)
        ↓
Driver → Ends Trip         (distance/fuel, request → completed, vehicle → available)
        ↓
Reports generated from trip data
```

Rules enforced by the app AND by Supabase policies:
- Only admins can approve requests / assign vehicles
- Drivers cannot create requests
- Employees cannot access admin features
- A request belongs to its creator and can only be withdrawn while pending

---

## Live GPS Tracking

- **Map:** Leaflet + OpenStreetMap tiles with vehicle markers colored by status (moving / idle / stopped), speed in the popup, and a live refresh.
- **Demo feed:** when `VITE_GPS_DEMO=true`, `src/services/gps.ts` publishes a new `gps_locations` row every 10 seconds for both demo devices.
- **Persistence:** history lands in the `gps_locations` table; UI reads the latest position per vehicle.
- **Future hardware:** a device posts `{ vehicleId, lat, lng, speed, heading }` to an ingestion endpoint which inserts into `gps_locations`. The map and dashboards need no changes.

---

## Project Structure

```
src/
├── components/        # UI kit (Button, DataTable, Modal, StatusBadge…), layout, tracking map
├── config/            # supabase client, environment
├── features/auth/     # AuthContext, LoginPage
├── hooks/             # realtime invalidation
├── lib/               # utils, queryClient
├── pages/
│   ├── admin/         # Dashboard, Users, Drivers, Vehicles, Requests, Tracking, Fuel,
│   │                  # Maintenance, Reports, Audit Logs
│   ├── employee/      # Dashboard, New Request, My Requests
│   └── driver/        # Dashboard, My Trips
├── routes/            # protected / role guards
├── services/          # supabase queries per domain
└── types/             # generated-style database + domain types
supabase/migrations/   # SQL schema, RLS, seed
prototype/             # original static HTML prototype (design reference)
```

---

## Security Model

- Supabase **Row Level Security** on every table (`002_rls_policies.sql`)
- Server-side checks via `security definer` RPCs for privileged operations where the RLS matrix cannot express them (`notify_user`, `log_audit`, `get_dashboard_stats`)
- Users are **deactivated**, never hard-deleted
- All admin actions are recorded in `audit_logs`
- Secrets live only in `.env` / `.env.local` — never committed

---

## Scripts

| Script            | Action                                  |
| ----------------- | --------------------------------------- |
| `npm run dev`     | Vite dev server                         |
| `npm run build`   | Type-check (`tsc --noEmit`) + Vite build |
| `npm run preview` | Serve the production build              |
| `npm run db:demo` | Create demo auth users via service role |

---

## Roadmap

- Real GPS hardware ingestion (ESP32 / NodeMCU + SIM), offline buffering
- Mobile application
- Advanced analytics / export to Excel
- Realtime presence across all pages
- Fuel consumption analytics per vehicle