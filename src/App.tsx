import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from '@/features/auth/LoginPage';
import { ProtectedRoute, RoleIndexRoute } from '@/routes/guards';
import { InitialLoader } from '@/components/ui/InitialLoader';
import { useAuth } from '@/features/auth/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import AdminDashboardPage from '@/pages/admin/DashboardPage';
import UsersPage from '@/pages/admin/UsersPage';
import DriversPage from '@/pages/admin/DriversPage';
import VehiclesPage from '@/pages/admin/VehiclesPage';
import RequestsPage from '@/pages/admin/RequestsPage';
import TrackingPage from '@/pages/admin/TrackingPage';
import FuelPage from '@/pages/admin/FuelPage';
import MaintenancePage from '@/pages/admin/MaintenancePage';
import ReportsPage from '@/pages/admin/ReportsPage';
import AuditLogsPage from '@/pages/admin/AuditLogsPage';
import DepartmentsPage from '@/pages/admin/DepartmentsPage';
import EmployeeDashboardPage from '@/pages/employee/DashboardPage';
import NewRequestPage from '@/pages/employee/NewRequestPage';
import MyRequestsPage from '@/pages/employee/MyRequestsPage';
import DriverDashboardPage from '@/pages/driver/DashboardPage';
import MyTripsPage from '@/pages/driver/MyTripsPage';
import AccountPage from '@/pages/AccountPage';

export default function App() {
  const { loading } = useAuth();
  if (loading) return <InitialLoader />;
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<RoleIndexRoute />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell role="admin" />}>
          <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
          <Route path="/admin/users" element={<UsersPage />} />
          <Route path="/admin/drivers" element={<DriversPage />} />
          <Route path="/admin/vehicles" element={<VehiclesPage />} />
          <Route path="/admin/requests" element={<RequestsPage />} />
          <Route path="/admin/tracking" element={<TrackingPage />} />
          <Route path="/admin/fuel" element={<FuelPage />} />
          <Route path="/admin/maintenance" element={<MaintenancePage />} />
          <Route path="/admin/reports" element={<ReportsPage />} />
          <Route path="/admin/audit-logs" element={<AuditLogsPage />} />
          <Route path="/admin/departments" element={<DepartmentsPage />} />
        </Route>

        <Route element={<AppShell role="employee" />}>
          <Route path="/employee/dashboard" element={<EmployeeDashboardPage />} />
          <Route path="/employee/requests" element={<MyRequestsPage />} />
          <Route path="/employee/requests/new" element={<NewRequestPage />} />
          <Route path="/employee/account" element={<AccountPage />} />
        </Route>

        <Route element={<AppShell role="driver" />}>
          <Route path="/driver/dashboard" element={<DriverDashboardPage />} />
          <Route path="/driver/trips" element={<MyTripsPage />} />
          <Route path="/driver/account" element={<AccountPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}