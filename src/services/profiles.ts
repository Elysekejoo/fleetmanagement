import { supabase } from '@/config/supabase';
import type { Profile, ProfileRow } from '@/types/domain';
import { logAudit } from '@/services/notifications';

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase.from('profiles').select('*').order('full_name');
  if (error) throw error;
  return data ?? [];
}

export async function fetchAdmins(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'admin')
    .eq('is_active', true);
  if (error) throw error;
  return data ?? [];
}

export async function fetchDrivers(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'driver')
    .eq('is_active', true)
    .order('full_name');
  if (error) throw error;
  return data ?? [];
}

export type NewUserInput = {
  fullName: string;
  email: string;
  password: string;
  phone?: string | null;
  role: ProfileRow['role'];
  departmentId?: string | null;
  position?: string | null;
  employeeNumber?: string | null;
  licenseNumber?: string | null;
  licenseCategory?: string | null;
  licenseExpiry?: string | null;
};

export async function createUser(input: NewUserInput): Promise<Profile> {
  const { data, error } = await supabase.rpc('create_staff_account', {
    p_email: input.email,
    p_password: input.password,
    p_full_name: input.fullName,
    p_role: input.role,
    p_phone: input.phone ?? null,
    p_department_id: input.departmentId ?? null,
    p_employee_number: input.employeeNumber ?? null,
    p_position: input.position ?? null,
    p_license_number: input.licenseNumber ?? null,
    p_license_category: input.licenseCategory ?? null,
    p_license_expiry: input.licenseExpiry ?? null,
  });
  if (error) throw error;
  if (!data) throw new Error('Failed to create user account');
  await logAudit('user.created', 'profiles', data.id, {
    email: input.email,
    role: input.role,
  });
  return data;
}

export async function adminResetPassword(userId: string, newPassword: string): Promise<void> {
  const { error } = await supabase.rpc('admin_reset_password', {
    p_user_id: userId,
    p_new_password: newPassword,
  });
  if (error) throw error;
  await logAudit('user.password_reset', 'profiles', userId);
}

export type UpdateUserInput = {
  fullName: string;
  phone?: string | null;
  role: ProfileRow['role'];
  departmentId?: string | null;
  position?: string | null;
  employeeNumber?: string | null;
  licenseNumber?: string | null;
  licenseCategory?: string | null;
  licenseExpiry?: string | null;
};

export async function updateUser(userId: string, input: UpdateUserInput): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: input.fullName,
      phone: input.phone ?? null,
      role: input.role,
      department_id: input.departmentId ?? null,
      position: input.position ?? null,
      employee_number: input.employeeNumber ?? null,
      license_number: input.licenseNumber ?? null,
      license_category: input.licenseCategory ?? null,
      license_expiry: input.licenseExpiry ?? null,
    })
    .eq('id', userId);
  if (error) throw error;
  await logAudit('user.updated', 'profiles', userId, { role: input.role });
}

export async function setUserActive(userId: string, active: boolean): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ is_active: active })
    .eq('id', userId);
  if (error) throw error;
  await logAudit(active ? 'user.activated' : 'user.deactivated', 'profiles', userId);
}

export async function updateOwnProfile(userId: string, patch: { phone?: string | null }): Promise<void> {
  const { error } = await supabase.from('profiles').update(patch).eq('id', userId);
  if (error) throw error;
}
