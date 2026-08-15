import { useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/AuthContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { InstallBanner } from '@/components/pwa/InstallBanner';
import type { UserRole } from '@/types/database';

const pageTitles: Record<string, string> = {
  'admin/dashboard': 'Dashboard',
  'admin/tracking': 'Live Vehicle Tracking',
  'admin/requests': 'Request Management',
  'admin/vehicles': 'Vehicle Registry',
  'admin/drivers': 'Driver Management',
  'admin/users': 'User Management',
  'admin/fuel': 'Fuel Management',
  'admin/maintenance': 'Maintenance Management',
  'admin/reports': 'Reports & Analytics',
  'admin/audit-logs': 'Audit Logs',
  'employee/dashboard': 'My Dashboard',
  'employee/requests': 'My Travel Requests',
  'employee/requests/new': 'New Travel Request',
  'employee/account': 'My Account',
  'driver/dashboard': 'Driver Dashboard',
  'driver/trips': 'My Assigned Trips',
  'driver/account': 'My Account',
};

export function AppShell({ role }: { role: UserRole }) {
  const { profile } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useProfileSync();

  const titleKey = location.pathname.replace(/^\//, '');
  const title = pageTitles[titleKey] ?? 'Fleet Management System';

  if (!profile) return <Navigate to="/login" replace />;
  if (profile.role !== role) return <Navigate to={`/${profile.role}/dashboard`} replace />;

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenSidebar={() => setSidebarOpen(true)} title={title} />
        <main className="flex flex-1 flex-col overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <InstallBanner />
    </div>
  );
}

function useProfileSync(): void {
  const { profile, refreshProfile } = useAuth();
  useQuery({
    queryKey: ['profile', profile?.id],
    queryFn: async () => {
      await refreshProfile();
      return true;
    },
    enabled: Boolean(profile),
    refetchInterval: 120_000,
  });
}