import { supabase } from '@/config/supabase';

export async function resetSystemData(): Promise<void> {
  const { error } = await supabase.rpc('admin_reset_system');
  if (error) throw error;
}
