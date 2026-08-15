import { supabase } from '@/config/supabase';
import type { Department } from '@/types/domain';
import { logAudit } from '@/services/notifications';

export async function fetchDepartments(): Promise<Department[]> {
  const { data, error } = await supabase.from('departments').select('*').order('name');
  if (error) throw error;
  return data ?? [];
}

export type NewDepartmentInput = {
  name: string;
  description?: string | null;
};

export async function createDepartment(input: NewDepartmentInput): Promise<Department> {
  const { data, error } = await supabase
    .from('departments')
    .insert({ name: input.name, description: input.description ?? null })
    .select('*')
    .single();
  if (error) throw error;
  if (!data) throw new Error('Failed to create department');
  await logAudit('department.created', 'departments', data.id, { name: input.name });
  return data;
}

export async function updateDepartment(id: string, input: NewDepartmentInput): Promise<void> {
  const { error } = await supabase
    .from('departments')
    .update({ name: input.name, description: input.description ?? null })
    .eq('id', id);
  if (error) throw error;
  await logAudit('department.updated', 'departments', id, { name: input.name });
}

export async function deleteDepartment(id: string): Promise<void> {
  const { error } = await supabase.from('departments').delete().eq('id', id);
  if (error) throw error;
  await logAudit('department.deleted', 'departments', id);
}