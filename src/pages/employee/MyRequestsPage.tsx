import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Undo2 } from 'lucide-react';
import { fetchMyRequests, cancelRequest } from '@/services/requests';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { PageBody, PageHeader } from '@/components/ui/Page';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/features/auth/AuthContext';
import { fmtDate, fmtDateTime } from '@/lib/utils';
import { requestTone } from '@/pages/admin/DashboardPage';
import type { RequestWithRelations } from '@/types/domain';

export default function MyRequestsPage() {
  const { profile } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [withdrawing, setWithdrawing] = useState<RequestWithRelations | null>(null);

  const { data: requests = [], isLoading, error, refetch } = useQuery({
    queryKey: ['my-requests', profile?.id],
    queryFn: () => fetchMyRequests(profile!.id),
    enabled: Boolean(profile),
    refetchInterval: 30_000,
  });

  const withdrawMutation = useMutation({
    mutationFn: () => cancelRequest(withdrawing!.id, profile!.id),
    onSuccess: () => {
      toast.show('success', 'Request withdrawn');
      setWithdrawing(null);
      void queryClient.invalidateQueries({ queryKey: ['my-requests'] });
      void queryClient.invalidateQueries({ queryKey: ['requests'] });
    },
    onError: (err) => toast.show('error', err instanceof Error ? err.message : 'Unable to withdraw request'),
  });

  const columns: Column<RequestWithRelations>[] = [
    { key: 'ref', header: 'Ref', render: (r) => <span className="font-mono text-xs font-semibold">{r.ref_code}</span> },
    { key: 'dest', header: 'Destination', render: (r) => <span className="font-semibold text-ink">{r.destination}</span> },
    {
      key: 'purpose',
      header: 'Purpose',
      render: (r) => <span className="max-w-[220px] truncate text-xs text-ink-2">{r.purpose}</span>,
    },
    { key: 'date', header: 'Travel Date', render: (r) => fmtDate(r.travel_date) },
    {
      key: 'vehicle',
      header: 'Vehicle',
      render: (r) => <span className="font-mono text-xs">{r.assignedVehicle?.registration_number ?? '—'}</span>,
    },
    { key: 'driver', header: 'Driver', render: (r) => r.assignedDriver?.full_name ?? '—' },
    {
      key: 'submitted',
      header: 'Submitted',
      render: (r) => <span className="text-xs">{fmtDateTime(r.created_at)}</span>,
    },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge tone={requestTone(r.status)} /> },
    {
      key: 'actions',
      header: 'Action',
      render: (r) =>
        r.status === 'pending' ? (
          <Button size="sm" variant="ghost" icon={<Undo2 className="h-3.5 w-3.5" />} onClick={() => setWithdrawing(r)}>
            Withdraw
          </Button>
        ) : null,
    },
  ];

  return (
    <>
      <PageHeader title="My Travel Requests" description="Track all your submitted vehicle requests" />
      <PageBody>
        <DataTable
          columns={columns}
          rows={requests}
          loading={isLoading}
          error={error?.message ?? null}
          onRetry={() => refetch()}
          searchPlaceholder="Search destination, ref…"
          rowKey={(r) => r.id}
          emptyTitle="No requests submitted yet"
          emptyMessage="Create a travel request to start."
        />
      </PageBody>

      <ConfirmDialog
        open={Boolean(withdrawing)}
        title="Withdraw Request"
        message={`Remove pending request ${withdrawing?.ref_code} to ${withdrawing?.destination}?`}
        confirmLabel="Withdraw"
        danger={false}
        loading={withdrawMutation.isPending}
        onConfirm={() => withdrawMutation.mutate()}
        onClose={() => setWithdrawing(null)}
      />
    </>
  );
}