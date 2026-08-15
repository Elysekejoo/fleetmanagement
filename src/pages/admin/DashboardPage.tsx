import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Hourglass, Navigation, Plus, Radar, Truck, UserRoundCog, Users } from 'lucide-react';
import { fetchDashboardStats } from '@/services/dashboard';
import { fetchRequests } from '@/services/requests';
import { fetchActiveTrips } from '@/services/trips';
import { useTrackedVehicles } from '@/hooks/useTrackedVehicles';
import { PageBody, PageHeader, Panel, StatCard } from '@/components/ui/Page';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { FleetMap } from '@/components/tracking/FleetMap';
import { ErrorState } from '@/components/ui/States';
import { SkeletonRows } from '@/components/ui/Loading';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { fmtDate, fmtRwf, timeAgo } from '@/lib/utils';
import { useRealtimeInvalidation } from '@/hooks/useRealtimeInvalidation';
import type { DashboardStats } from '@/types/domain';

export default function AdminDashboardPage() {
  const toast = useToast();

  const statsQuery = useQuery({ queryKey: ['dashboard-stats'], queryFn: fetchDashboardStats });
  const requestsQuery = useQuery({ queryKey: ['requests'], queryFn: () => fetchRequests() });
  const activeTripsQuery = useQuery({ queryKey: ['trips-active'], queryFn: fetchActiveTrips });
  const tracked = useTrackedVehicles();
  useRealtimeInvalidation();

  const recentRequests = (requestsQuery.data ?? []).slice(0, 6);
  const stats = statsQuery.data;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Fleet overview and operational status"
        actions={
          <Link to="/admin/requests" className="inline-flex">
            <Button variant="primary" icon={<Plus className="h-4 w-4" />}>
              New Request
            </Button>
          </Link>
        }
      />
      <PageBody>
        {statsQuery.isError ? (
          <ErrorState message={statsQuery.error.message} onRetry={() => statsQuery.refetch()} />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            <StatCard
              label="Total Vehicles"
              value={stats?.totalVehicles ?? '—'}
              sub="in fleet registry"
              icon={<Truck className="h-4 w-4" />}
            />
            <StatCard
              label="Active Drivers"
              value={stats?.totalDrivers ?? '—'}
              sub="registered & active"
              tone="gold"
              icon={<UserRoundCog className="h-4 w-4" />}
            />
            <StatCard
              label="Employees"
              value={stats?.totalEmployees ?? '—'}
              sub="with system access"
              tone="blue"
              icon={<Users className="h-4 w-4" />}
            />
            <StatCard
              label="Pending Requests"
              value={stats?.pendingRequests ?? '—'}
              sub="awaiting decision"
              tone="red"
              icon={<Hourglass className="h-4 w-4" />}
            />
            <StatCard
              label="Active Trips"
              value={stats?.activeTrips ?? '—'}
              sub="vehicles on route"
              tone="green"
              icon={<Navigation className="h-4 w-4" />}
            />
          </div>
        )}

        <div className="mb-4 overflow-hidden rounded-xl border border-line bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3 sm:px-5">
            <div className="flex min-w-0 items-center gap-2.5">
              <Radar className="h-4 w-4 shrink-0 text-blue" aria-hidden="true" />
              <h3 className="text-[15px] font-semibold text-ink">Live Fleet Map — Rwanda</h3>
              {tracked.isDemo && (
                <span className="rounded-sm border border-warn-border bg-warn-bg px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warn">
                  Demo tracking
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {tracked.lastSyncAt && (
                <span className="hidden text-[11px] text-ink-3 sm:inline">{timeAgo(tracked.lastSyncAt)}</span>
              )}
              <Link to="/admin/tracking" className="text-xs font-semibold text-blue hover:underline">
                Open Live Tracking
              </Link>
            </div>
          </div>
          {tracked.isError ? (
            <ErrorState message={tracked.error?.message ?? 'Unable to load positions'} onRetry={() => tracked.refetch()} />
          ) : (
            <FleetMap locations={tracked.locations} isDemo={tracked.isDemo} />
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Panel
            title="Recent Requests"
            actions={
              <Link to="/admin/requests" className="text-xs font-semibold text-blue hover:underline">
                View All
              </Link>
            }
            bodyClassName="p-0"
          >
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-line bg-bg text-left text-[10px] font-semibold uppercase tracking-wider text-ink-3">
                    <th className="px-4 py-2.5">Ref</th>
                    <th className="px-4 py-2.5">Employee</th>
                    <th className="px-4 py-2.5">Destination</th>
                    <th className="px-4 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {requestsQuery.isLoading ? (
                    <tr>
                      <td colSpan={4}>
                        <SkeletonRows rows={3} cols={4} />
                      </td>
                    </tr>
                  ) : (
                    recentRequests.map((r) => (
                      <tr key={r.id} className="border-b border-line/60 last:border-b-0 hover:bg-bg-2/60">
                        <td className="px-4 py-2.5 font-mono text-xs text-ink-2">{r.ref_code}</td>
                        <td className="px-4 py-2.5 text-[13px] font-medium text-ink">{r.requester?.full_name ?? '—'}</td>
                        <td className="px-4 py-2.5 text-[13px] text-ink-2">{r.destination}</td>
                        <td className="px-4 py-2.5">
                          <StatusBadge tone={requestTone(r.status)} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="Active Trips" bodyClassName="p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-line bg-bg text-left text-[10px] font-semibold uppercase tracking-wider text-ink-3">
                    <th className="px-4 py-2.5">Destination</th>
                    <th className="px-4 py-2.5">Driver</th>
                    <th className="px-4 py-2.5">Vehicle</th>
                    <th className="px-4 py-2.5">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {activeTripsQuery.isLoading ? (
                    <tr>
                      <td colSpan={4}>
                        <SkeletonRows rows={3} cols={4} />
                      </td>
                    </tr>
                  ) : (activeTripsQuery.data ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-xs text-ink-3">
                        No active trips
                      </td>
                    </tr>
                  ) : (
                    activeTripsQuery.data?.map((t) => (
                      <tr key={t.id} className="border-b border-line/60 last:border-b-0 hover:bg-bg-2/60">
                        <td className="px-4 py-2.5 text-[13px] font-medium text-ink">{t.request?.destination ?? '—'}</td>
                        <td className="px-4 py-2.5 text-[13px] text-ink-2">{t.driver?.full_name ?? '—'}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-ink-2">{t.vehicle?.registration_number ?? '—'}</td>
                        <td className="px-4 py-2.5 text-[13px] text-ink-2">{fmtDate(t.start_time)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Panel title="Fleet Status" bodyClassName="p-4">
            {statsQuery.data ? (
              <OperationalAlerts stats={statsQuery.data} onView={() => toast.show('info', 'Detailed alerts shown on fuel & maintenance pages')} />
            ) : (
              <SkeletonRows rows={3} cols={1} />
            )}
          </Panel>
          <Panel title="Expenditure Summary" bodyClassName="p-4">
            <div className="space-y-3">
              <ExpenseRow label="Fuel expenditure (all time)" value={fmtRwf(stats?.fuelExpenditure ?? 0)} />
              <ExpenseRow label="Maintenance expenditure" value={fmtRwf(stats?.maintenanceExpenditure ?? 0)} />
              <ExpenseRow label="Vehicles under maintenance" value={String(stats?.vehiclesMaintenance ?? 0)} />
              <ExpenseRow label="Available vehicles" value={String(stats?.availableVehicles ?? 0)} />
            </div>
          </Panel>
        </div>
      </PageBody>
    </>
  );
}

function OperationalAlerts({ stats, onView }: { stats: DashboardStats; onView: () => void }) {
  const alerts: Array<{ tone: 'warn' | 'danger' | 'ok'; text: string }> = [];
  if (stats.pendingRequests > 0) alerts.push({ tone: 'warn', text: `${stats.pendingRequests} travel request(s) awaiting approval.` });
  if (stats.vehiclesMaintenance > 0) alerts.push({ tone: 'danger', text: `${stats.vehiclesMaintenance} vehicle(s) currently under maintenance.` });
  if (stats.availableVehicles === 0 && stats.totalVehicles > 0) alerts.push({ tone: 'danger', text: 'No vehicles are currently available for assignment.' });
  if (alerts.length === 0) alerts.push({ tone: 'ok', text: 'No operational alerts — the fleet is operating normally.' });

  return (
    <div className="space-y-2">
      {alerts.map((a, i) => (
        <div
          key={i}
          className={`flex items-start gap-2 rounded-md border-l-4 px-3 py-2.5 text-[13px] ${
            a.tone === 'danger'
              ? 'border-danger bg-danger-bg text-danger'
              : a.tone === 'warn'
                ? 'border-gold bg-warn-bg text-warn'
                : 'border-ok bg-ok-bg text-ok'
          }`}
        >
          <span>{a.text}</span>
        </div>
      ))}
      <button onClick={onView} className="text-xs font-semibold text-blue hover:underline">
        View operational pages
      </button>
    </div>
  );
}

function ExpenseRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-line/60 pb-2 text-[13px] last:border-b-0">
      <span className="text-ink-3">{label}</span>
      <span className="font-semibold text-ink">{value}</span>
    </div>
  );
}

export function requestTone(status: string): Parameters<typeof StatusBadge>[0]['tone'] {
  const map: Record<string, Parameters<typeof StatusBadge>[0]['tone']> = {
    pending: 'pending',
    approved: 'approved',
    rejected: 'rejected',
    cancelled: 'cancelled',
    assigned: 'assigned',
    completed: 'completed',
  };
  return map[status] ?? 'info';
}