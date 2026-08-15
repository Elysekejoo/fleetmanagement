import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-white px-5 py-4 sm:px-7">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-[28px] sm:leading-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-2">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

const statTones = {
  navy: { dot: 'bg-navy', chip: 'bg-navy text-white' },
  blue: { dot: 'bg-blue', chip: 'bg-blue-lt text-blue' },
  gold: { dot: 'bg-gold', chip: 'bg-warn-bg text-warn' },
  green: { dot: 'bg-ok', chip: 'bg-ok-bg text-ok' },
  red: { dot: 'bg-danger', chip: 'bg-danger-bg text-danger' },
} as const;

export function StatCard({
  label,
  value,
  sub,
  tone = 'navy',
  icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: keyof typeof statTones;
  icon?: ReactNode;
}) {
  const t = statTones[tone];
  return (
    <div className="min-w-0 rounded-xl border border-line bg-white p-4 shadow-sm transition-shadow hover:shadow-card sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', t.dot)} aria-hidden="true" />
          <span className="truncate text-[11px] font-semibold uppercase tracking-wider text-ink-2">{label}</span>
        </div>
        {icon && (
          <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', t.chip)} aria-hidden="true">
            {icon}
          </span>
        )}
      </div>
      <div className="mt-2 text-[28px] font-semibold leading-none tabular-nums text-ink sm:text-[30px]">{value}</div>
      {sub && <div className="mt-2 truncate text-xs text-ink-3">{sub}</div>}
    </div>
  );
}

export function Panel({
  title,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <div className={cn('overflow-hidden rounded-xl border border-line bg-white shadow-sm', className)}>
      {title && (
        <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3 sm:px-5">
          <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
          {actions}
        </div>
      )}
      <div className={bodyClassName ?? 'p-4 sm:p-5'}>{children}</div>
    </div>
  );
}

export function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line/60 py-2 text-sm last:border-b-0">
      <span className="text-xs text-ink-3">{label}</span>
      <span className="font-medium text-ink">{value}</span>
    </div>
  );
}

export function PageBody({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('mx-auto w-full max-w-[1680px] flex-1 p-5 sm:p-7', className)}>{children}</div>
  );
}