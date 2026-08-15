import { cn } from '@/lib/utils';

export type StatusTone = 'pending' | 'approved' | 'rejected' | 'completed' | 'available' | 'assigned' | 'on_trip' | 'maintenance' | 'inactive' | 'cancelled' | 'scheduled' | 'active' | 'in_progress' | 'info' | 'admin' | 'employee' | 'driver' | 'low' | 'normal' | 'high';

const toneMap: Record<StatusTone, string> = {
  pending: 'bg-warn-bg text-warn border-warn-border',
  approved: 'bg-ok-bg text-ok border-ok-border',
  rejected: 'bg-danger-bg text-danger border-danger-border',
  completed: 'bg-bg-2 text-ink-3 border-line',
  cancelled: 'bg-bg-2 text-ink-3 border-line',
  available: 'bg-ok-bg text-ok border-ok-border',
  assigned: 'bg-blue-lt text-blue border-[#a8c4f2]',
  on_trip: 'bg-warn-bg text-warn border-warn-border',
  maintenance: 'bg-danger-bg text-danger border-danger-border',
  inactive: 'bg-bg-2 text-ink-3 border-line',
  scheduled: 'bg-blue-lt text-blue border-[#a8c4f2]',
  active: 'bg-ok-bg text-ok border-ok-border',
  in_progress: 'bg-warn-bg text-warn border-warn-border',
  info: 'bg-blue-lt text-blue border-[#a8c4f2]',
  admin: 'bg-bg-2 text-ink-2 border-line',
  employee: 'bg-bg-2 text-ink-2 border-line',
  driver: 'bg-bg-2 text-ink-2 border-line',
  low: 'bg-ok-bg text-ok border-ok-border',
  normal: 'bg-blue-lt text-blue border-[#a8c4f2]',
  high: 'bg-danger-bg text-danger border-danger-border',
};

const labelMap: Record<StatusTone, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  completed: 'Completed',
  cancelled: 'Cancelled',
  available: 'Available',
  assigned: 'Assigned',
  on_trip: 'On Trip',
  maintenance: 'Maintenance',
  inactive: 'Inactive',
  scheduled: 'Scheduled',
  active: 'Active',
  in_progress: 'In Progress',
  info: 'Info',
  admin: 'Admin',
  employee: 'Employee',
  driver: 'Driver',
  low: 'Low',
  normal: 'Normal',
  high: 'High',
};

export function ToneLabel({ tone }: { tone: StatusTone }) {
  return <>{labelMap[tone] ?? tone}</>;
}

export function StatusBadge({ tone, label, className }: { tone: StatusTone; label?: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
        toneMap[tone],
        className,
      )}
    >
      {label ?? <ToneLabel tone={tone} />}
    </span>
  );
}