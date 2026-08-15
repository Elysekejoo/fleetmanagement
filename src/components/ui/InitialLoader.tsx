import { useEffect } from 'react';

export function InitialLoader() {
  useEffect(() => {
    window.dispatchEvent(new Event('fms-preloader-done'));
  }, []);

  return (
    <div
      className="fixed inset-0 z-[9999] flex h-[100dvh] flex-col items-center justify-center bg-navy"
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <img
        src="/icons/icon-512.png"
        alt=""
        className="h-[120px] w-[120px] object-contain"
        draggable={false}
      />
      <div
        className="mt-8 h-9 w-9 animate-spin rounded-full"
        aria-hidden="true"
        style={{ border: '3px solid rgba(245,180,0,0.25)', borderTopColor: '#F5B400' }}
      />
      <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-400">
        MSH RWANDA
      </p>
    </div>
  );
}