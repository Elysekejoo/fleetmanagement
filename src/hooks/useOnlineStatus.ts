import { useCallback, useEffect, useState } from 'react';

const LAST_SYNC_KEY = 'fms-last-sync';

function readLastSync(): string | null {
  return window.localStorage.getItem(LAST_SYNC_KEY);
}

export function stampLastSync(): void {
  window.localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
}

function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

export function useOnlineStatus() {
  const [online, setOnline] = useState(isOnline);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(readLastSync);

  useEffect(() => {
    const onOnline = () => {
      setOnline(true);
      const now = new Date().toISOString();
      window.localStorage.setItem(LAST_SYNC_KEY, now);
      setLastSyncAt(now);
    };
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const stamp = useCallback(() => {
    const now = new Date().toISOString();
    window.localStorage.setItem(LAST_SYNC_KEY, now);
    setLastSyncAt(now);
  }, []);

  return { online, lastSyncAt, stamp };
}

export function formatSyncTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}