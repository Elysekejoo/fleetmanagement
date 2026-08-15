import { supabase } from '@/config/supabase';
import type { GpsLocation, Vehicle, VehicleLocation, VehicleGpsStatus } from '@/types/domain';
import { fetchVehicles } from '@/services/vehicles';
import { fetchDrivers } from '@/services/profiles';

export async function fetchLatestGpsLocations(): Promise<GpsLocation[]> {
  const { data, error } = await supabase
    .from('gps_locations')
    .select('*')
    .order('recorded_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

function latestPerVehicle(locations: GpsLocation[]): Map<string, GpsLocation> {
  const map = new Map<string, GpsLocation>();
  for (const loc of locations) {
    const existing = map.get(loc.vehicle_id);
    if (!existing || loc.recorded_at > existing.recorded_at) map.set(loc.vehicle_id, loc);
  }
  return map;
}

function statusFor(speed: number | null, recordedAt: string): VehicleGpsStatus {
  if (speed != null && speed > 2) return 'moving';
  const minutes = (Date.now() - new Date(recordedAt).getTime()) / 60_000;
  if (minutes < 30) return 'idle';
  return 'stopped';
}

export function mergeVehicleLocations(
  vehicles: Vehicle[],
  drivers: Map<string, { id: string; full_name: string }>,
  locations: GpsLocation[],
): VehicleLocation[] {
  const latest = latestPerVehicle(locations);
  return vehicles
    .filter((v) => v.status !== 'inactive')
    .map((v) => {
      const loc = latest.get(v.id);
      if (!loc) return null;
      return {
        vehicle: v,
        driver: drivers.get(v.current_driver_id ?? '') ?? null,
        latitude: loc.latitude,
        longitude: loc.longitude,
        speed: loc.speed,
        heading: loc.heading,
        recordedAt: loc.recorded_at,
        status: statusFor(loc.speed, loc.recorded_at),
        deviceId: loc.device_id ?? v.gps_device_id,
      };
    })
    .filter((v): v is VehicleLocation => v !== null);
}

export async function fetchVehicleLocations(): Promise<VehicleLocation[]> {
  const [vehicles, drivers, locations] = await Promise.all([
    fetchVehicles(),
    fetchDrivers(),
    fetchLatestGpsLocations(),
  ]);
  const driverMap = new Map(drivers.map((d) => [d.id, { id: d.id, full_name: d.full_name }]));
  return mergeVehicleLocations(vehicles, driverMap, locations);
}

export function subscribeGpsLocations(onChange: () => void): () => void {
  const channel = supabase
    .channel('gps-locations-realtime')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'gps_locations' },
      onChange,
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}