import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Info, AlertTriangle, XCircle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

type Toast = { id: number; type: ToastType; message: string };

const ToastContext = createContext<{ show: (type: ToastType, message: string) => void }>({
  show: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

const icons = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

const borderColors = {
  success: 'border-l-ok',
  error: 'border-l-danger',
  info: 'border-l-blue',
  warning: 'border-l-gold',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const show = useCallback((type: ToastType, message: string) => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed right-4 top-16 z-[90] flex flex-col gap-2" aria-live="polite">
          {toasts.map((toast) => {
            const Icon = icons[toast.type];
            return (
              <div
                key={toast.id}
                className={`pointer-events-auto flex max-w-xs items-start gap-2 rounded-lg bg-navy px-3.5 py-3 text-[13px] text-white shadow-card border-l-4 ${borderColors[toast.type]}`}
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{toast.message}</span>
              </div>
            );
          })}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}