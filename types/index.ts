// 错题本应用全局类型定义

export type ReviewStatus = 'pending' | 'mastered';
export type ImageType = 'question' | 'analysis';

// 错因标签枚举
export const ERROR_TAGS = [
  '计算失误',
  '概念模糊',
  '方法不会',
  '粗心大意',
  '时间不够',
] as const;

export type ErrorTag = (typeof ERROR_TAGS)[number];

// 科目
export interface Subject {
  id: string;
  name: string;
  color: string;
  sort_order: number;
  created_at: string;
}

// 章节
export interface Chapter {
  id: string;
  subject_id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

// 知识点
export interface KnowledgePoint {
  id: string;
  chapter_id: string;
  name: string;
  created_at: string;
}

// 题目图片
export interface QuestionImage {
  id: string;
  question_id: string;
  type: ImageType;
  storage_path: string;
  sort_order: number;
  created_at: string;
}

// 错题
export interface Question {
  id: string;
  subject_id: string;
  chapter_id: string;
  knowledge_point_id: string | null;
  difficulty: number;
  error_tags: string[];
  error_description: string | null;
  analysis_supplement: string | null;
  source: string | null;
  review_status: ReviewStatus;
  created_at: string;
  updated_at: string;
  // 关联查询字段
  subject?: Subject;
  chapter?: Chapter;
  knowledge_point?: KnowledgePoint | null;
  images?: QuestionImage[];
}

// 错题列表项（带关联数据）
export type QuestionListItem = Question;

// 首页筛选条件
export interface FilterState {
  subject_id?: string;
  chapter_id?: string;
  difficulty?: number;
  review_status?: ReviewStatus;
  error_tag?: string;
}

// 新增/编辑错题表单数据
export interface QuestionFormData {
  subject_id: string;
  chapter_id: string;
  knowledge_point_id: string | null;
  difficulty: number;
  error_tags: string[];
  error_description: string;
  analysis_supplement: string;
  source: string;
}

// PDF 导出筛选条件
export interface ExportFilters {
  subject_ids: string[];
  chapter_ids: string[];
  review_status: 'all' | ReviewStatus;
  difficulty_min: number;
  difficulty_max: number;
  group_by_chapter: boolean;
  include_analysis: boolean;
}

// 数据统计
export interface SubjectStats {
  subject: Subject;
  total: number;
  pending: number;
  mastered: number;
}

export interface ErrorTagStats {
  tag: string;
  count: number;
}

// Toast 消息
export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

// 分页响应
export interface PaginatedResponse<T> {
  data: T[];
  hasMore: boolean;
  nextCursor: string | null;
}
