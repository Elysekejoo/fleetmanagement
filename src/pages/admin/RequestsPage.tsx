import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ArrowRight, X } from 'lucide-react';
import { fetchRequests, approveRequest, rejectRequest } from '@/services/requests';
import { fetchVehicles } from '@/services/vehicles';
import { fetchDrivers } from '@/services/profiles';
import { fetchDepartments } from '@/services/departments';
import { DataTable, FilterSelect, type Column } from '@/components/ui/DataTable';
import { PageBody, PageHeader } from '@/components/ui/Page';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Field, FormRow, Label, Select } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { fmtDate, fmtDateTime } from '@/lib/utils';
import { useAuth } from '@/features/auth/AuthContext';
import { requestTone } from '@/pages/admin/DashboardPage';
import type { RequestWithRelations } from '@/types/domain';

const statusOptions = [
  { value: '', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'completed', label: 'Completed' },
];

export default function RequestsPage() {
  const { profile } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [approving, setApproving] = useState<RequestWithRelations | null>(null);
  const [rejecting, setRejecting] = useState<RequestWithRelations | null>(null);

  const { data: requests = [], isLoading, error, refetch } = useQuery({ queryKey: ['requests'], queryFn: () => fetchRequests() });
  const { data: vehicles = [] } = useQuery({ queryKey: ['vehicles'], queryFn: fetchVehicles });
  const { data: drivers = [] } = useQuery({ queryKey: ['drivers'], queryFn: fetchDrivers });
  const { data: departments = [] } = useQuery({ queryKey: ['departments'], queryFn: fetchDepartments });

  const requesterDepartment = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of departments) map.set(d.id, d.name);
    return (id: string | null) => (id ? map.get(id) ?? null : null);
  }, [departments]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['requests'] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    void queryClient.invalidateQueries({ queryKey: ['vehicles'] });
  };

  const approveMutation = useMutation({
    mutationFn: (assign: { vehicleId: string; driverId: string }) =>
      approveRequest({
        requestId: approving!.id,
        approvedBy: profile!.id,
        vehicleId: assign.vehicleId,
        driverId: assign.driverId,
      }),
    onSuccess: () => {
      toast.show('success', 'Request approved and trip scheduled');
      setApproving(null);
      invalidate();
    },
    onError: (err) => toast.show('error', err instanceof Error ? err.message : 'Operation failed'),
  });

  const rejectMutation = useMutation({
    mutationFn: (reason: string) => rejectRequest(rejecting!.id, profile!.id, reason),
    onSuccess: () => {
      toast.show('error', 'Request rejected');
      setRejecting(null);
      invalidate();
    },
    onError: (err) => toast.show('error', err instanceof Error ? err.message : 'Operation failed'),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return requests.filter((r) => {
      const matchesSearch =
        !q ||
        r.ref_code.toLowerCase().includes(q) ||
        (r.requester?.full_name ?? '').toLowerCase().includes(q) ||
        r.destination.toLowerCase().includes(q) ||
        (r.purpose ?? '').toLowerCase().includes(q);
      return matchesSearch && (!statusFilter || r.status === statusFilter);
    });
  }, [requests, search, statusFilter]);

  const availableVehicles = vehicles.filter((v) => v.status === 'available' || v.status === 'assigned');
  const availableDrivers = drivers.filter((d) => d.is_active);

  const columns: Column<RequestWithRelations>[] = [
    { key: 'ref', header: 'Ref', render: (r) => <span className="font-mono text-xs font-semibold">{r.ref_code}</span> },
    {
      key: 'employee',
      header: 'Employee',
      render: (r) => (
        <div>
          <div className="font-semibold text-ink">{r.requester?.full_name ?? '—'}</div>
          <div className="text-[11px] text-ink-3">{requesterDepartment(r.requester?.department_id ?? null) ?? ''}</div>
        </div>
      ),
    },
    {
      key: 'destination',
      header: 'Destination',
      render: (r) => (
        <div>
          <div className="text-ink-2">{r.destination}</div>
          <div className="text-[11px] text-ink-3">{fmtDate(r.travel_date)}</div>
        </div>
      ),
    },
    { key: 'priority', header: 'Priority', render: (r) => <StatusBadge tone={r.priority} /> },
    {
      key: 'assignments',
      header: 'Vehicle / Driver',
      render: (r) => (
        <div className="text-xs">
          <div className="font-mono">{r.assignedVehicle?.registration_number ?? '—'}</div>
          <div className="text-ink-3">{r.assignedDriver?.full_name ?? '—'}</div>
        </div>
      ),
    },
    {
      key: 'submitted',
      header: 'Submitted',
      render: (r) => <span className="text-xs">{fmtDateTime(r.created_at)}</span>,
    },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge tone={requestTone(r.status)} /> },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) =>
        r.status === 'pending' || r.status === 'assigned' ? (
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="success"
              title={r.status === 'assigned' ? 'Assign a vehicle or driver to finish this approval' : undefined}
              icon={<Check className="h-3.5 w-3.5" />}
              onClick={() => setApproving(r)}
            >
              {r.status === 'assigned' ? 'Assign' : 'Approve'}
            </Button>
            {r.status === 'pending' && (
              <Button size="sm" variant="ghost" icon={<X className="h-3.5 w-3.5" />} onClick={() => setRejecting(r)}>
                Reject
              </Button>
            )}
          </div>
        ) : null,
    },
  ];

  return (
    <>
      <PageHeader title="Request Management" description="Review, approve or reject all travel requests" />
      <PageBody>
        <DataTable
          columns={columns}
          rows={filtered}
          loading={isLoading}
          error={error?.message ?? null}
          onRetry={() => refetch()}
          searchPlaceholder="Search ref, employee, destination…"
          searchValue={search}
          onSearchChange={setSearch}
          rowKey={(r) => r.id}
          emptyTitle="No requests found"
          filters={
            <FilterSelect label="All Status" value={statusFilter} onChange={setStatusFilter} options={statusOptions} />
          }
        />
      </PageBody>

      <ApproveModal
        key={approving?.id ?? 'approve-none'}
        request={approving}
        vehicles={availableVehicles}
        drivers={availableDrivers}
        departments={departments}
        submitting={approveMutation.isPending}
        onSubmit={(vehicleId, driverId) => approveMutation.mutate({ vehicleId, driverId })}
        onClose={() => setApproving(null)}
      />

      <RejectModal
        key={rejecting?.id ?? 'reject-none'}
        request={rejecting}
        submitting={rejectMutation.isPending}
        onSubmit={(reason) => rejectMutation.mutate(reason)}
        onClose={() => setRejecting(null)}
      />
    </>
  );
}

function ApproveModal({
  request,
  vehicles,
  drivers,
  departments,
  submitting,
  onSubmit,
  onClose,
}: {
  request: RequestWithRelations | null;
  vehicles: Array<{ id: string; registration_number: string; make: string; model: string }>;
  drivers: Array<{ id: string; full_name: string }>;
  departments: Array<{ id: string; name: string }>;
  submitting: boolean;
  onSubmit: (vehicleId: string, driverId: string) => void;
  onClose: () => void;
}) {
  const [vehicleId, setVehicleId] = useState(request?.assignedVehicle?.id ?? '');
  const [driverId, setDriverId] = useState(request?.assignedDriver?.id ?? '');
  const [error, setError] = useState('');

  if (!request) return null;

  function submit() {
    if (!vehicleId || !driverId) {
      setError('Assign both a vehicle and a driver before approving.');
      return;
    }
    setError('');
    onSubmit(vehicleId, driverId);
  }

  const requester = request.requester;

  return (
    <Modal
      open
      onClose={onClose}
      title={`Review & Approve — ${request.ref_code}`}
      subtitle={
        request.status === 'assigned'
          ? 'This request is partially assigned — choose the missing vehicle or driver to finish.'
          : `Submitted ${fmtDateTime(request.created_at)}`
      }
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="success" icon={<Check className="h-4 w-4" />} onClick={submit} loading={submitting}>
            Approve & Assign
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 rounded border border-line bg-bg px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue/10 text-sm font-bold uppercase text-blue">
              {(requester?.full_name ?? '..').slice(0, 2)}
            </div>
            <div className="min-w-0">
              <div className="truncate font-semibold text-ink">{requester?.full_name ?? '—'}</div>
              <div className="truncate text-xs text-ink-3">{requester?.email ?? ''}</div>
              <div className="truncate text-xs text-ink-3">
                {departments.find((x) => x.id === requester?.department_id)?.name ?? ''}
                {requester?.phone ? ` · ${requester.phone}` : ''}
              </div>
            </div>
          </div>
          <StatusBadge tone={requestTone(request.status)} />
        </div>

        <div className="rounded border border-line bg-bg px-3 py-2.5">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <div className="text-[11px] uppercase tracking-wide text-ink-3">Origin</div>
              <div className="mt-0.5 font-semibold text-ink">{request.origin}</div>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-blue" />
            <div className="min-w-0 flex-1 text-right">
              <div className="text-[11px] uppercase tracking-wide text-ink-3">Destination</div>
              <div className="mt-0.5 font-semibold text-ink">{request.destination}</div>
            </div>
          </div>
        </div>

        <div className="rounded border border-line bg-bg px-3 py-2.5">
          <div className="text-[11px] uppercase tracking-wide text-ink-3">Purpose of Travel</div>
          <p className="mt-1 text-sm leading-relaxed text-ink">{request.purpose}</p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <ReviewItem label="Departure Date" value={fmtDate(request.travel_date)} />
          <ReviewItem label="Return Date" value={fmtDate(request.return_date)} />
          <ReviewItem label="Departure Time" value={request.departure_time ?? '—'} />
          <ReviewItem label="Passengers" value={String(request.passenger_count)} />
          <div className="rounded border border-line bg-bg px-3 py-2">
            <div className="text-[11px] uppercase tracking-wide text-ink-3">Priority</div>
            <div className="mt-1">
              <StatusBadge tone={request.priority} />
            </div>
          </div>
          <div className="rounded border border-line bg-bg px-3 py-2">
            <div className="text-[11px] uppercase tracking-wide text-ink-3">Ref</div>
            <div className="mt-0.5 font-mono text-xs font-semibold text-ink">{request.ref_code}</div>
          </div>
        </div>

        {request.notes ? (
          <div className="rounded border border-line bg-bg px-3 py-2">
            <div className="text-[11px] uppercase tracking-wide text-ink-3">Notes</div>
            <p className="mt-1 text-sm text-ink">{request.notes}</p>
          </div>
        ) : null}

        <FormRow>
          <Field>
            <Label required>Assign Vehicle</Label>
            <Select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
              <option value="">— Select Vehicle —</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.registration_number} — {v.make} {v.model}
                </option>
              ))}
            </Select>
          </Field>
          <Field>
            <Label required>Assign Driver</Label>
            <Select value={driverId} onChange={(e) => setDriverId(e.target.value)}>
              <option value="">— Select Driver —</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.full_name}
                </option>
              ))}
            </Select>
          </Field>
        </FormRow>
        {error && (
          <p className="rounded border border-danger-border bg-danger-bg px-3 py-2 text-xs text-danger">{error}</p>
        )}
      </div>
    </Modal>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-line bg-bg px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-ink-3">{label}</div>
      <div className="mt-0.5 text-sm font-medium text-ink">{value}</div>
    </div>
  );
}

function RejectModal({
  request,
  submitting,
  onSubmit,
  onClose,
}: {
  request: RequestWithRelations | null;
  submitting: boolean;
  onSubmit: (reason: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('No available vehicle on requested date');

  if (!request) return null;

  return (
    <Modal
      open
      onClose={onClose}
      title={`Reject Request — ${request.ref_code}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="danger" icon={<X className="h-4 w-4" />} onClick={() => onSubmit(reason)} loading={submitting}>
            Confirm Rejection
          </Button>
        </>
      }
    >
      <p className="mb-4 rounded border border-danger-border bg-danger-bg px-3 py-2 text-xs text-danger">
        Rejected requests notify the employee. This action is recorded in the audit log.
      </p>
      <Field>
        <Label required>Reason for Rejection</Label>
        <Select value={reason} onChange={(e) => setReason(e.target.value)}>
          <option>No available vehicle on requested date</option>
          <option>No available driver on requested date</option>
          <option>Request not sufficiently justified</option>
          <option>Duplicate request submitted</option>
          <option>Request outside working hours</option>
          <option>Other</option>
        </Select>
      </Field>
    </Modal>
  );
}