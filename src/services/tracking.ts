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
    is_master_admin: false,
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
      // Nyagatare → Byumba → Kigali → Rwamagana → Nyagatare
      waypoints: [
        [-1.2869, 30.3189],
        [-1.5765, 30.077],
        [-1.9441, 30.0619],
        [-1.9538, 30.4421],
      ],
      waypointIndex: 0,
      progress: 0,
      speedKph: 42,
    },
    {
      vehicle: builtinVehicle('DEMO-RUZ-01', 'Toyota', 'Hilux', 2020, 'Pickup/Truck'),
      driver: builtinDriver('Claudine Uwase', 'demo.rusizi@msh.rw'),
      // Rusizi → Huye → Nyanza → Kigali → Rusizi
      waypoints: [
        [-2.484, 28.897],
        [-2.5234, 29.7459],
        [-2.3512, 29.7418],
        [-1.9441, 30.0619],
      ],
      waypointIndex: 1,
      progress: 0.25,
      speedKph: 35,
    },
  ];
}

async function loadRegistryFleet(): Promise<SimVehicle[] | null> {
  try {
    const [vehicles, drivers] = await Promise.all([fetchVehicles(), fetchDrivers()]);
    const active = vehicles
      .filter((v) => v.status !== 'inactive' && v.gps_device_id)
      .slice(0, 2);
    if (active.length === 0) return null;
    const driverMap = new Map(drivers.map((d) => [d.id, d]));
    // R1: Nyagatare → Byumba → Kigali,  R2: Rusizi → Huye → Kigali
    const routes: Array<Array<[number, number]>> = [
      [
        [-1.2869, 30.3189],
        [-1.5765, 30.077],
        [-1.9441, 30.0619],
      ],
      [
        [-2.484, 28.897],
        [-2.5234, 29.7459],
        [-2.3512, 29.7418],
        [-1.9441, 30.0619],
      ],
    ];
    return active.map((vehicle, i) => {
      const waypoints = routes[i % routes.length] ?? routes[0];
      return {
        vehicle,
        driver: driverMap.get(vehicle.current_driver_id ?? '') ?? null,
        waypoints,
        waypointIndex: 0,
        progress: (i % 10) / 10,
        speedKph: 25 + ((i * 17) % 40),
      };
    });
  } catch {
    return null;
  }
}

class DemoTrackingSource implements TrackingSource {
  readonly mode: TrackingMode = 'demo';
  private fleet: SimVehicle[] | null = null;
  private lastTick = Date.now();

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
      for (const sim of this.fleet) {
        const n = sim.waypoints.length;
        if (n < 2) continue;
        // Advance ~16% of the current leg per tick (~30s to finish a leg at 5s ticks),
        // so cars always visibly travel between waypoints no matter the zoom level.
        sim.progress += 0.16;
        if (sim.progress >= 1) {
          sim.progress = 0;
          sim.waypointIndex = (sim.waypointIndex + 1) % n;
        }
        const wobble = Math.sin(now / 60_000 + sim.waypointIndex) * 6;
        sim.speedKph = Math.max(8, Math.round(sim.speedKph + wobble * 4) / 2);
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
  private fallback: DemoTrackingSource | null = null;

  async load(): Promise<VehicleLocation[]> {
    const real = await fetchVehicleLocations();
    if (real.length > 0) return real;
    if (!this.fallback) this.fallback = new DemoTrackingSource();
    return this.fallback.load();
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