'use client';

import { useState, useEffect } from 'react';
import { getSubjectStats, getErrorTagStats } from '@/lib/supabase/stats';
import { listSubjects } from '@/lib/supabase/subjects';
import type { SubjectStats, ErrorTagStats } from '@/types';

export function DataStats() {
  const [subjectStats, setSubjectStats] = useState<SubjectStats[]>([]);
  const [errorTagStats, setErrorTagStats] = useState<ErrorTagStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const subjects = await listSubjects();
        const [sStats, eStats] = await Promise.all([
          getSubjectStats(subjects),
          getErrorTagStats(),
        ]);
        setSubjectStats(sStats);
        setErrorTagStats(eStats);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div>
        <h3 className="text-sm font-semibold text-ink mb-3">数据统计</h3>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="skeleton h-16 rounded-card" />
          ))}
        </div>
      </div>
    );
  }

  const maxTotal = Math.max(...subjectStats.map((s) => s.total), 1);
  const maxTagCount = Math.max(...errorTagStats.map((e) => e.count), 1);

  return (
    <div>
      <h3 className="text-sm font-semibold text-ink mb-3">数据统计</h3>

      {/* 科目统计 */}
      <div className="flex flex-col gap-2 mb-6">
        {subjectStats.map((s) => (
          <div key={s.subject.id} className="bg-card rounded-card shadow-card p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.subject.color }} />
                <span className="text-sm font-medium text-ink">{s.subject.name}</span>
              </div>
              <span className="text-sm text-ink-soft">{s.total} 题</span>
            </div>
            <div className="h-2 bg-paper rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(s.total / maxTotal) * 100}%`,
                  backgroundColor: s.subject.color,
                }}
              />
            </div>
            <div className="flex gap-4 mt-1.5">
              <span className="text-[10px] text-major-accent">待复习 {s.pending}</span>
              <span className="text-[10px] text-ink-muted">已掌握 {s.mastered}</span>
            </div>
          </div>
        ))}
        {subjectStats.length === 0 && (
          <p className="text-xs text-ink-muted text-center py-4">暂无数据</p>
        )}
      </div>

      {/* 错因分布 */}
      <h4 className="text-xs font-medium text-ink-soft mb-2">错因分布</h4>
      <div className="flex flex-col gap-2">
        {errorTagStats.map((e) => (
          <div key={e.tag} className="flex items-center gap-3">
            <span className="text-xs text-ink-soft w-16 text-right">{e.tag}</span>
            <div className="flex-1 h-2 bg-paper rounded-full overflow-hidden">
              <div
                className="h-full bg-math-accent rounded-full"
                style={{ width: `${(e.count / maxTagCount) * 100}%` }}
              />
            </div>
            <span className="text-xs text-ink-muted w-8">{e.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
