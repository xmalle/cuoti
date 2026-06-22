-- 清理重复科目 + 添加唯一约束
-- 在 Supabase Dashboard → SQL Editor 中粘贴执行

-- 1. 删除所有重复科目，只保留每组 name 中最早创建的一条
DELETE FROM subjects a
USING subjects b
WHERE a.name = b.name
  AND a.created_at > b.created_at;

-- 2. 为 name 添加唯一约束，防止未来重复
ALTER TABLE subjects ADD CONSTRAINT subjects_name_unique UNIQUE (name);

-- 3. 确认只剩一条数学一和一条专业课（如果全删了则重新插入）
INSERT INTO subjects (name, color, sort_order) VALUES
  ('数学一', '#B8472F', 0),
  ('专业课', '#3E7470', 1)
ON CONFLICT (name) DO NOTHING;
