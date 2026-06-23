'use client';

import { useState } from 'react';
import { ChevronDown, Star, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { Subject, Chapter, FilterState } from '@/types';
import { ERROR_TAGS } from '@/types';

interface FilterChipsProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  subjects: Subject[];
  chapters: Chapter[];
}

type ChipKey = 'subject' | 'chapter' | 'difficulty' | 'status' | 'error_tag';

export function FilterChips({ filters, onChange, subjects, chapters }: FilterChipsProps) {
  const [openKey, setOpenKey] = useState<ChipKey | null>(null);

  const togglePanel = (key: ChipKey) => setOpenKey(openKey === key ? null : key);

  const activeCount =
    (filters.subject_id ? 1 : 0) +
    (filters.chapter_id ? 1 : 0) +
    (filters.difficulty ? 1 : 0) +
    (filters.review_status ? 1 : 0) +
    (filters.error_tag ? 1 : 0);

  const chips: { key: ChipKey; label: string; active: boolean }[] = [
    {
      key: 'subject',
      label: filters.subject_id
        ? subjects.find((s) => s.id === filters.subject_id)?.name || '科目'
        : '科目',
      active: !!filters.subject_id,
    },
    {
      key: 'chapter',
      label: filters.chapter_id
        ? chapters.find((c) => c.id === filters.chapter_id)?.name || '章节'
        : '章节',
      active: !!filters.chapter_id,
    },
    {
      key: 'difficulty',
      label: filters.difficulty ? `${filters.difficulty}星` : '难度',
      active: !!filters.difficulty,
    },
    {
      key: 'status',
      label: filters.review_status === 'pending' ? '待复习' : filters.review_status === 'mastered' ? '已掌握' : '状态',
      active: !!filters.review_status,
    },
    {
      key: 'error_tag',
      label: filters.error_tag || '错因',
      active: !!filters.error_tag,
    },
  ];

  const clearFilter = (key: ChipKey) => {
    const next = { ...filters };
    if (key === 'subject') delete next.subject_id;
    if (key === 'chapter') delete next.chapter_id;
    if (key === 'difficulty') delete next.difficulty;
    if (key === 'status') delete next.review_status;
    if (key === 'error_tag') delete next.error_tag;
    onChange(next);
  };

  const selectAndClose = (key: ChipKey, newFilters: FilterState) => {
    onChange(newFilters);
    setOpenKey(null);
  };

  return (
    <div className="relative z-10">
      {/* 遮罩层：点击关闭下拉 */}
      {openKey && (
        <div
          className="fixed inset-0 z-20"
          onClick={() => setOpenKey(null)}
        />
      )}

      <div className="relative z-30 flex gap-2 overflow-x-auto no-scrollbar px-4 py-2 scroll-snap-x">
        {chips.map((chip) => (
          <button
            key={chip.key}
            onClick={() => togglePanel(chip.key)}
            className={cn(
              'relative z-30 flex items-center gap-1 px-3 h-8 rounded-full text-xs whitespace-nowrap border transition-colors tap-area',
              chip.active
                ? 'bg-math-accent text-white border-math-accent'
                : 'bg-card text-ink-soft border-line'
            )}
          >
            {chip.label}
            {chip.active ? (
              <X
                size={12}
                onClick={(e) => {
                  e.stopPropagation();
                  clearFilter(chip.key);
                }}
              />
            ) : (
              <ChevronDown size={12} />
            )}
          </button>
        ))}
        {activeCount > 0 && (
          <button
            onClick={() => onChange({})}
            className="px-3 h-8 rounded-full text-xs whitespace-nowrap text-ink-muted"
          >
            清除
          </button>
        )}
      </div>

      {/* 下拉面板 */}
      {openKey && (
        <div className="relative z-30 bg-card border-b border-line shadow-card-hover animate-slide-down">
          <div className="p-4 max-h-64 overflow-y-auto">
            {openKey === 'subject' && (
              <ChipGrid
                items={subjects.map((s) => ({ id: s.id, label: s.name, color: s.color }))}
                selectedId={filters.subject_id}
                onSelect={(id) => selectAndClose('subject', { ...filters, subject_id: id, chapter_id: undefined })}
              />
            )}
            {openKey === 'chapter' && (
              <ChipGrid
                items={chapters.map((c) => ({ id: c.id, label: c.name }))}
                selectedId={filters.chapter_id}
                emptyText={filters.subject_id ? '该科目暂无章节' : '请先选择科目'}
                onSelect={(id) => selectAndClose('chapter', { ...filters, chapter_id: id })}
              />
            )}
            {openKey === 'difficulty' && (
              <div className="flex gap-2 flex-wrap">
                {[1, 2, 3, 4, 5].map((d) => (
                  <button
                    key={d}
                    onClick={() => selectAndClose('difficulty', { ...filters, difficulty: d })}
                    className={cn(
                      'flex items-center gap-1 px-3 h-9 rounded-full text-xs border',
                      filters.difficulty === d
                        ? 'bg-math-accent text-white border-math-accent'
                        : 'bg-card text-ink-soft border-line'
                    )}
                  >
                    {d}
                    <Star size={12} fill={filters.difficulty === d ? 'currentColor' : 'none'} />
                  </button>
                ))}
              </div>
            )}
            {openKey === 'status' && (
              <div className="flex gap-2 flex-wrap">
                {[
                  { value: 'pending', label: '待复习' },
                  { value: 'mastered', label: '已掌握' },
                ].map((s) => (
                  <button
                    key={s.value}
                    onClick={() => selectAndClose('status', { ...filters, review_status: s.value as any })}
                    className={cn(
                      'px-3 h-9 rounded-full text-xs border',
                      filters.review_status === s.value
                        ? 'bg-math-accent text-white border-math-accent'
                        : 'bg-card text-ink-soft border-line'
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
            {openKey === 'error_tag' && (
              <div className="flex gap-2 flex-wrap">
                {ERROR_TAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => selectAndClose('error_tag', { ...filters, error_tag: tag })}
                    className={cn(
                      'px-3 h-9 rounded-full text-xs border',
                      filters.error_tag === tag
                        ? 'bg-math-accent text-white border-math-accent'
                        : 'bg-card text-ink-soft border-line'
                    )}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ChipGrid({
  items,
  selectedId,
  onSelect,
  emptyText = '暂无数据',
}: {
  items: { id: string; label: string; color?: string }[];
  selectedId?: string;
  onSelect: (id: string) => void;
  emptyText?: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-ink-muted text-center py-4">{emptyText}</p>;
  }
  return (
    <div className="flex gap-2 flex-wrap">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onSelect(item.id)}
          className={cn(
            'flex items-center gap-1.5 px-3 h-9 rounded-full text-xs border',
            selectedId === item.id
              ? 'bg-math-accent text-white border-math-accent'
              : 'bg-card text-ink-soft border-line'
          )}
        >
          {item.color && (
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: item.color }}
            />
          )}
          {item.label}
        </button>
      ))}
    </div>
  );
}
