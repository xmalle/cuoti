'use client';

import { BookOpen, Clock } from 'lucide-react';

interface StatsBarProps {
  total: number;
  pending: number;
}

export function StatsBar({ total, pending }: StatsBarProps) {
  return (
    <div className="px-4 pt-5 pb-3">
      <h1 className="text-2xl font-bold text-ink tracking-tight">错题本</h1>
      <div className="flex items-center gap-4 mt-3">
        <div className="flex items-center gap-1.5">
          <BookOpen size={16} className="text-ink-muted" />
          <span className="text-sm text-ink-soft">共</span>
          <span className="text-lg font-semibold text-math-accent">{total}</span>
          <span className="text-sm text-ink-soft">题</span>
        </div>
        <div className="w-px h-4 bg-line" />
        <div className="flex items-center gap-1.5">
          <Clock size={16} className="text-ink-muted" />
          <span className="text-sm text-ink-soft">待复习</span>
          <span className="text-lg font-semibold text-major-accent">{pending}</span>
        </div>
      </div>
    </div>
  );
}
