import type { ReactNode } from 'react';
import { AlertCircle, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function EmptyState({ icon, title, message, action }: { icon?: ReactNode; title: string; message?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 py-14 text-center">
      {icon ?? <Inbox className="h-9 w-9 text-line-dark" />}
      <p className="text-sm font-semibold text-ink-2">{title}</p>
      {message && <p className="max-w-sm text-xs text-ink-3">{message}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center">
      <AlertCircle className="h-8 w-8 text-danger" />
      <p className="text-sm font-semibold text-ink-2">Something went wrong</p>
      <p className="max-w-md text-xs text-ink-3">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}