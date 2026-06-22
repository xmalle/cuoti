-- 考研错题本 - 兼容已有表的迁移脚本
-- 在 Supabase Dashboard → SQL Editor 中粘贴执行
-- 此脚本会为已存在的表补齐缺失列，不会删除已有数据

-- ========== 1. 确保表存在（不存在才创建） ==========
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#B8472F',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS knowledge_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  knowledge_point_id UUID REFERENCES knowledge_points(id) ON DELETE SET NULL,
  difficulty INT NOT NULL DEFAULT 3,
  error_tags TEXT[] NOT NULL DEFAULT '{}',
  error_description TEXT,
  analysis_supplement TEXT,
  source TEXT,
  review_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS question_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========== 2. 为已存在的表补齐缺失列 ==========
-- subjects
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#B8472F';
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- chapters
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS subject_id UUID;
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0;
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- knowledge_points
ALTER TABLE knowledge_points ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE knowledge_points ADD COLUMN IF NOT EXISTS chapter_id UUID;
ALTER TABLE knowledge_points ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE knowledge_points ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- questions
ALTER TABLE questions ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE questions ADD COLUMN IF NOT EXISTS subject_id UUID;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS chapter_id UUID;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS knowledge_point_id UUID;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS difficulty INT NOT NULL DEFAULT 3;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS error_tags TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE questions ADD COLUMN IF NOT EXISTS error_description TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS analysis_supplement TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE questions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE questions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- question_images
ALTER TABLE question_images ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE question_images ADD COLUMN IF NOT EXISTS question_id UUID;
ALTER TABLE question_images ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE question_images ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE question_images ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0;
ALTER TABLE question_images ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- ========== 3. 添加 CHECK 约束（忽略已存在的报错） ==========
DO $$
BEGIN
  BEGIN
    ALTER TABLE questions ADD CONSTRAINT questions_difficulty_check CHECK (difficulty BETWEEN 1 AND 5);
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER TABLE questions ADD CONSTRAINT questions_review_status_check CHECK (review_status IN ('pending', 'mastered'));
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER TABLE question_images ADD CONSTRAINT question_images_type_check CHECK (type IN ('question', 'analysis'));
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- ========== 4. 索引 ==========
CREATE INDEX IF NOT EXISTS idx_chapters_subject ON chapters(subject_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_points_chapter ON knowledge_points(chapter_id);
CREATE INDEX IF NOT EXISTS idx_questions_subject ON questions(subject_id);
CREATE INDEX IF NOT EXISTS idx_questions_chapter ON questions(chapter_id);
CREATE INDEX IF NOT EXISTS idx_questions_knowledge_point ON questions(knowledge_point_id);
CREATE INDEX IF NOT EXISTS idx_questions_review_status ON questions(review_status);
CREATE INDEX IF NOT EXISTS idx_questions_created_at ON questions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_question_images_question ON question_images(question_id);

-- ========== 5. updated_at 自动更新触发器 ==========
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_questions_updated_at ON questions;
CREATE TRIGGER trigger_questions_updated_at
  BEFORE UPDATE ON questions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ========== 6. RLS 策略 ==========
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_images ENABLE ROW LEVEL SECURITY;

-- subjects
DROP POLICY IF EXISTS "subjects_select" ON subjects;
CREATE POLICY "subjects_select" ON subjects FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "subjects_insert" ON subjects;
CREATE POLICY "subjects_insert" ON subjects FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "subjects_update" ON subjects;
CREATE POLICY "subjects_update" ON subjects FOR UPDATE TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "subjects_delete" ON subjects;
CREATE POLICY "subjects_delete" ON subjects FOR DELETE TO anon USING (true);

-- chapters
DROP POLICY IF EXISTS "chapters_select" ON chapters;
CREATE POLICY "chapters_select" ON chapters FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "chapters_insert" ON chapters;
CREATE POLICY "chapters_insert" ON chapters FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "chapters_update" ON chapters;
CREATE POLICY "chapters_update" ON chapters FOR UPDATE TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "chapters_delete" ON chapters;
CREATE POLICY "chapters_delete" ON chapters FOR DELETE TO anon USING (true);

-- knowledge_points
DROP POLICY IF EXISTS "kp_select" ON knowledge_points;
CREATE POLICY "kp_select" ON knowledge_points FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "kp_insert" ON knowledge_points;
CREATE POLICY "kp_insert" ON knowledge_points FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "kp_update" ON knowledge_points;
CREATE POLICY "kp_update" ON knowledge_points FOR UPDATE TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "kp_delete" ON knowledge_points;
CREATE POLICY "kp_delete" ON knowledge_points FOR DELETE TO anon USING (true);

-- questions
DROP POLICY IF EXISTS "questions_select" ON questions;
CREATE POLICY "questions_select" ON questions FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "questions_insert" ON questions;
CREATE POLICY "questions_insert" ON questions FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "questions_update" ON questions;
CREATE POLICY "questions_update" ON questions FOR UPDATE TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "questions_delete" ON questions;
CREATE POLICY "questions_delete" ON questions FOR DELETE TO anon USING (true);

-- question_images
DROP POLICY IF EXISTS "qi_select" ON question_images;
CREATE POLICY "qi_select" ON question_images FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "qi_insert" ON question_images;
CREATE POLICY "qi_insert" ON question_images FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "qi_update" ON question_images;
CREATE POLICY "qi_update" ON question_images FOR UPDATE TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "qi_delete" ON question_images;
CREATE POLICY "qi_delete" ON question_images FOR DELETE TO anon USING (true);

-- ========== 7. Storage 策略 ==========
DROP POLICY IF EXISTS "question_images_select" ON storage.objects;
CREATE POLICY "question_images_select" ON storage.objects
  FOR SELECT TO anon
  USING (bucket_id = 'question-images');

DROP POLICY IF EXISTS "question_images_insert" ON storage.objects;
CREATE POLICY "question_images_insert" ON storage.objects
  FOR INSERT TO anon
  WITH CHECK (bucket_id = 'question-images');

DROP POLICY IF EXISTS "question_images_update" ON storage.objects;
CREATE POLICY "question_images_update" ON storage.objects
  FOR UPDATE TO anon
  USING (bucket_id = 'question-images')
  WITH CHECK (bucket_id = 'question-images');

DROP POLICY IF EXISTS "question_images_delete" ON storage.objects;
CREATE POLICY "question_images_delete" ON storage.objects
  FOR DELETE TO anon
  USING (bucket_id = 'question-images');

-- ========== 8. 初始科目数据 ==========
INSERT INTO subjects (name, color, sort_order) VALUES
  ('数学一', '#B8472F', 0),
  ('专业课', '#3E7470', 1)
ON CONFLICT DO NOTHING;
