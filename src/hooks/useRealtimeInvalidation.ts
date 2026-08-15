import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/config/supabase';

export function useRealtimeInvalidation() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('realtime-invalidation')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'travel_requests' }, () => {
        void queryClient.invalidateQueries({ queryKey: ['requests'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, () => {
        void queryClient.invalidateQueries({ queryKey: ['trips'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gps_locations' }, () => {
        void queryClient.invalidateQueries({ queryKey: ['gps-locations'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}