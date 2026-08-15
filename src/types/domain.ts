import type {
  DepartmentRow,
  FuelRecordRow,
  GpsLocationRow,
  MaintenanceRecordRow,
  NotificationRow,
  ProfileRow,
  TravelRequestRow,
  TripRow,
  VehicleRow,
} from '@/types/database';

export type {
  ProfileRow,
  DepartmentRow,
  VehicleRow,
  TravelRequestRow,
  TripRow,
  GpsLocationRow,
  FuelRecordRow,
  MaintenanceRecordRow,
  NotificationRow,
} from '@/types/database';
export type { UserRole, VehicleStatus, RequestStatus, TripStatus, Priority } from '@/types/database';

export type Profile = ProfileRow;
export type Department = DepartmentRow;
export type Vehicle = VehicleRow;
export type TravelRequest = TravelRequestRow;
export type Trip = TripRow;
export type GpsLocation = GpsLocationRow;
export type FuelRecord = FuelRecordRow;
export type MaintenanceRecord = MaintenanceRecordRow;
export type Notification = NotificationRow;

export type VehicleWithDriver = Vehicle & { driver: Profile | null };

export type RequestWithRelations = TravelRequest & {
  requester: Profile | null;
  approvedBy: Profile | null;
  assignedDriver: Profile | null;
  assignedVehicle: Vehicle | null;
};

export type TripWithRelations = Trip & {
  request: TravelRequest | null;
  vehicle: Vehicle | null;
  driver: Profile | null;
};

export type FuelRecordWithRelations = FuelRecord & {
  vehicle: Vehicle | null;
  recordedByProfile: Profile | null;
};

export type MaintenanceRecordWithRelations = MaintenanceRecord & {
  vehicle: Vehicle | null;
};

export type DashboardStats = {
  totalVehicles: number;
  availableVehicles: number;
  vehiclesOnTrip: number;
  vehiclesMaintenance: number;
  totalDrivers: number;
  totalEmployees: number;
  pendingRequests: number;
  activeTrips: number;
  completedTrips: number;
  fuelExpenditure: number;
  maintenanceExpenditure: number;
};

export type VehicleGpsStatus = 'moving' | 'idle' | 'stopped';

export type VehicleLocation = {
  vehicle: Vehicle;
  driver: Profile | null;
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
  recordedAt: string;
  status: VehicleGpsStatus;
  deviceId: string | null;
};

export type ReportFilters = {
  from: string;
  to: string;
  vehicleId: string;
  driverId: string;
};

export type TripReportRow = {
  id: string;
  requestRef: string;
  vehicle: string;
  driver: string;
  requester: string;
  route: string;
  startTime: string | null;
  endTime: string | null;
  distanceKm: number | null;
  fuelLitres: number | null;
  status: string;
};
