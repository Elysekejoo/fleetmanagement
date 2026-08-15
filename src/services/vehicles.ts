import { supabase } from '@/config/supabase';
import type { Vehicle, VehicleRow } from '@/types/domain';
import { logAudit } from '@/services/notifications';

export async function fetchVehicles(): Promise<Vehicle[]> {
  const { data, error } = await supabase.from('vehicles').select('*').order('registration_number');
  if (error) throw error;
  return data ?? [];
}

export type VehicleInput = {
  registrationNumber: string;
  make: string;
  model: string;
  year: number;
  vehicleType: string;
  color?: string | null;
  gpsDeviceId?: string | null;
  odometer: number;
  nextServiceKm: number;
};

export async function createVehicle(input: VehicleInput): Promise<Vehicle> {
  const { data, error } = await supabase
    .from('vehicles')
    .insert({
      registration_number: input.registrationNumber,
      make: input.make,
      model: input.model,
      year: input.year,
      vehicle_type: input.vehicleType,
      color: input.color ?? null,
      status: 'available',
      current_driver_id: null,
      gps_device_id: input.gpsDeviceId ?? null,
      odometer: input.odometer,
      next_service_km: input.nextServiceKm,
      last_service_date: null,
    })
    .select('*')
    .single();
  if (error) throw error;
  if (!data) throw new Error('Failed to create vehicle');
  await logAudit('vehicle.created', 'vehicles', data.id, { registration_number: data.registration_number });
  return data;
}

export async function updateVehicle(vehicleId: string, input: VehicleInput): Promise<void> {
  const { error } = await supabase
    .from('vehicles')
    .update({
      registration_number: input.registrationNumber,
      make: input.make,
      model: input.model,
      year: input.year,
      vehicle_type: input.vehicleType,
      color: input.color ?? null,
      gps_device_id: input.gpsDeviceId ?? null,
      odometer: input.odometer,
      next_service_km: input.nextServiceKm,
    })
    .eq('id', vehicleId);
  if (error) throw error;
  await logAudit('vehicle.updated', 'vehicles', vehicleId, { registration_number: input.registrationNumber });
}

export async function setVehicleStatus(vehicleId: string, status: VehicleRow['status']): Promise<void> {
  const { error } = await supabase.from('vehicles').update({ status }).eq('id', vehicleId);
  if (error) throw error;
  await logAudit('vehicle.status_changed', 'vehicles', vehicleId, { status });
}

export async function assignVehicleDriver(vehicleId: string, driverId: string | null): Promise<void> {
  const { error } = await supabase
    .from('vehicles')
    .update({ current_driver_id: driverId, status: driverId ? 'assigned' : 'available' })
    .eq('id', vehicleId);
  if (error) throw error;
  await logAudit(driverId ? 'vehicle.driver_assigned' : 'vehicle.driver_unassigned', 'vehicles', vehicleId, {
    driver_id: driverId,
  });
}

export async function deleteVehicle(vehicleId: string): Promise<void> {
  const { error } = await supabase.from('vehicles').delete().eq('id', vehicleId);
  if (error) throw error;
  await logAudit('vehicle.deleted', 'vehicles', vehicleId);
}

export async function unassignDriverFromRequests(driverId: string): Promise<void> {
  await supabase
    .from('travel_requests')
    .update({ assigned_driver_id: null })
    .eq('assigned_driver_id', driverId)
    .in('status', ['pending', 'approved', 'assigned']);
}
