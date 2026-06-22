import { supabase, isSupabaseConfigured } from './client';
import type { Question, QuestionFormData, FilterState, PaginatedResponse } from '@/types';

const PAGE_SIZE = 20;

// 构建查询（带关联）
function buildQuery() {
  return supabase
    .from('questions')
    .select(`
      *,
      subject:subjects(*),
      chapter:chapters(*),
      knowledge_point:knowledge_points(*),
      images:question_images(*)
    `);
}

// 列表查询（分页 + 筛选）
export async function listQuestions(
  filters: FilterState,
  cursor?: string
): Promise<PaginatedResponse<Question>> {
  if (!isSupabaseConfigured()) return { data: [], hasMore: false, nextCursor: null };

  let query = buildQuery();

  if (filters.subject_id) query = query.eq('subject_id', filters.subject_id);
  if (filters.chapter_id) query = query.eq('chapter_id', filters.chapter_id);
  if (filters.difficulty) query = query.eq('difficulty', filters.difficulty);
  if (filters.review_status) query = query.eq('review_status', filters.review_status);
  if (filters.error_tag) query = query.contains('error_tags', [filters.error_tag]);

  query = query.order('created_at', { ascending: false }).limit(PAGE_SIZE);

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data, error } = await query;
  if (error) throw error;

  const list = data || [];
  const hasMore = list.length === PAGE_SIZE;
  const nextCursor = hasMore ? list[list.length - 1].created_at : null;

  return { data: list, hasMore, nextCursor };
}

// 获取单条详情
export async function getQuestion(id: string): Promise<Question | null> {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await buildQuery().eq('id', id).single();
  if (error) throw error;
  return data;
}

// 新增错题
export async function createQuestion(form: QuestionFormData): Promise<Question> {
  const { data, error } = await supabase
    .from('questions')
    .insert({
      subject_id: form.subject_id,
      chapter_id: form.chapter_id,
      knowledge_point_id: form.knowledge_point_id || null,
      difficulty: form.difficulty,
      error_tags: form.error_tags,
      error_description: form.error_description || null,
      analysis_supplement: form.analysis_supplement || null,
      source: form.source || null,
      review_status: 'pending',
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// 更新错题
export async function updateQuestion(id: string, form: QuestionFormData): Promise<Question> {
  const { data, error } = await supabase
    .from('questions')
    .update({
      subject_id: form.subject_id,
      chapter_id: form.chapter_id,
      knowledge_point_id: form.knowledge_point_id || null,
      difficulty: form.difficulty,
      error_tags: form.error_tags,
      error_description: form.error_description || null,
      analysis_supplement: form.analysis_supplement || null,
      source: form.source || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// 切换复习状态
export async function toggleReviewStatus(id: string, status: 'pending' | 'mastered'): Promise<void> {
  const { error } = await supabase
    .from('questions')
    .update({ review_status: status, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

// 删除错题（图片由数据库外键级联删除记录，Storage 文件单独清理）
export async function deleteQuestion(id: string): Promise<void> {
  // 先查出图片路径用于清理 Storage
  const { data: images } = await supabase.from('question_images').select('storage_path').eq('question_id', id);
  if (images && images.length > 0) {
    const paths = images.map((i) => i.storage_path);
    await supabase.storage.from('question-images').remove(paths);
  }
  const { error } = await supabase.from('questions').delete().eq('id', id);
  if (error) throw error;
}

// 统计总数与待复习数
export async function getQuestionStats(): Promise<{ total: number; pending: number }> {
  if (!isSupabaseConfigured()) return { total: 0, pending: 0 };
  const { count: total, error: e1 } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true });
  if (e1) throw e1;
  const { count: pending, error: e2 } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true })
    .eq('review_status', 'pending');
  if (e2) throw e2;
  return { total: total || 0, pending: pending || 0 };
}

// PDF 导出查询（不分页）
export async function listQuestionsForExport(filters: {
  subject_ids: string[];
  chapter_ids: string[];
  review_status: 'all' | 'pending' | 'mastered';
  difficulty_min: number;
  difficulty_max: number;
}): Promise<Question[]> {
  if (!isSupabaseConfigured()) return [];
  let query = buildQuery();
  if (filters.subject_ids.length > 0) query = query.in('subject_id', filters.subject_ids);
  if (filters.chapter_ids.length > 0) query = query.in('chapter_id', filters.chapter_ids);
  if (filters.review_status !== 'all') query = query.eq('review_status', filters.review_status);
  query = query.gte('difficulty', filters.difficulty_min).lte('difficulty', filters.difficulty_max);
  query = query.order('created_at', { ascending: false });
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}
