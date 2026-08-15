import { DataTable, type Column } from '@/components/ui/DataTable';
import { PageBody, PageHeader } from '@/components/ui/Page';
import { StatusBadge, type StatusTone } from '@/components/ui/StatusBadge';
import { FleetMap } from '@/components/tracking/FleetMap';
import { ErrorState } from '@/components/ui/States';
import { useTrackedVehicles } from '@/hooks/useTrackedVehicles';
import { fmtDateTime, timeAgo } from '@/lib/utils';
import type { VehicleLocation } from '@/types/domain';

const toneByStatus: Record<VehicleLocation['status'], StatusTone> = {
  moving: 'on_trip',
  idle: 'assigned',
  stopped: 'inactive',
};

export default function TrackingPage() {
  const tracked = useTrackedVehicles();
  const locations = tracked.locations;

  const columns: Column<VehicleLocation>[] = [
    {
      key: 'vehicle',
      header: 'Vehicle',
      render: (v) => (
        <div>
          <div className="font-mono text-xs font-semibold text-ink">{v.vehicle.registration_number}</div>
          <div className="text-[11px] text-ink-3">
            {v.vehicle.make} {v.vehicle.model}
          </div>
        </div>
      ),
    },
    { key: 'driver', header: 'Driver', render: (v) => v.driver?.full_name ?? '—' },
    {
      key: 'status',
      header: 'Status',
      render: (v) => <StatusBadge tone={toneByStatus[v.status]} />,
    },
    {
      key: 'location',
      header: 'Coordinates',
      render: (v) => (
        <span className="font-mono text-[11px]">
          {v.latitude.toFixed(4)}, {v.longitude.toFixed(4)}
        </span>
      ),
    },
    {
      key: 'speed',
      header: 'Speed',
      render: (v) => (
        <span className="font-mono text-xs">{v.speed != null ? `${Math.round(v.speed)} km/h` : '—'}</span>
      ),
    },
    { key: 'device', header: 'Device', render: (v) => <span className="font-mono text-xs">{v.deviceId ?? '—'}</span> },
    { key: 'update', header: 'Last Update', render: (v) => <span className="text-xs">{timeAgo(v.recordedAt)}</span> },
  ];

  return (
    <>
      <PageHeader
        title="Live Vehicle Tracking"
        description={tracked.isDemo ? 'Simulated vehicle positions — GPS hardware integration pending' : 'Real-time GPS positions of all vehicles'}
      />
      <PageBody>
        <div className="mb-4 overflow-hidden rounded-[10px] border border-line bg-white">
          {tracked.isError ? (
            <ErrorState message={tracked.error?.message ?? 'Unable to load positions'} onRetry={tracked.refetch} />
          ) : (
            <FleetMap locations={locations} isDemo={tracked.isDemo} />
          )}
        </div>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <h2 className="text-[15px] font-semibold text-ink">Vehicle Location Log</h2>
          <span className="text-[11px] text-ink-3">
            Updated {locations.length ? fmtDateTime(locations[0].recordedAt) : '—'}
          </span>
          {tracked.isDemo && (
            <span className="rounded-sm border border-warn-border bg-warn-bg px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warn">
              Demo tracking
            </span>
          )}
        </div>
        <DataTable
          columns={columns}
          rows={locations}
          loading={tracked.isLoading}
          rowKey={(v) => v.vehicle.id}
          emptyTitle="No GPS locations available"
          emptyMessage="Tracked vehicles appear here once positions are recorded. In demo mode, simulated positions publish at Nyagatare, Rusizi and Kigali."
        />
      </PageBody>
    </>
  );
}