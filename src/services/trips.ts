import { supabase } from '@/config/supabase';
import type { Trip, TripWithRelations } from '@/types/domain';
import { logAudit } from '@/services/notifications';

const TRIP_SELECT = `
  *,
  request:travel_requests(*),
  vehicle:vehicles(*),
  driver:profiles!trips_driver_id_fkey(*)
`;

export async function fetchTrips(): Promise<TripWithRelations[]> {
  const { data, error } = await supabase.from('trips').select(TRIP_SELECT).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as TripWithRelations[];
}

export async function fetchDriverTrips(driverId: string): Promise<TripWithRelations[]> {
  const { data, error } = await supabase
    .from('trips')
    .select(TRIP_SELECT)
    .eq('driver_id', driverId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as TripWithRelations[];
}

export async function fetchActiveTrips(): Promise<TripWithRelations[]> {
  const { data, error } = await supabase
    .from('trips')
    .select(TRIP_SELECT)
    .eq('status', 'active')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as TripWithRelations[];
}

export async function fetchTripById(id: string): Promise<TripWithRelations | null> {
  const { data, error } = await supabase.from('trips').select(TRIP_SELECT).eq('id', id).maybeSingle();
  if (error) throw error;
  return (data ?? null) as unknown as TripWithRelations | null;
}

export async function startTrip(tripId: string, startLocation: string): Promise<Trip> {
  const { data: trip, error } = await supabase.from('trips').select('*').eq('id', tripId).maybeSingle();
  if (error) throw error;
  if (!trip) throw new Error('Trip not found');

  const { error: rpcError } = await supabase.rpc('start_trip', {
    p_trip_id: tripId,
    p_start_location: startLocation || null,
  });
  if (rpcError) throw rpcError;

  return { ...trip, status: 'active', start_time: new Date().toISOString(), start_location: startLocation };
}

export type EndTripInput = {
  tripId: string;
  endLocation: string;
  distanceKm: number | null;
  fuelUsedLitres: number | null;
  notes?: string | null;
};

export async function endTrip(input: EndTripInput): Promise<void> {
  const { error } = await supabase.rpc('complete_trip', {
    p_trip_id: input.tripId,
    p_end_location: input.endLocation || null,
    p_distance_km: input.distanceKm ?? null,
    p_fuel_litres: input.fuelUsedLitres ?? null,
    p_notes: input.notes ?? null,
  });
  if (error) throw error;
  await logAudit('trip.completed', 'trips', input.tripId, {
    distance_km: input.distanceKm,
    fuel_litres: input.fuelUsedLitres,
  });
}
