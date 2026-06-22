'use client';

import { useState, useCallback } from 'react';
import { listQuestions } from '@/lib/supabase/questions';
import type { Question, FilterState } from '@/types';

export function useQuestions(initialFilters: FilterState = {}) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [initialized, setInitialized] = useState(false);

  const load = useCallback(async (newFilters?: FilterState) => {
    setLoading(true);
    setError(null);
    try {
      const f = newFilters || filters;
      const res = await listQuestions(f);
      setQuestions(res.data);
      setHasMore(res.hasMore);
      setCursor(res.nextCursor);
      if (newFilters) setFilters(newFilters);
    } catch (e: any) {
      setError(e.message || '加载失败');
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, [filters]);

  const loadMore = useCallback(async () => {
    if (!cursor || loading) return;
    setLoading(true);
    try {
      const res = await listQuestions(filters, cursor);
      setQuestions((prev) => [...prev, ...res.data]);
      setHasMore(res.hasMore);
      setCursor(res.nextCursor);
    } catch (e: any) {
      setError(e.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [cursor, loading, filters]);

  const refresh = useCallback(() => {
    setCursor(null);
    setHasMore(true);
    return load();
  }, [load]);

  return {
    questions,
    loading,
    hasMore,
    error,
    initialized,
    filters,
    load,
    loadMore,
    refresh,
    setQuestions,
  };
}
