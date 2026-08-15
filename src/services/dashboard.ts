import { supabase } from '@/config/supabase';
import type { DashboardStats } from '@/types/domain';

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const { data, error } = await supabase.rpc('get_dashboard_stats');
  if (error) throw error;
  const row = data?.[0];
  if (!row) throw new Error('Unable to load dashboard statistics');
  return {
    totalVehicles: row.total_vehicles,
    availableVehicles: row.available_vehicles,
    vehiclesOnTrip: row.vehicles_on_trip,
    vehiclesMaintenance: row.vehicles_maintenance,
    totalDrivers: row.total_drivers,
    totalEmployees: row.total_employees,
    pendingRequests: row.pending_requests,
    activeTrips: row.active_trips,
    completedTrips: row.completed_trips,
    fuelExpenditure: row.fuel_expenditure,
    maintenanceExpenditure: row.maintenance_expenditure,
  };
}