import { supabase } from '@/config/supabase';
import type { Profile, RequestStatus, RequestWithRelations, TravelRequestRow } from '@/types/domain';
import { logAudit, notifyUser } from '@/services/notifications';

const REQUEST_SELECT = `
  *,
  requester:profiles!travel_requests_requester_id_fkey(*),
  approvedBy:profiles!travel_requests_approved_by_fkey(*),
  assignedDriver:profiles!travel_requests_assigned_driver_id_fkey(*),
  assignedVehicle:vehicles(*)
`;

export async function fetchRequests(status?: RequestStatus): Promise<RequestWithRelations[]> {
  let query = supabase.from('travel_requests').select(REQUEST_SELECT).order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as RequestWithRelations[];
}

export async function fetchMyRequests(requesterId: string): Promise<RequestWithRelations[]> {
  const { data, error } = await supabase
    .from('travel_requests')
    .select(REQUEST_SELECT)
    .eq('requester_id', requesterId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as RequestWithRelations[];
}

export async function fetchDriverRequests(driverId: string): Promise<RequestWithRelations[]> {
  const { data, error } = await supabase
    .from('travel_requests')
    .select(REQUEST_SELECT)
    .eq('assigned_driver_id', driverId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as RequestWithRelations[];
}

export async function fetchRequestById(id: string): Promise<RequestWithRelations | null> {
  const { data, error } = await supabase
    .from('travel_requests')
    .select(REQUEST_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as unknown as RequestWithRelations | null;
}

export type NewRequestInput = {
  requesterId: string;
  origin: string;
  destination: string;
  purpose: string;
  travelDate: string;
  returnDate: string | null;
  departureTime: string | null;
  passengerCount: number;
  priority: 'low' | 'normal' | 'high';
  notes?: string | null;
};

export async function createRequest(input: NewRequestInput): Promise<TravelRequestRow> {
  const { data, error } = await supabase
    .from('travel_requests')
    .insert({
      requester_id: input.requesterId,
      origin: input.origin,
      destination: input.destination,
      purpose: input.purpose,
      travel_date: input.travelDate,
      return_date: input.returnDate,
      departure_time: input.departureTime,
      passenger_count: input.passengerCount,
      priority: input.priority,
      status: 'pending',
      notes: input.notes ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  if (!data) throw new Error('Failed to create request');

  const { data: admins } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin')
    .eq('is_active', true);
  const requester = await fetchProfileName(input.requesterId);
  for (const admin of admins ?? []) {
    await notifyUser(
      admin.id,
      'New travel request',
      `${requester} submitted request to ${input.destination} (${data.ref_code}).`,
      'info',
      { request_id: data.id },
    );
  }
  await logAudit('request.created', 'travel_requests', data.id, { ref_code: data.ref_code });
  return data;
}

async function fetchProfileName(userId: string): Promise<string> {
  const { data } = await supabase.from('profiles').select('full_name').eq('id', userId).maybeSingle();
  return data?.full_name ?? 'An employee';
}

export async function cancelRequest(requestId: string, requesterId: string): Promise<void> {
  const { error } = await supabase
    .from('travel_requests')
    .update({ status: 'cancelled' })
    .eq('id', requestId)
    .eq('requester_id', requesterId)
    .eq('status', 'pending');
  if (error) throw error;
  await logAudit('request.cancelled', 'travel_requests', requestId);
}

export type ApproveInput = {
  requestId: string;
  approvedBy: string;
  vehicleId: string;
  driverId: string;
  notes?: string;
};

export async function approveRequest(input: ApproveInput): Promise<void> {
  const request = await fetchRequestById(input.requestId);
  if (!request) throw new Error('Request not found');
  if (request.status !== 'pending' && request.status !== 'assigned') {
    throw new Error(
      `This request is "${request.status}" and can no longer be approved or assigned.`,
    );
  }
  if (!input.vehicleId || !input.driverId) {
    throw new Error('A vehicle and a driver are required before a trip can be assigned.');
  }

  const { error } = await supabase
    .from('travel_requests')
    .update({
      status: 'assigned',
      approved_by: input.approvedBy,
      approved_at: new Date().toISOString(),
      assigned_vehicle_id: input.vehicleId,
      assigned_driver_id: input.driverId,
      rejection_reason: null,
      notes: input.notes ?? request.notes,
    })
    .eq('id', input.requestId);
  if (error) throw error;

  const { error: vehicleError } = await supabase
    .from('vehicles')
    .update({ status: 'assigned' })
    .eq('id', input.vehicleId);
  if (vehicleError) throw vehicleError;

  // Sync (or create) the linked trip so reassigning a partially
  // assigned request actually changes the vehicle and driver.
  const { data: existingTrip, error: tripQueryError } = await supabase
    .from('trips')
    .select('id')
    .eq('request_id', input.requestId)
    .maybeSingle();
  if (tripQueryError) throw tripQueryError;
  if (existingTrip) {
    const { error: tripUpdateError } = await supabase
      .from('trips')
      .update({ vehicle_id: input.vehicleId, driver_id: input.driverId, status: 'scheduled' })
      .eq('id', existingTrip.id);
    if (tripUpdateError) throw tripUpdateError;
  } else {
    const { error: tripError } = await supabase.from('trips').insert({
      request_id: input.requestId,
      vehicle_id: input.vehicleId,
      driver_id: input.driverId,
      status: 'scheduled',
    });
    if (tripError) throw tripError;
  }

  const driver = await fetchProfileName(input.driverId);
  const vehicle = await fetchVehiclePlate(input.vehicleId);
  await notifyUser(
    input.driverId,
    'Trip assigned',
    `You have been assigned trip ${request.ref_code} — ${request.destination} with vehicle ${vehicle}.`,
    'success',
    { request_id: input.requestId },
  );
  await notifyUser(
    request.requester_id,
    'Request approved',
    `Your request ${request.ref_code} to ${request.destination} was approved. Driver: ${driver}, Vehicle: ${vehicle}.`,
    'success',
    { request_id: input.requestId },
  );
  await logAudit('request.approved', 'travel_requests', input.requestId, {
    vehicle_id: input.vehicleId,
    driver_id: input.driverId,
  });
}

async function fetchVehiclePlate(vehicleId: string): Promise<string> {
  const { data } = await supabase.from('vehicles').select('registration_number').eq('id', vehicleId).maybeSingle();
  return data?.registration_number ?? '—';
}

export async function rejectRequest(
  requestId: string,
  approvedBy: string,
  reason: string,
): Promise<void> {
  const request = await fetchRequestById(requestId);
  if (!request) throw new Error('Request not found');

  const { error } = await supabase
    .from('travel_requests')
    .update({
      status: 'rejected',
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
      rejection_reason: reason,
    })
    .eq('id', requestId);
  if (error) throw error;

  await notifyUser(
    request.requester_id,
    'Request rejected',
    `Your request ${request.ref_code} to ${request.destination} was rejected. Reason: ${reason}`,
    'error',
    { request_id: requestId },
  );
  await logAudit('request.rejected', 'travel_requests', requestId, { reason });
}

export type { Profile };
