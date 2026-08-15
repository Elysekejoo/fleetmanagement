import { isDemoMode } from '@/config/env';
import { fetchVehicles } from '@/services/vehicles';
import { fetchDrivers } from '@/services/profiles';
import { fetchVehicleLocations, subscribeGpsLocations } from '@/services/gps';
import type { Profile, Vehicle, VehicleLocation } from '@/types/domain';

export type TrackingMode = 'demo' | 'live';

export interface TrackingSource {
  readonly mode: TrackingMode;
  load(): Promise<VehicleLocation[]>;
  subscribe?(onChange: () => void): () => void;
}

const DEMO_TICK_MS = 5_000;
const DEMO_REG_PREFIX = 'DEMO-';

function builtinVehicle(reg: string, make: string, model: string, year: number, type: string): Vehicle {
  const now = new Date().toISOString();
  return {
    id: `demo-${reg.toLowerCase()}`,
    registration_number: reg,
    make,
    model,
    year,
    vehicle_type: type,
    color: null,
    status: 'available',
    current_driver_id: null,
    gps_device_id: `demo-gps-${reg.slice(-2).toLowerCase()}`,
    odometer: 0,
    last_service_date: null,
    next_service_km: 0,
    created_at: now,
    updated_at: now,
  };
}

function builtinDriver(fullName: string, email: string): Profile {
  return {
    id: `demo-${email.split('@')[0]}`,
    full_name: fullName,
    email,
    phone: null,
    role: 'driver',
    employee_number: null,
    department_id: null,
    position: null,
    license_number: null,
    license_category: null,
    license_expiry: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

interface SimVehicle {
  vehicle: Vehicle;
  driver: Profile | null;
  waypoints: Array<[number, number]>;
  waypointIndex: number;
  progress: number;
  speedKph: number;
}

function waypointRing(lat: number, lng: number, radiusDeg: number, count: number): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    points.push([lat + Math.sin(a) * radiusDeg, lng + Math.cos(a) * radiusDeg]);
  }
  return points;
}

function distanceKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a[0] * Math.PI) / 180) * Math.cos((b[0] * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

function bearing(a: [number, number], b: [number, number]): number {
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const la1 = (a[0] * Math.PI) / 180;
  const la2 = (b[0] * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(la2);
  const x = Math.cos(la1) * Math.sin(la2) - Math.sin(la1) * Math.cos(la2) * Math.cos(dLng);
  return (Math.atan2(y, x) * 180) / Math.PI;
}

function insertGeo(a: [number, number], b: [number, number], t: number): [number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

function createDemoFleet(): SimVehicle[] {
  return [
    {
      vehicle: builtinVehicle('DEMO-NYG-01', 'Toyota', 'Land Cruiser', 2021, '4WD/SUV'),
      driver: builtinDriver('Jean Bosco Habimana', 'demo.nyagatare@msh.rw'),
      waypoints: waypointRing(-1.2869, 30.3189, 0.035, 7),
      waypointIndex: 0,
      progress: 0,
      speedKph: 42,
    },
    {
      vehicle: builtinVehicle('DEMO-RUZ-01', 'Toyota', 'Hilux', 2020, 'Pickup/Truck'),
      driver: builtinDriver('Claudine Uwase', 'demo.rusizi@msh.rw'),
      waypoints: waypointRing(-2.484, 28.897, 0.03, 6),
      waypointIndex: 2,
      progress: 0.4,
      speedKph: 28,
    },
    {
      vehicle: builtinVehicle('DEMO-KGL-01', 'Isuzu', 'D-Max', 2022, 'Pickup/Truck'),
      driver: builtinDriver('Eric Niyonzima', 'demo.kigali@msh.rw'),
      waypoints: waypointRing(-1.9441, 30.0619, 0.045, 8),
      waypointIndex: 5,
      progress: 0.2,
      speedKph: 12,
    },
  ];
}

async function loadRegistryFleet(): Promise<SimVehicle[] | null> {
  try {
    const [vehicles, drivers] = await Promise.all([fetchVehicles(), fetchDrivers()]);
    const active = vehicles.filter((v) => v.status !== 'inactive' && v.gps_device_id);
    if (active.length === 0) return null;
    const driverMap = new Map(drivers.map((d) => [d.id, d]));
    const bases: Array<[number, number]> = [
      [-1.2869, 30.3189],
      [-2.484, 28.897],
      [-1.9441, 30.0619],
    ];
    return active.map((vehicle, i) => {
      const base = bases[i % bases.length];
      const spin = Math.floor(i / bases.length);
      return {
        vehicle,
        driver: driverMap.get(vehicle.current_driver_id ?? '') ?? null,
        waypoints: waypointRing(base[0], base[1], 0.03 + spin * 0.015, 6 + spin),
        waypointIndex: (i * 2) % 6,
        progress: (i % 5) / 5,
        speedKph: 8 + ((i * 13) % 45),
      };
    });
  } catch {
    return null;
  }
}

class DemoTrackingSource implements TrackingSource {
  readonly mode: TrackingMode = 'demo';
  private fleet: SimVehicle[] | null = null;
  private lastTick = 0;

  async load(): Promise<VehicleLocation[]> {
    if (!this.fleet) {
      this.fleet = (await loadRegistryFleet()) ?? createDemoFleet();
    }
    this.step();
    return this.toLocations();
  }

  subscribe(onChange: () => void): () => void {
    const id = window.setInterval(onChange, DEMO_TICK_MS);
    return () => window.clearInterval(id);
  }

  private step(): void {
    if (!this.fleet) return;
    const now = Date.now();
    if (this.lastTick > 0) {
      const elapsedHours = (now - this.lastTick) / 3_600_000;
      for (const sim of this.fleet) {
        const from = sim.waypoints[sim.waypointIndex];
        const to = sim.waypoints[(sim.waypointIndex + 1) % sim.waypoints.length];
        const legKm = distanceKm(from, to);
        sim.progress += (sim.speedKph * elapsedHours) / legKm;
        if (sim.progress >= 1) {
          sim.progress = 0;
          sim.waypointIndex = (sim.waypointIndex + 1) % sim.waypoints.length;
        }
        const wobble = Math.sin(now / 60_000 + sim.waypointIndex) * 6;
        sim.speedKph = Math.max(0, Math.round(sim.speedKph + wobble * 4) / 2);
      }
    }
    this.lastTick = now;
  }

  private toLocations(): VehicleLocation[] {
    if (!this.fleet) return [];
    const nowIso = new Date().toISOString();
    return this.fleet.map((sim) => {
      const from = sim.waypoints[sim.waypointIndex];
      const to = sim.waypoints[(sim.waypointIndex + 1) % sim.waypoints.length];
      const point = insertGeo(from, to, sim.progress);
      return {
        vehicle: sim.vehicle,
        driver: sim.driver,
        latitude: point[0],
        longitude: point[1],
        speed: Math.max(0, Math.round(sim.speedKph)),
        heading: bearing(from, to),
        recordedAt: nowIso,
        status: sim.speedKph > 8 ? 'moving' : sim.speedKph > 2 ? 'idle' : 'stopped',
        deviceId: sim.vehicle.gps_device_id ?? 'demo-gps',
      };
    });
  }
}

class LiveTrackingSource implements TrackingSource {
  readonly mode: TrackingMode = 'live';

  async load(): Promise<VehicleLocation[]> {
    return fetchVehicleLocations();
  }

  subscribe(onChange: () => void): () => void {
    return subscribeGpsLocations(onChange);
  }
}

let currentSource: TrackingSource | null = null;

export function getTrackingSource(): TrackingSource {
  if (!currentSource) {
    currentSource = isDemoMode ? new DemoTrackingSource() : new LiveTrackingSource();
  }
  return currentSource;
}

export function isDemoTrackingEnabled(): boolean {
  return getTrackingSource().mode === 'demo';
}

export function isDemoRegistration(regNumber: string): boolean {
  return regNumber.toUpperCase().startsWith(DEMO_REG_PREFIX);
}