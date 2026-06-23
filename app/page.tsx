'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, BookOpenText } from 'lucide-react';
import Link from 'next/link';
import { StatsBar } from '@/components/home/StatsBar';
import { SearchBar } from '@/components/home/SearchBar';
import { FilterChips } from '@/components/home/FilterChips';
import { QuestionCard } from '@/components/home/QuestionCard';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useQuestions } from '@/hooks/useQuestions';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { listSubjects } from '@/lib/supabase/subjects';
import { listChapters } from '@/lib/supabase/chapters';
import { getQuestionStats } from '@/lib/supabase/questions';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import type { Subject, Chapter, FilterState } from '@/types';

export default function HomePage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [stats, setStats] = useState({ total: 0, pending: 0 });
  const [configured] = useState(isSupabaseConfigured());

  const { questions, loading, hasMore, filters, load, loadMore, refresh, initialized } =
    useQuestions();

  const sentinelRef = useInfiniteScroll(loadMore, { hasMore, loading });

  // 加载科目与统计
  useEffect(() => {
    if (!configured) return;
    (async () => {
      try {
        const [subs, st] = await Promise.all([listSubjects(), getQuestionStats()]);
        setSubjects(subs);
        setStats(st);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [configured]);

  // 加载章节（根据当前筛选的科目）
  useEffect(() => {
    if (!configured) return;
    if (!filters.subject_id) {
      setChapters([]);
      return;
    }
    listChapters(filters.subject_id).then(setChapters).catch(console.error);
  }, [configured, filters.subject_id]);

  // 首次加载题目
  useEffect(() => {
    if (configured && !initialized) load();
  }, [configured, initialized, load]);

  const handleFilterChange = useCallback(
    (newFilters: FilterState) => {
      load(newFilters);
    },
    [load]
  );

  const handleSearchChange = useCallback(
    (search: string) => {
      load({ ...filters, search: search || undefined });
    },
    [filters, load]
  );

  if (!configured) {
    return (
      <EmptyState
        icon={<BookOpenText size={48} />}
        title="未配置 Supabase"
        description="请在 .env.local 中填入 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY"
      />
    );
  }

  return (
    <div>
      <StatsBar total={stats.total} pending={stats.pending} />

      <SearchBar value={filters.search || ''} onChange={handleSearchChange} />

      <FilterChips
        filters={filters}
        onChange={handleFilterChange}
        subjects={subjects}
        chapters={chapters}
      />

      <div className="px-4 pt-2 pb-4 flex flex-col gap-3">
        {loading && questions.length === 0 ? (
          <ListSkeleton />
        ) : questions.length === 0 ? (
          <EmptyState
            icon={<BookOpenText size={48} />}
            title="还没有错题"
            description="开始记录你的第一道错题吧"
            action={
              <Link
                href="/new"
                className="inline-flex items-center gap-1 px-4 h-11 rounded-card bg-math-accent text-white text-sm font-medium"
              >
                <Plus size={18} />
                新增错题
              </Link>
            }
          />
        ) : (
          <>
            {questions.map((q) => (
              <QuestionCard key={q.id} question={q} />
            ))}
            <div ref={sentinelRef} className="h-4" />
            {loading && questions.length > 0 && (
              <div className="py-2 text-center text-xs text-ink-muted">加载中...</div>
            )}
            {!hasMore && questions.length > 0 && (
              <div className="py-2 text-center text-xs text-ink-muted">没有更多了</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
