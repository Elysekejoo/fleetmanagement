import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, KeyRound, X } from 'lucide-react';
import { PageBody, PageHeader } from '@/components/ui/Page';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DataTable, FilterSelect, type Column } from '@/components/ui/DataTable';
import { Field, Label, Select } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { fmtDateTime } from '@/lib/utils';
import { friendlyError } from '@/lib/errors';
import { fetchPasswordResetRequests, approvePasswordReset, rejectPasswordReset } from '@/services/passwordResets';
import type { PasswordResetRequest, PasswordResetStatus } from '@/types/domain';

const statusOptions: Array<{ value: string; label: string }> = [
  { value: '', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

const REJECTION_REASONS = [
  'Identity could not be verified',
  'Account flagged - contact administrator',
  'Duplicate request submitted',
  'Request outside policy',
  'Other',
];

function resetTone(status: PasswordResetStatus): Parameters<typeof StatusBadge>[0]['tone'] {
  return status === 'pending' ? 'pending' : status === 'approved' ? 'approved' : 'rejected';
}

export default function PasswordResetsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [approving, setApproving] = useState<PasswordResetRequest | null>(null);
  const [rejecting, setRejecting] = useState<PasswordResetRequest | null>(null);

  const { data: requests = [], isLoading, error, refetch } = useQuery({
    queryKey: ['password-resets'],
    queryFn: fetchPasswordResetRequests,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['password-resets'] });
    void queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  const approveMutation = useMutation({
    mutationFn: () => approvePasswordReset(approving!.id),
    onSuccess: () => {
      toast.show('success', `Password reset approved for ${approving!.full_name}. The new password is now active.`);
      setApproving(null);
      invalidate();
    },
    onError: (err) => toast.show('error', friendlyError(err, 'Unable to approve this request. Please try again.')),
  });

  const rejectMutation = useMutation({
    mutationFn: (reason: string) => rejectPasswordReset(rejecting!.id, reason),
    onSuccess: () => {
      toast.show('success', `Reset request rejected for ${rejecting!.full_name}. The user has been notified.`);
      setRejecting(null);
      invalidate();
    },
    onError: (err) => toast.show('error', friendlyError(err, 'Unable to reject this request. Please try again.')),
  });

  const rows = statusFilter ? requests.filter((r) => r.status === statusFilter) : requests;

  const columns: Column<PasswordResetRequest>[] = [
    {
      key: 'user',
      header: 'User',
      render: (r) => (
        <div>
          <div className="font-semibold text-ink">{r.full_name}</div>
          <div className="font-mono text-[11px] text-ink-3">{r.email}</div>
        </div>
      ),
    },
    { key: 'role', header: 'Role', render: (r) => <StatusBadge tone={r.role} /> },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge tone={resetTone(r.status)} /> },
    {
      key: 'submitted',
      header: 'Submitted',
      render: (r) => <span className="text-xs">{fmtDateTime(r.submitted_at)}</span>,
    },
    {
      key: 'reviewed',
      header: 'Reviewed',
      render: (r) =>
        r.reviewed_at ? (
          <span className="text-xs text-ink-2">{fmtDateTime(r.reviewed_at)}</span>
        ) : (
          <span className="text-xs text-ink-3">—</span>
        ),
    },
    {
      key: 'reason',
      header: 'Rejection reason',
      render: (r) => <span className="text-xs text-ink-2">{r.rejection_reason ?? '—'}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) =>
        r.status === 'pending' ? (
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="success" icon={<Check className="h-3.5 w-3.5" />} onClick={() => setApproving(r)}>
              Approve
            </Button>
            <Button size="sm" variant="ghost" icon={<X className="h-3.5 w-3.5" />} onClick={() => setRejecting(r)}>
              Reject
            </Button>
          </div>
        ) : null,
    },
  ];

  return (
    <>
      <PageHeader
        title="Password Reset Requests"
        description="Review and approve or reject self-service password reset requests"
      />
      <PageBody>
        <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-line bg-bg px-4 py-3 text-xs text-ink-2">
          <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-blue" aria-hidden="true" />
          <p>
            Employees and drivers who forgot their password verify their identity with the password they last used,
            then request a new one. Approving a request activates the new password immediately and notifies the user.
          </p>
        </div>
        <DataTable
          columns={columns}
          rows={rows}
          loading={isLoading}
          error={error?.message ?? null}
          onRetry={() => refetch()}
          rowKey={(r) => r.id}
          emptyTitle="No password reset requests"
          filters={
            <FilterSelect label="All Status" value={statusFilter} onChange={setStatusFilter} options={statusOptions} />
          }
        />
      </PageBody>

      <ConfirmDialog
        open={Boolean(approving)}
        title="Approve password reset"
        message={
          approving
            ? `This will immediately activate the new password chosen by ${approving.full_name}. They will be able to sign in with it right away.`
            : ''
        }
        confirmLabel="Approve"
        loading={approveMutation.isPending}
        onConfirm={() => approveMutation.mutate()}
        onClose={() => setApproving(null)}
      />

      {rejecting && (
        <RejectResetModal
          request={rejecting}
          submitting={rejectMutation.isPending}
          onSubmit={(reason) => rejectMutation.mutate(reason)}
          onClose={() => setRejecting(null)}
        />
      )}
    </>
  );
}

function RejectResetModal({
  request,
  submitting,
  onSubmit,
  onClose,
}: {
  request: PasswordResetRequest;
  submitting: boolean;
  onSubmit: (reason: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState(REJECTION_REASONS[0]);

  return (
    <Modal
      open
      onClose={onClose}
      title={`Reject reset — ${request.full_name}`}
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
      <p className="mb-4 rounded-md border border-danger-border bg-danger-bg px-3 py-2 text-xs text-danger">
        The user will be notified that their request was rejected and why. This action is recorded in the audit log.
      </p>
      <Field>
        <Label required>Reason for Rejection</Label>
        <Select value={reason} onChange={(e) => setReason(e.target.value)}>
          {REJECTION_REASONS.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </Select>
      </Field>
    </Modal>
  );
}
