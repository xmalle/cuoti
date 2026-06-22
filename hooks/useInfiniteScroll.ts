'use client';

import { useEffect, useRef, useCallback } from 'react';

export function useInfiniteScroll(
  onLoadMore: () => void,
  options: { hasMore: boolean; loading: boolean; rootMargin?: string }
) {
  const { hasMore, loading, rootMargin = '200px' } = options;
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(loading);
  const hasMoreRef = useRef(hasMore);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);
  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  const handleLoadMore = useCallback(() => {
    if (!loadingRef.current && hasMoreRef.current) {
      onLoadMore();
    }
  }, [onLoadMore]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          handleLoadMore();
        }
      },
      { rootMargin }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [handleLoadMore, rootMargin]);

  return sentinelRef;
}
