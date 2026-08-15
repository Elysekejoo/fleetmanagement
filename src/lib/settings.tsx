import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DEFAULT_SETTINGS, fetchSettings } from '@/services/settings';
import type { AppSettings } from '@/types/domain';

interface SettingsContextValue {
  settings: AppSettings;
  isLoading: boolean;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  isLoading: true,
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { data, isLoading } = useQuery({
    queryKey: ['app-settings'],
    queryFn: fetchSettings,
    staleTime: 60_000,
    retry: 1,
  });

  const value = useMemo(
    () => ({ settings: data ?? DEFAULT_SETTINGS, isLoading }),
    [data, isLoading],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  return useContext(SettingsContext);
}
