import { supabase } from '@/config/supabase';
import type { FuelRecord, FuelRecordWithRelations } from '@/types/domain';
import { logAudit } from '@/services/notifications';

const FUEL_SELECT = `
  *,
  vehicle:vehicles(*),
  recordedByProfile:profiles!fuel_records_recorded_by_fkey(*)
`;

export async function fetchFuelRecords(): Promise<FuelRecordWithRelations[]> {
  const { data, error } = await supabase
    .from('fuel_records')
    .select(FUEL_SELECT)
    .order('date', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as FuelRecordWithRelations[];
}

export type FuelInput = {
  vehicleId: string;
  date: string;
  fuelType: string;
  quantity: number;
  unitPrice: number;
  odometer: number;
  station: string;
  receiptNumber?: string | null;
  notes?: string | null;
};

export async function createFuelRecord(input: FuelInput, recordedBy: string): Promise<FuelRecord> {
  const { data, error } = await supabase
    .from('fuel_records')
    .insert({
      vehicle_id: input.vehicleId,
      date: input.date,
      fuel_type: input.fuelType,
      quantity: input.quantity,
      unit_price: input.unitPrice,
      total_cost: Math.round(input.quantity * input.unitPrice),
      odometer: input.odometer,
      station: input.station,
      receipt_number: input.receiptNumber ?? null,
      notes: input.notes ?? null,
      recorded_by: recordedBy,
    })
    .select('*')
    .single();
  if (error) throw error;
  if (!data) throw new Error('Failed to save fuel record');
  await logAudit('fuel.record_added', 'fuel_records', data.id, {
    vehicle_id: input.vehicleId,
    total_cost: data.total_cost,
  });
  return data;
}

export async function deleteFuelRecord(recordId: string): Promise<void> {
  const { error } = await supabase.from('fuel_records').delete().eq('id', recordId);
  if (error) throw error;
  await logAudit('fuel.record_deleted', 'fuel_records', recordId);
}
