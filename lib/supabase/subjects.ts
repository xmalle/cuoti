import { supabase, isSupabaseConfigured } from './client';
import type { Subject } from '@/types';

export async function listSubjects(): Promise<Subject[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function createSubject(name: string, color: string = '#B8472F'): Promise<Subject> {
  const { data, error } = await supabase
    .from('subjects')
    .insert({ name, color })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateSubject(id: string, updates: Partial<Pick<Subject, 'name' | 'color' | 'sort_order'>>): Promise<Subject> {
  const { data, error } = await supabase
    .from('subjects')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSubject(id: string): Promise<void> {
  const { error } = await supabase.from('subjects').delete().eq('id', id);
  if (error) throw error;
}

// 获取下一个排序序号
export async function getNextSortOrder(): Promise<number> {
  const { data, error } = await supabase
    .from('subjects')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1);
  if (error) throw error;
  return data && data.length > 0 ? data[0].sort_order + 1 : 0;
}
