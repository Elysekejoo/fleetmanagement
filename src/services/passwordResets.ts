import { supabase } from '@/config/supabase';
import type { PasswordResetRequest } from '@/types/domain';

export async function fetchPasswordResetRequests(): Promise<PasswordResetRequest[]> {
  const { data, error } = await supabase
    .from('password_reset_requests')
    .select('*')
    .order('submitted_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as PasswordResetRequest[];
}

export async function requestPasswordReset(
  email: string,
  lastUsedPassword: string,
  newPassword: string,
): Promise<void> {
  const { error } = await supabase.rpc('request_password_reset', {
    p_email: email.trim(),
    p_last_used_password: lastUsedPassword,
    p_new_password: newPassword,
  });
  if (error) throw error;
}

export async function approvePasswordReset(requestId: string): Promise<void> {
  const { error } = await supabase.rpc('approve_password_reset', {
    p_request_id: requestId,
  });
  if (error) throw error;
}

export async function rejectPasswordReset(requestId: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc('reject_password_reset', {
    p_request_id: requestId,
    p_reason: reason || 'No reason provided.',
  });
  if (error) throw error;
}
