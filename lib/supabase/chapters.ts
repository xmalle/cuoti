import { supabase, isSupabaseConfigured } from './client';
import type { Chapter } from '@/types';

export async function listChapters(subjectId: string): Promise<Chapter[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from('chapters')
    .select('*')
    .eq('subject_id', subjectId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function listAllChapters(): Promise<Chapter[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from('chapters')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function createChapter(subjectId: string, name: string): Promise<Chapter> {
  const { data: existing } = await supabase
    .from('chapters')
    .select('sort_order')
    .eq('subject_id', subjectId)
    .order('sort_order', { ascending: false })
    .limit(1);
  const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

  const { data, error } = await supabase
    .from('chapters')
    .insert({ subject_id: subjectId, name, sort_order: nextOrder })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateChapter(id: string, updates: Partial<Pick<Chapter, 'name' | 'sort_order'>>): Promise<Chapter> {
  const { data, error } = await supabase
    .from('chapters')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteChapter(id: string): Promise<void> {
  const { error } = await supabase.from('chapters').delete().eq('id', id);
  if (error) throw error;
}

// 批量更新排序
export async function reorderChapters(chapters: { id: string; sort_order: number }[]): Promise<void> {
  for (const c of chapters) {
    const { error } = await supabase.from('chapters').update({ sort_order: c.sort_order }).eq('id', c.id);
    if (error) throw error;
  }
}
