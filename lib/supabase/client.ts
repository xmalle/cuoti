import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// 单例 Supabase 客户端
let supabaseClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    // 未配置时返回占位实例，避免应用崩溃；调用数据层时会抛错提示
    return createClient('https://placeholder.supabase.co', 'placeholder-key');
  }
  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    });
  }
  return supabaseClient;
}

export const supabase = getSupabaseClient();

// 检查是否已配置
export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

// Storage bucket 名称
export const STORAGE_BUCKET = 'question-images';

// 获取图片公开访问 URL
export function getPublicImageUrl(storagePath: string): string {
  if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
    return '';
  }
  return `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${storagePath}`;
}
