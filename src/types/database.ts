export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'admin' | 'employee' | 'driver';
export type PasswordResetStatus = 'pending' | 'approved' | 'rejected';
export type VehicleStatus = 'available' | 'assigned' | 'on_trip' | 'maintenance' | 'inactive';
export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'assigned' | 'completed';
export type TripStatus = 'scheduled' | 'active' | 'completed' | 'cancelled';
export type Priority = 'low' | 'normal' | 'high';

export interface ProfileRow {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  employee_number: string | null;
  department_id: string | null;
  position: string | null;
  license_number: string | null;
  license_category: string | null;
  license_expiry: string | null;
  is_active: boolean;
  is_master_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface AppSettingsRow {
  id: number;
  system_name: string;
  org_name: string;
  org_line: string;
  location_line: string;
  footer_line_1: string;
  footer_line_2: string;
  hero_title: string;
  hero_subtitle: string;
  mission_title: string;
  mission_text: string;
  updated_at: string;
  updated_by: string | null;
}

export interface PasswordResetRequestRow {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  new_password_hash: string;
  status: PasswordResetStatus;
  rejection_reason: string | null;
  reviewed_by: string | null;
  submitted_at: string;
  reviewed_at: string | null;
}

export interface DepartmentRow {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface VehicleRow {
  id: string;
  registration_number: string;
  make: string;
  model: string;
  year: number;
  vehicle_type: string;
  color: string | null;
  status: VehicleStatus;
  current_driver_id: string | null;
  gps_device_id: string | null;
  odometer: number;
  last_service_date: string | null;
  next_service_km: number;
  created_at: string;
  updated_at: string;
}

export interface TravelRequestRow {
  id: string;
  ref_code: string;
  requester_id: string;
  origin: string;
  destination: string;
  purpose: string;
  travel_date: string;
  return_date: string | null;
  departure_time: string | null;
  passenger_count: number;
  priority: Priority;
  status: RequestStatus;
  approved_by: string | null;
  approved_at: string | null;
  assigned_vehicle_id: string | null;
  assigned_driver_id: string | null;
  rejection_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TripRow {
  id: string;
  request_id: string;
  vehicle_id: string;
  driver_id: string;
  start_time: string | null;
  end_time: string | null;
  start_location: string | null;
  end_location: string | null;
  distance_km: number | null;
  fuel_used_litres: number | null;
  status: TripStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface GpsLocationRow {
  id: number;
  vehicle_id: string;
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
  accuracy: number | null;
  device_id: string | null;
  recorded_at: string;
  created_at: string;
}

export interface FuelRecordRow {
  id: string;
  vehicle_id: string;
  date: string;
  fuel_type: string;
  quantity: number;
  unit_price: number;
  total_cost: number;
  odometer: number;
  station: string;
  receipt_number: string | null;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
}

export interface MaintenanceRecordRow {
  id: string;
  vehicle_id: string;
  service_type: string;
  description: string | null;
  date: string;
  odometer: number;
  cost: number;
  provider: string | null;
  next_service_date: string | null;
  status: 'scheduled' | 'in_progress' | 'completed';
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
}

export interface NotificationRow {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  is_read: boolean;
  metadata: Json | null;
  created_at: string;
}

export interface AuditLogRow {
  id: string;
  user_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  metadata: Json | null;
  created_at: string;
}

type TableDef<Row, Insert> = {
  Row: Row;
  Insert: Insert;
  Update: Partial<Insert>;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      profiles: TableDef<ProfileRow, Omit<ProfileRow, 'created_at' | 'updated_at'>>;
      departments: TableDef<DepartmentRow, Omit<DepartmentRow, 'id' | 'created_at'>>;
      vehicles: TableDef<VehicleRow, Omit<VehicleRow, 'created_at' | 'updated_at'>>;
      travel_requests: TableDef<TravelRequestRow, Omit<TravelRequestRow, 'created_at' | 'updated_at' | 'ref_code'>>;
      trips: TableDef<TripRow, Omit<TripRow, 'created_at' | 'updated_at'>>;
      gps_locations: TableDef<GpsLocationRow, Omit<GpsLocationRow, 'id' | 'created_at'>>;
      fuel_records: TableDef<FuelRecordRow, Omit<FuelRecordRow, 'created_at'>>;
      maintenance_records: TableDef<MaintenanceRecordRow, Omit<MaintenanceRecordRow, 'created_at'>>;
      notifications: TableDef<NotificationRow, Omit<NotificationRow, 'id' | 'created_at' | 'is_read'>>;
      audit_logs: TableDef<AuditLogRow, Omit<AuditLogRow, 'id' | 'created_at'>>;
      app_settings: TableDef<AppSettingsRow, Partial<AppSettingsRow>>;
      password_reset_requests: TableDef<
        PasswordResetRequestRow,
        Omit<PasswordResetRequestRow, 'id' | 'submitted_at' | 'new_password_hash' | 'status'>
      >;
    };
    Views: Record<string, never>;
    Functions: {
      notify_user: {
        Args: {
          p_user_id: string;
          p_title: string;
          p_message: string;
          p_type?: string;
          p_metadata?: Json;
        };
        Returns: undefined;
      };
      log_audit: {
        Args: {
          p_action: string;
          p_entity: string;
          p_entity_id?: string;
          p_metadata?: Json;
        };
        Returns: undefined;
      };
      get_dashboard_stats: {
        Args: Record<string, never>;
        Returns: {
          total_vehicles: number;
          available_vehicles: number;
          vehicles_on_trip: number;
          vehicles_maintenance: number;
          total_drivers: number;
          total_employees: number;
          pending_requests: number;
          active_trips: number;
          completed_trips: number;
          fuel_expenditure: number;
          maintenance_expenditure: number;
        }[];
      };
      start_trip: {
        Args: {
          p_trip_id: string;
          p_start_location?: string | null;
        };
        Returns: undefined;
      };
      complete_trip: {
        Args: {
          p_trip_id: string;
          p_end_location?: string | null;
          p_distance_km?: number | null;
          p_fuel_litres?: number | null;
          p_notes?: string | null;
        };
        Returns: undefined;
      };
      create_staff_account: {
        Args: {
          p_email: string;
          p_password: string;
          p_full_name: string;
          p_role?: UserRole;
          p_phone?: string | null;
          p_department_id?: string | null;
          p_employee_number?: string | null;
          p_position?: string | null;
          p_license_number?: string | null;
          p_license_category?: string | null;
          p_license_expiry?: string | null;
        };
        Returns: ProfileRow;
      };
      admin_reset_password: {
        Args: {
          p_user_id: string;
          p_new_password: string;
        };
        Returns: undefined;
      };
      request_password_reset: {
        Args: {
          p_email: string;
          p_last_used_password: string;
          p_new_password: string;
        };
        Returns: undefined;
      };
      approve_password_reset: {
        Args: {
          p_request_id: string;
        };
        Returns: undefined;
      };
      reject_password_reset: {
        Args: {
          p_request_id: string;
          p_reason: string;
        };
        Returns: undefined;
      };
      admin_update_email: {
        Args: {
          p_user_id: string;
          p_email: string;
        };
        Returns: undefined;
      };
      admin_set_user_active: {
        Args: {
          p_user_id: string;
          p_active: boolean;
        };
        Returns: undefined;
      };
      admin_reset_system: {
        Args: Record<string, never>;
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}