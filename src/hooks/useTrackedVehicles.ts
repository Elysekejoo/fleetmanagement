import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getTrackingSource } from '@/services/tracking';
import type { VehicleLocation } from '@/types/domain';

export interface TrackedVehiclesResult {
  locations: VehicleLocation[];
  isDemo: boolean;
  mode: 'demo' | 'live';
  isError: boolean;
  error: Error | null;
  isLoading: boolean;
  isRefetching: boolean;
  lastSyncAt?: string;
  refetch: () => void;
}

export function useTrackedVehicles(): TrackedVehiclesResult {
  const source = useMemo(getTrackingSource, []);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['tracked-vehicles', source.mode],
    queryFn: () => source.load(),
    refetchInterval: source.mode === 'demo' ? 5_000 : undefined,
    staleTime: source.mode === 'demo' ? 5_000 : 30_000,
  });

  useEffect(() => {
    if (source.mode !== 'live' || !source.subscribe) return;
    return source.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['tracked-vehicles', source.mode] });
    });
  }, [source, queryClient]);

  return {
    locations: query.data ?? [],
    isDemo: source.mode === 'demo',
    mode: source.mode,
    isError: query.isError,
    error: query.error as Error | null,
    isLoading: query.isLoading,
    isRefetching: query.isFetching && !query.isLoading,
    lastSyncAt: query.dataUpdatedAt ? new Date(query.dataUpdatedAt).toISOString() : undefined,
    refetch: () => {
      void query.refetch();
    },
  };
}