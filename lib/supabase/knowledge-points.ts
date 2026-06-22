import { supabase, isSupabaseConfigured } from './client';
import type { KnowledgePoint } from '@/types';

export async function listKnowledgePoints(chapterId: string): Promise<KnowledgePoint[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from('knowledge_points')
    .select('*')
    .eq('chapter_id', chapterId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function createKnowledgePoint(chapterId: string, name: string): Promise<KnowledgePoint> {
  const { data, error } = await supabase
    .from('knowledge_points')
    .insert({ chapter_id: chapterId, name })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateKnowledgePoint(id: string, name: string): Promise<KnowledgePoint> {
  const { data, error } = await supabase
    .from('knowledge_points')
    .update({ name })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteKnowledgePoint(id: string): Promise<void> {
  const { error } = await supabase.from('knowledge_points').delete().eq('id', id);
  if (error) throw error;
}
