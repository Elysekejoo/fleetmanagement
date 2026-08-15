import { supabase } from '@/config/supabase';
import type { AppSettings } from '@/types/domain';
import { logAudit } from '@/services/notifications';

export const DEFAULT_SETTINGS: AppSettings = {
  id: 1,
  system_name: 'Fleet FMS',
  org_name: 'Management Sciences for Health',
  org_line: 'USAID-IREME Project · Rwanda',
  location_line: 'Kigali, Rwanda · USAID-IREME',
  footer_line_1: 'FMS v2.0 - MSH Rwanda',
  footer_line_2: 'USAID-IREME · Kigali, Rwanda',
  hero_title: 'Fleet Management & GPS Tracking System',
  hero_subtitle:
    'A centralized platform for managing organizational vehicles, travel requests, driver assignments, fuel and maintenance records, and fleet visibility across Rwanda.',
  mission_title: 'Rwanda',
  mission_text: 'Dependable fleet operations in support of health programs across Rwanda.',
  updated_at: new Date().toISOString(),
  updated_by: null,
};

export async function fetchSettings(): Promise<AppSettings> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();
  if (error) throw error;
  return (data ?? DEFAULT_SETTINGS) as AppSettings;
}

export async function updateSettings(patch: Partial<AppSettings>): Promise<void> {
  const { error } = await supabase
    .from('app_settings')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', 1);
  if (error) throw error;
  await logAudit('settings.updated', 'app_settings', '1', {
    fields: Object.keys(patch),
  });
}
