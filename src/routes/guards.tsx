import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import type { UserRole } from '@/types/database';
import { InitialLoader } from '@/components/ui/InitialLoader';

export function ProtectedRoute({ children }: { children?: ReactNode }) {
  const { profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <InitialLoader />;
  }
  if (!profile) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children ?? <Outlet />;
}

export function RoleRoute({ roles, children }: { roles: UserRole[]; children?: ReactNode }) {
  const { profile } = useAuth();
  if (!profile) return <Navigate to="/login" replace />;
  if (!roles.includes(profile.role)) {
    return <Navigate to={`/${profile.role}/dashboard`} replace />;
  }
  return children ?? <Outlet />;
}

const roleDashboard: Record<UserRole, string> = {
  admin: '/admin/dashboard',
  employee: '/employee/dashboard',
  driver: '/driver/dashboard',
};

export function RoleIndexRoute() {
  const { profile, loading } = useAuth();
  if (loading) return <InitialLoader />;
  if (!profile) return <Navigate to="/login" replace />;
  return <Navigate to={roleDashboard[profile.role]} replace />;
}