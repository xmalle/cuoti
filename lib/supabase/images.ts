import { supabase, STORAGE_BUCKET, isSupabaseConfigured } from './client';
import type { ImageType, QuestionImage } from '@/types';
import { timestampName } from '@/lib/utils/format';

// 上传单张图片到 Storage
export async function uploadImage(
  questionId: string,
  type: ImageType,
  file: File
): Promise<string> {
  const path = `${questionId}/${type}/${timestampName()}.jpg`;
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { contentType: 'image/jpeg', upsert: false });
  if (error) throw error;
  return path;
}

// 批量上传图片，返回 storage_path 数组
export async function uploadImages(
  questionId: string,
  type: ImageType,
  files: File[],
  onProgress?: (done: number, total: number) => void
): Promise<string[]> {
  const paths: string[] = [];
  for (let i = 0; i < files.length; i++) {
    const path = await uploadImage(questionId, type, files[i]);
    paths.push(path);
    onProgress?.(i + 1, files.length);
  }
  return paths;
}

// 写入图片记录到数据库
export async function createImageRecords(
  questionId: string,
  type: ImageType,
  storagePaths: string[]
): Promise<QuestionImage[]> {
  if (storagePaths.length === 0) return [];
  const records = storagePaths.map((path, index) => ({
    question_id: questionId,
    type: type.toLowerCase(),
    storage_path: path,
    sort_order: index,
  }));
  const { data, error } = await supabase.from('question_images').insert(records).select();
  if (error) throw error;
  return data || [];
}

// 删除指定题目的某类型图片（Storage + 数据库）
export async function deleteImagesByType(questionId: string, type: ImageType): Promise<void> {
  const { data: images } = await supabase
    .from('question_images')
    .select('id, storage_path')
    .eq('question_id', questionId)
    .eq('type', type);
  if (images && images.length > 0) {
    const paths = images.map((i) => i.storage_path);
    await supabase.storage.from(STORAGE_BUCKET).remove(paths);
    const ids = images.map((i) => i.id);
    await supabase.from('question_images').delete().in('id', ids);
  }
}

// 删除指定题目的所有图片
export async function deleteAllImages(questionId: string): Promise<void> {
  await deleteImagesByType(questionId, 'question');
  await deleteImagesByType(questionId, 'analysis');
}

// 替换某类型图片：先删旧的上传新的
export async function replaceImages(
  questionId: string,
  type: ImageType,
  newFiles: File[],
  onProgress?: (done: number, total: number) => void
): Promise<QuestionImage[]> {
  await deleteImagesByType(questionId, type);
  const paths = await uploadImages(questionId, type, newFiles, onProgress);
  return createImageRecords(questionId, type, paths);
}

export { isSupabaseConfigured };
