import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  size?: 'md' | 'lg';
  children: ReactNode;
  footer?: ReactNode;
}

export function Modal({ open, onClose, title, subtitle, size = 'md', children, footer }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    const previouslyFocused = document.activeElement as HTMLElement | null;
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      previouslyFocused?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={cn(
          'flex max-h-[92vh] w-full flex-col overflow-hidden rounded-lg bg-white shadow-card',
          size === 'lg' ? 'max-w-[680px]' : 'max-w-[520px]',
        )}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <div className="min-w-0">
            <h2 className="truncate text-[15px] font-semibold text-ink">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-ink-3">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="shrink-0 rounded-md p-1.5 text-ink-3 transition-colors hover:bg-bg-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-blue"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && (
          <div className="flex shrink-0 justify-end gap-2 border-t border-line bg-bg px-5 py-3">{footer}</div>
        )}
      </div>
    </div>,
    document.body,
  );
}