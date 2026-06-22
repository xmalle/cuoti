'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  urls: string[];
  initialIndex: number;
  onClose: () => void;
}

export function ImageViewer({ urls, initialIndex, onClose }: Props) {
  const [index, setIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number; distance: number } | null>(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const goPrev = useCallback(() => {
    setScale(1);
    setIndex((i) => (i > 0 ? i - 1 : urls.length - 1));
  }, [urls.length]);

  const goNext = useCallback(() => {
    setScale(1);
    setIndex((i) => (i < urls.length - 1 ? i + 1 : 0));
  }, [urls.length]);

  // 双指缩放
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchStartRef.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        distance: Math.hypot(dx, dy),
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartRef.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const distance = Math.hypot(dx, dy);
      const ratio = distance / touchStartRef.current.distance;
      setScale((prev) => Math.max(1, Math.min(4, prev * ratio)));
      touchStartRef.current.distance = distance;
    }
  };

  const handleTouchEnd = () => {
    touchStartRef.current = null;
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[95] bg-black/95 flex items-center justify-center animate-fade-in"
      onClick={onClose}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute top-4 right-4 tap-area flex items-center justify-center text-white/80 z-10"
      >
        <X size={24} />
      </button>

      {urls.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            className="absolute left-2 top-1/2 -translate-y-1/2 tap-area flex items-center justify-center text-white/80"
          >
            <ChevronLeft size={28} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 tap-area flex items-center justify-center text-white/80"
          >
            <ChevronRight size={28} />
          </button>
        </>
      )}

      <div
        className="w-full h-full flex items-center justify-center overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={urls[index]}
          alt={`图片 ${index + 1}`}
          className="max-w-full max-h-full object-contain transition-transform"
          style={{ transform: `scale(${scale})` }}
        />
      </div>

      {urls.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/80 text-sm">
          {index + 1} / {urls.length}
        </div>
      )}
    </div>
  );
}
