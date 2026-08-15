import { supabase } from '@/config/supabase';
import type { Json } from '@/types/database';

export async function notifyUser(
  userId: string,
  title: string,
  message: string,
  type: 'info' | 'success' | 'warning' | 'error' = 'info',
  metadata?: Json,
): Promise<void> {
  await supabase.rpc('notify_user', {
    p_user_id: userId,
    p_title: title,
    p_message: message,
    p_type: type,
    p_metadata: metadata ?? null,
  });
}

export async function logAudit(
  action: string,
  entity: string,
  entityId?: string,
  metadata?: Json,
): Promise<void> {
  await supabase.rpc('log_audit', {
    p_action: action,
    p_entity: entity,
    p_entity_id: entityId ?? null,
    p_metadata: metadata ?? null,
  });
}
