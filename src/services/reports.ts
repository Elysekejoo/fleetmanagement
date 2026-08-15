import type {
  FuelRecordWithRelations,
  MaintenanceRecordWithRelations,
  ReportFilters,
  TripReportRow,
  TripWithRelations,
} from '@/types/domain';
import { fetchFuelRecords } from '@/services/fuel';
import { fetchMaintenanceRecords } from '@/services/maintenance';
import { fetchTrips } from '@/services/trips';
import { downloadCsv, fmtRwf } from '@/lib/utils';

function inRange(date: string | null | undefined, from: string, to: string, hasRange: boolean): boolean {
  if (!date) return true;
  if (!hasRange) return true;
  const d = date.slice(0, 10);
  return d >= from && d <= to;
}

export type ReportsData = {
  trips: TripReportRow[];
  fuel: FuelRecordWithRelations[];
  maintenance: MaintenanceRecordWithRelations[];
  totals: {
    trips: number;
    distanceKm: number;
    fuelLitres: number;
    fuelCost: number;
    maintenanceCost: number;
  };
};

export async function buildReports(filters: ReportFilters): Promise<ReportsData> {
  const hasRange = Boolean(filters.from && filters.to);
  const [trips, fuel, maintenance] = await Promise.all([
    fetchTrips(),
    fetchFuelRecords(),
    fetchMaintenanceRecords(),
  ]);

  const filteredTrips: TripReportRow[] = trips
    .filter((t) => inRange(t.start_time, filters.from, filters.to, hasRange))
    .filter((t) => (filters.vehicleId ? t.vehicle_id === filters.vehicleId : true))
    .filter((t) => (filters.driverId ? t.driver_id === filters.driverId : true))
    .map((t: TripWithRelations) => ({
      id: t.id,
      requestRef: t.request?.ref_code ?? '—',
      vehicle: t.vehicle ? `${t.vehicle.registration_number} ${t.vehicle.make}` : '—',
      driver: t.driver?.full_name ?? '—',
      requester: t.request?.requester_id ? t.request.requester_id : '—',
      route: t.request ? `${t.request.origin} → ${t.request.destination}` : '—',
      startTime: t.start_time,
      endTime: t.end_time,
      distanceKm: t.distance_km,
      fuelLitres: t.fuel_used_litres,
      status: t.status,
    }));

  const filteredFuel = fuel.filter((f) => inRange(f.date, filters.from, filters.to, hasRange));
  const filteredMaint = maintenance.filter((m) => inRange(m.date, filters.from, filters.to, hasRange));

  const totals = {
    trips: filteredTrips.length,
    distanceKm: filteredTrips.reduce((acc, t) => acc + (t.distanceKm ?? 0), 0),
    fuelLitres: filteredFuel.reduce((acc, f) => acc + f.quantity, 0),
    fuelCost: filteredFuel.reduce((acc, f) => acc + f.total_cost, 0),
    maintenanceCost: filteredMaint.reduce((acc, m) => acc + m.cost, 0),
  };

  return { trips: filteredTrips, fuel: filteredFuel, maintenance: filteredMaint, totals };
}

export function exportTripsCsv(trips: TripReportRow[]): void {
  downloadCsv('trip-report.csv', [
    ['Trip ID', 'Request Ref', 'Vehicle', 'Driver', 'Route', 'Start', 'End', 'Distance (km)', 'Fuel (L)', 'Status'],
    ...trips.map((t) => [
      t.id,
      t.requestRef,
      t.vehicle,
      t.driver,
      t.route,
      t.startTime ?? '',
      t.endTime ?? '',
      t.distanceKm ?? 0,
      t.fuelLitres ?? 0,
      t.status,
    ]),
  ]);
}

export function exportFuelCsv(fuel: FuelRecordWithRelations[]): void {
  downloadCsv('fuel-report.csv', [
    ['Date', 'Vehicle', 'Fuel Type', 'Quantity (L)', 'Unit Price', 'Total Cost', 'Odometer', 'Station'],
    ...fuel.map((f) => [
      f.date,
      f.vehicle?.registration_number ?? '—',
      f.fuel_type,
      f.quantity,
      f.unit_price,
      fmtRwf(f.total_cost),
      f.odometer,
      f.station,
    ]),
  ]);
}