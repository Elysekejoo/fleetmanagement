export const env = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL as string | undefined,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined,
  mapApiKey: import.meta.env.VITE_MAP_API_KEY as string | undefined,
} as const;

export const isDemoMode: boolean =
  (import.meta.env.VITE_GPS_DEMO as string | undefined) === 'true' || !env.supabaseUrl || !env.supabaseAnonKey;

export const isPwaEnabled: boolean = (import.meta.env.VITE_ENABLE_PWA as string | undefined) !== 'false';