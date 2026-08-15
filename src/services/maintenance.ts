import { supabase } from '@/config/supabase';
import type { MaintenanceRecord, MaintenanceRecordWithRelations } from '@/types/domain';
import { logAudit } from '@/services/notifications';

const MAINT_SELECT = `
  *,
  vehicle:vehicles(*)
`;

export async function fetchMaintenanceRecords(): Promise<MaintenanceRecordWithRelations[]> {
  const { data, error } = await supabase
    .from('maintenance_records')
    .select(MAINT_SELECT)
    .order('date', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as MaintenanceRecordWithRelations[];
}

export type MaintenanceInput = {
  vehicleId: string;
  serviceType: string;
  description?: string | null;
  date: string;
  odometer: number;
  cost: number;
  provider?: string | null;
  nextServiceDate?: string | null;
  status: 'scheduled' | 'in_progress' | 'completed';
  notes?: string | null;
};

export async function createMaintenanceRecord(
  input: MaintenanceInput,
  recordedBy: string,
): Promise<MaintenanceRecord> {
  const { data, error } = await supabase
    .from('maintenance_records')
    .insert({
      vehicle_id: input.vehicleId,
      service_type: input.serviceType,
      description: input.description ?? null,
      date: input.date,
      odometer: input.odometer,
      cost: input.cost,
      provider: input.provider ?? null,
      next_service_date: input.nextServiceDate ?? null,
      status: input.status,
      notes: input.notes ?? null,
      recorded_by: recordedBy,
    })
    .select('*')
    .single();
  if (error) throw error;
  if (!data) throw new Error('Failed to save maintenance record');

  await supabase
    .from('vehicles')
    .update({
      status: 'maintenance',
      last_service_date: input.date,
    })
    .eq('id', input.vehicleId);
  await logAudit('maintenance.record_added', 'maintenance_records', data.id, {
    vehicle_id: input.vehicleId,
    cost: data.cost,
  });
  return data;
}

export async function deleteMaintenanceRecord(recordId: string): Promise<void> {
  const { error } = await supabase.from('maintenance_records').delete().eq('id', recordId);
  if (error) throw error;
  await logAudit('maintenance.record_deleted', 'maintenance_records', recordId);
}
