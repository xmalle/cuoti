import { supabase, isSupabaseConfigured } from './client';
import type { SubjectStats, ErrorTagStats, Subject } from '@/types';
import { ERROR_TAGS } from '@/types';

// 各科目统计
export async function getSubjectStats(subjects: Subject[]): Promise<SubjectStats[]> {
  if (!isSupabaseConfigured() || subjects.length === 0) {
    return subjects.map((s) => ({ subject: s, total: 0, pending: 0, mastered: 0 }));
  }
  const { data, error } = await supabase
    .from('questions')
    .select('subject_id, review_status');
  if (error) throw error;

  const map = new Map<string, { total: number; pending: number; mastered: number }>();
  for (const s of subjects) {
    map.set(s.id, { total: 0, pending: 0, mastered: 0 });
  }
  for (const q of data || []) {
    const stat = map.get(q.subject_id);
    if (!stat) continue;
    stat.total += 1;
    if (q.review_status === 'pending') stat.pending += 1;
    else stat.mastered += 1;
  }

  return subjects.map((subject) => ({
    subject,
    ...map.get(subject.id)!,
  }));
}

// 错因类型分布
export async function getErrorTagStats(): Promise<ErrorTagStats[]> {
  if (!isSupabaseConfigured()) return ERROR_TAGS.map((tag) => ({ tag, count: 0 }));
  const { data, error } = await supabase.from('questions').select('error_tags');
  if (error) throw error;

  const counts = new Map<string, number>();
  for (const tag of ERROR_TAGS) counts.set(tag, 0);
  for (const q of data || []) {
    const tags: string[] = q.error_tags || [];
    for (const t of tags) {
      counts.set(t, (counts.get(t) || 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}
