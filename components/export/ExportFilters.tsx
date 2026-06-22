'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, Star } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { listSubjects } from '@/lib/supabase/subjects';
import { listAllChapters } from '@/lib/supabase/chapters';
import type { Subject, Chapter } from '@/types';

interface Props {
  filters: {
    subject_ids: string[];
    chapter_ids: string[];
    review_status: 'all' | 'pending' | 'mastered';
    difficulty_min: number;
    difficulty_max: number;
    group_by_chapter: boolean;
    include_analysis: boolean;
  };
  onChange: (filters: Props['filters']) => void;
}

export function ExportFilters({ filters, onChange }: Props) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [sectionOpen, setSectionOpen] = useState<string | null>('subjects');

  useEffect(() => {
    listSubjects().then(setSubjects).catch(console.error);
    listAllChapters().then(setChapters).catch(console.error);
  }, []);

  const toggleSubject = (id: string) => {
    const next = filters.subject_ids.includes(id)
      ? filters.subject_ids.filter((s) => s !== id)
      : [...filters.subject_ids, id];
    onChange({ ...filters, subject_ids: next });
  };

  const toggleChapter = (id: string) => {
    const next = filters.chapter_ids.includes(id)
      ? filters.chapter_ids.filter((c) => c !== id)
      : [...filters.chapter_ids, id];
    onChange({ ...filters, chapter_ids: next });
  };

  const filteredChapters = filters.subject_ids.length > 0
    ? chapters.filter((c) => filters.subject_ids.includes(c.subject_id))
    : chapters;

  const toggle = (key: string) => setSectionOpen(sectionOpen === key ? null : key);

  return (
    <div className="flex flex-col gap-3">
      {/* 科目 */}
      <section className="bg-card rounded-card shadow-card overflow-hidden">
        <button
          onClick={() => toggle('subjects')}
          className="w-full px-4 h-12 flex items-center justify-between text-sm font-medium text-ink"
        >
          <span>选择科目{filters.subject_ids.length > 0 && ` (${filters.subject_ids.length})`}</span>
          <ChevronDown size={16} className={sectionOpen === 'subjects' ? 'rotate-180 transition-transform' : 'transition-transform'} />
        </button>
        {sectionOpen === 'subjects' && (
          <div className="px-4 pb-3 flex flex-wrap gap-2">
            {subjects.map((s) => (
              <button
                key={s.id}
                onClick={() => toggleSubject(s.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 h-9 rounded-full text-xs border',
                  filters.subject_ids.includes(s.id)
                    ? 'bg-math-accent text-white border-math-accent'
                    : 'bg-paper text-ink-soft border-line'
                )}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                {s.name}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* 章节 */}
      <section className="bg-card rounded-card shadow-card overflow-hidden">
        <button
          onClick={() => toggle('chapters')}
          className="w-full px-4 h-12 flex items-center justify-between text-sm font-medium text-ink"
        >
          <span>选择章节{filters.chapter_ids.length > 0 && ` (${filters.chapter_ids.length})`}</span>
          <ChevronDown size={16} className={sectionOpen === 'chapters' ? 'rotate-180 transition-transform' : 'transition-transform'} />
        </button>
        {sectionOpen === 'chapters' && (
          <div className="px-4 pb-3 flex flex-wrap gap-2">
            {filteredChapters.map((c) => (
              <button
                key={c.id}
                onClick={() => toggleChapter(c.id)}
                className={cn(
                  'px-3 h-9 rounded-full text-xs border',
                  filters.chapter_ids.includes(c.id)
                    ? 'bg-math-accent text-white border-math-accent'
                    : 'bg-paper text-ink-soft border-line'
                )}
              >
                {c.name}
              </button>
            ))}
            {filteredChapters.length === 0 && (
              <p className="text-xs text-ink-muted py-2">请先选择科目或暂无章节</p>
            )}
          </div>
        )}
      </section>

      {/* 复习状态 */}
      <section className="bg-card rounded-card shadow-card overflow-hidden">
        <button
          onClick={() => toggle('status')}
          className="w-full px-4 h-12 flex items-center justify-between text-sm font-medium text-ink"
        >
          <span>复习状态</span>
          <ChevronDown size={16} className={sectionOpen === 'status' ? 'rotate-180 transition-transform' : 'transition-transform'} />
        </button>
        {sectionOpen === 'status' && (
          <div className="px-4 pb-3 flex gap-2">
            {(['all', 'pending', 'mastered'] as const).map((s) => (
              <button
                key={s}
                onClick={() => onChange({ ...filters, review_status: s })}
                className={cn(
                  'px-3 h-9 rounded-full text-xs border',
                  filters.review_status === s
                    ? 'bg-math-accent text-white border-math-accent'
                    : 'bg-paper text-ink-soft border-line'
                )}
              >
                {s === 'all' ? '全部' : s === 'pending' ? '待复习' : '已掌握'}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* 难度范围 */}
      <section className="bg-card rounded-card shadow-card overflow-hidden">
        <button
          onClick={() => toggle('difficulty')}
          className="w-full px-4 h-12 flex items-center justify-between text-sm font-medium text-ink"
        >
          <span>难度范围：{filters.difficulty_min}-{filters.difficulty_max} 星</span>
          <ChevronDown size={16} className={sectionOpen === 'difficulty' ? 'rotate-180 transition-transform' : 'transition-transform'} />
        </button>
        {sectionOpen === 'difficulty' && (
          <div className="px-4 pb-3 flex items-center gap-3">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((d) => (
                <button
                  key={d}
                  onClick={() => onChange({ ...filters, difficulty_min: d })}
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-xs border',
                    d >= filters.difficulty_min ? 'bg-math-accent text-white border-math-accent' : 'bg-paper text-ink-muted border-line'
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
            <span className="text-ink-muted">至</span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((d) => (
                <button
                  key={d}
                  onClick={() => onChange({ ...filters, difficulty_max: d })}
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-xs border',
                    d <= filters.difficulty_max ? 'bg-math-accent text-white border-math-accent' : 'bg-paper text-ink-muted border-line'
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 导出选项 */}
      <section className="bg-card rounded-card shadow-card p-4 flex flex-col gap-3">
        <h3 className="text-sm font-medium text-ink">导出选项</h3>
        <label className="flex items-center gap-3 tap-area">
          <input
            type="checkbox"
            checked={filters.group_by_chapter}
            onChange={(e) => onChange({ ...filters, group_by_chapter: e.target.checked })}
            className="w-4 h-4 rounded accent-math-accent"
          />
          <span className="text-sm text-ink-soft">按章节分组</span>
        </label>
        <label className="flex items-center gap-3 tap-area">
          <input
            type="checkbox"
            checked={filters.include_analysis}
            onChange={(e) => onChange({ ...filters, include_analysis: e.target.checked })}
            className="w-4 h-4 rounded accent-math-accent"
          />
          <span className="text-sm text-ink-soft">包含解析</span>
        </label>
      </section>
    </div>
  );
}
