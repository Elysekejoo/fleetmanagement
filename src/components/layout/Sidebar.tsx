import { NavLink, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Building2,
  CarFront,
  ClipboardList,
  Fuel,
  Home,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  MapPinned,
  PlusCircle,
  Route,
  Settings,
  ShieldCheck,
  UserCog,
  UserRoundCog,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { useI18n, type I18nKey } from '@/lib/i18n';
import { useSettings } from '@/lib/settings';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/types/database';

interface NavItem {
  to: string;
  labelKey: I18nKey;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
}

interface NavSection {
  sectionKey: I18nKey;
  items: NavItem[];
}

const adminNav: NavSection[] = [
  {
    sectionKey: 'navOverview',
    items: [
      { to: '/admin/dashboard', labelKey: 'navDashboard', icon: LayoutDashboard, end: true },
      { to: '/admin/tracking', labelKey: 'navLiveTracking', icon: MapPinned },
    ],
  },
  {
    sectionKey: 'navRequests',
    items: [{ to: '/admin/requests', labelKey: 'navAllRequests', icon: ClipboardList }],
  },
  {
    sectionKey: 'navFleet',
    items: [
      { to: '/admin/vehicles', labelKey: 'navVehicles', icon: CarFront },
      { to: '/admin/drivers', labelKey: 'navDrivers', icon: UserRoundCog },
      { to: '/admin/users', labelKey: 'navUsers', icon: Users },
    ],
  },
  {
    sectionKey: 'navOperations',
    items: [
      { to: '/admin/fuel', labelKey: 'navFuel', icon: Fuel },
      { to: '/admin/maintenance', labelKey: 'navMaintenance', icon: Wrench },
      { to: '/admin/reports', labelKey: 'navReports', icon: BarChart3 },
      { to: '/admin/departments', labelKey: 'navDepartments', icon: Building2 },
      { to: '/admin/audit-logs', labelKey: 'navAuditLogs', icon: ShieldCheck },
    ],
  },
  {
    sectionKey: 'navSystem',
    items: [
      { to: '/admin/password-resets', labelKey: 'navPasswordResets', icon: KeyRound },
      { to: '/admin/settings', labelKey: 'navSettings', icon: Settings },
    ],
  },
];

const employeeNav: NavSection[] = [
  {
    sectionKey: 'navMyWorkspace',
    items: [
      { to: '/employee/dashboard', labelKey: 'navDashboard', icon: Home, end: true },
      { to: '/employee/requests/new', labelKey: 'navNewRequest', icon: PlusCircle },
      { to: '/employee/requests', labelKey: 'navMyRequests', icon: ListChecks },
      { to: '/employee/account', labelKey: 'navMyAccount', icon: UserCog },
    ],
  },
];

const driverNav: NavSection[] = [
  {
    sectionKey: 'navMyTrips',
    items: [
      { to: '/driver/dashboard', labelKey: 'navDashboard', icon: Home, end: true },
      { to: '/driver/trips', labelKey: 'navAssignedTrips', icon: Route },
      { to: '/driver/account', labelKey: 'navMyAccount', icon: UserCog },
    ],
  },
];

const roleNav: Record<UserRole, NavSection[]> = {
  admin: adminNav,
  employee: employeeNav,
  driver: driverNav,
};

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { profile } = useAuth();
  const { t } = useI18n();
  const { settings } = useSettings();
  const location = useLocation();
  if (!profile) return null;

  const sections = roleNav[profile.role];

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-navy/70 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-navy transition-transform duration-200 motion-reduce:transition-none lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-label="Sidebar navigation"
      >
        <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <img
              src="/favicon.png"
              alt="MSH Rwanda logo"
              className="h-9 w-9 shrink-0 rounded-md object-contain"
            />
            <div className="min-w-0">
              <div className="truncate text-[13px] font-semibold leading-tight text-white">{settings.org_name}</div>
              <div className="truncate text-[10px] text-slate-400">{settings.org_line} · FMS</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2.5 pb-4 pt-2">
          {sections.map((section) => (
            <div key={section.sectionKey}>
              <div className="px-2.5 pb-1.5 pt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                {t(section.sectionKey)}
              </div>
              <ul>
                {section.items.map((item) => {
                  const active = item.end
                    ? location.pathname === item.to
                    : location.pathname.startsWith(item.to);
                  return (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        onClick={onClose}
                        className={cn(
                          'relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors motion-reduce:transition-none',
                          active
                            ? 'bg-blue text-white'
                            : 'text-slate-400 hover:bg-white/[0.06] hover:text-white',
                        )}
                      >
                        {active && (
                          <span
                            className="absolute left-1.5 top-1/2 h-3.5 w-[3px] -translate-y-1/2 rounded-full bg-gold"
                            aria-hidden="true"
                          />
                        )}
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{t(item.labelKey)}</span>
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 px-4 py-3 text-[10px] leading-relaxed text-slate-500">
          {settings.footer_line_1}
          <br />
          {settings.footer_line_2}
        </div>
      </aside>
    </>
  );
}