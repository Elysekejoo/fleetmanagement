import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Play, Info } from 'lucide-react';
import { fetchDriverTrips, startTrip } from '@/services/trips';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { PageBody, PageHeader } from '@/components/ui/Page';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge, type StatusTone } from '@/components/ui/StatusBadge';
import { InfoRow } from '@/components/ui/Page';
import { useToast } from '@/components/ui/Toast';
import { friendlyError } from '@/lib/errors';
import { useAuth } from '@/features/auth/AuthContext';
import { fmtDate, fmtDateTime } from '@/lib/utils';
import { useRealtimeInvalidation } from '@/hooks/useRealtimeInvalidation';
import { useState } from 'react';
import type { TripWithRelations } from '@/types/domain';

const tripTone: Record<string, StatusTone> = {
  scheduled: 'scheduled',
  active: 'active',
  completed: 'completed',
  cancelled: 'cancelled',
};

export default function MyTripsPage() {
  const { profile } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [detail, setDetail] = useState<TripWithRelations | null>(null);

  const { data: trips = [], isLoading, error, refetch } = useQuery({
    queryKey: ['driver-trips', profile?.id],
    queryFn: () => fetchDriverTrips(profile!.id),
    enabled: Boolean(profile),
  });
  useRealtimeInvalidation();

  const startMutation = useMutation({
    mutationFn: (tripId: string) => startTrip(tripId, 'Current GPS position'),
    onSuccess: () => {
      toast.show('success', 'Trip started — GPS tracking active');
      void queryClient.invalidateQueries({ queryKey: ['driver-trips'] });
      void queryClient.invalidateQueries({ queryKey: ['trips'] });
      void queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
    onError: (err) => toast.show('error', friendlyError(err, 'Unable to start the trip. Please try again.')),
  });

  const columns: Column<TripWithRelations>[] = [
    { key: 'ref', header: 'Ref', render: (t) => <span className="font-mono text-xs font-semibold">{t.request?.ref_code ?? '—'}</span> },
    {
      key: 'route',
      header: 'Route',
      render: (t) => (
        <div>
          <div className="text-ink">{t.request?.destination ?? '—'}</div>
          <div className="text-[11px] text-ink-3">
            {t.request ? `${t.request.origin} → ${t.request.destination}` : ''}
          </div>
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      render: (t) => (
        <span>
          {fmtDate(t.request?.travel_date)}
          {t.request?.departure_time ? ` · ${t.request.departure_time}` : ''}
        </span>
      ),
    },
    { key: 'vehicle', header: 'Vehicle', render: (t) => <span className="font-mono text-xs">{t.vehicle?.registration_number ?? '—'}</span> },
    { key: 'status', header: 'Status', render: (t) => <StatusBadge tone={tripTone[t.status]} /> },
    { key: 'started', header: 'Started', render: (t) => <span className="text-xs">{fmtDateTime(t.start_time)}</span> },
    {
      key: 'actions',
      header: 'Actions',
      render: (t) => (
        <div className="flex items-center gap-1.5">
          {t.status === 'scheduled' && (
            <Button
              size="sm"
              variant="success"
              icon={<Play className="h-3.5 w-3.5" />}
              loading={startMutation.isPending}
              onClick={() => startMutation.mutate(t.id)}
            >
              Start
            </Button>
          )}
          <Button size="sm" variant="ghost" icon={<Info className="h-3.5 w-3.5" />} onClick={() => setDetail(t)}>
            Details
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="My Assigned Trips" description="All trips assigned to you" />
      <PageBody>
        <DataTable
          columns={columns}
          rows={trips}
          loading={isLoading}
          error={error?.message ?? null}
          onRetry={() => refetch()}
          rowKey={(t) => t.id}
          emptyTitle="No trips assigned to you yet"
          emptyMessage="When an administrator approves a request and assigns you as the driver, the trip appears here."
        />
      </PageBody>

      {detail && (
        <Modal open onClose={() => setDetail(null)} title={`Trip — ${detail.request?.ref_code ?? detail.id}`}>
          <div className="mb-4 rounded border border-line bg-bg p-3">
            <InfoRow label="Destination" value={detail.request?.destination ?? '—'} />
            <InfoRow label="Purpose" value={detail.request?.purpose ?? '—'} />
            <InfoRow label="Travel Date" value={fmtDate(detail.request?.travel_date)} />
            <InfoRow label="Passengers" value={String(detail.request?.passenger_count ?? '—')} />
            <InfoRow label="Vehicle" value={detail.vehicle ? `${detail.vehicle.registration_number} — ${detail.vehicle.make} ${detail.vehicle.model}` : '—'} />
            <InfoRow label="Status" value={detail.status} />
            <InfoRow label="Started" value={fmtDateTime(detail.start_time)} />
            <InfoRow label="Completed" value={fmtDateTime(detail.end_time)} />
            <InfoRow label="Distance" value={detail.distance_km != null ? `${detail.distance_km} km` : '—'} />
            <InfoRow label="Fuel Used" value={detail.fuel_used_litres != null ? `${detail.fuel_used_litres} L` : '—'} />
          </div>
        </Modal>
      )}
    </>
  );
}