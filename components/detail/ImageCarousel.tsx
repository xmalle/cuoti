'use client';

import { useState } from 'react';
import { ImageViewer } from './ImageViewer';
import { getPublicImageUrl } from '@/lib/supabase/client';
import type { QuestionImage } from '@/types';

interface Props {
  images: QuestionImage[];
  label: string;
  emptyText?: string;
}

export function ImageCarousel({ images, label, emptyText = '暂无图片' }: Props) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const urls = images.map((i) => getPublicImageUrl(i.storage_path));

  return (
    <div>
      <h3 className="text-xs text-ink-soft mb-2">{label}</h3>
      {urls.length === 0 ? (
        <div className="h-32 rounded-card bg-paper flex items-center justify-center text-ink-muted text-sm">
          {emptyText}
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto no-scrollbar carousel-snap -mx-4 px-4">
          {urls.map((url, i) => (
            <button
              key={i}
              onClick={() => setViewerIndex(i)}
              className="w-48 h-36 rounded-card overflow-hidden bg-paper flex-shrink-0"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`${label} ${i + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {viewerIndex !== null && (
        <ImageViewer
          urls={urls}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </div>
  );
}
