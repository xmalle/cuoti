'use client';

import Link from 'next/link';
import { Star, CheckCircle2 } from 'lucide-react';
import type { Question } from '@/types';
import { getPublicImageUrl } from '@/lib/supabase/client';
import { formatRelativeTime } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';

export function QuestionCard({ question }: { question: Question }) {
  const firstImage = question.images?.find((i) => i.type === 'question');
  const thumbUrl = firstImage ? getPublicImageUrl(firstImage.storage_path) : '';
  const subject = question.subject;
  const chapter = question.chapter;
  const kp = question.knowledge_point;
  const mastered = question.review_status === 'mastered';

  return (
    <Link
      href={`/question/${question.id}`}
      className="block bg-card rounded-card shadow-card p-3 flex gap-3 active:scale-[0.99] transition-transform"
    >
      <div className="w-20 h-20 rounded-lg bg-paper flex-shrink-0 overflow-hidden flex items-center justify-center">
        {thumbUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbUrl} alt="题目" className="w-full h-full object-cover" />
        ) : (
          <div className="text-ink-muted text-xs">无图</div>
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-ink-soft">
            {subject && (
              <span
                className="px-1.5 py-0.5 rounded text-[10px] text-white"
                style={{ backgroundColor: subject.color }}
              >
                {subject.name}
              </span>
            )}
            <span className="truncate">{chapter?.name}</span>
            {kp && (
              <>
                <span className="text-ink-muted">·</span>
                <span className="truncate text-ink-muted">{kp.name}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-1 mt-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                size={11}
                style={{ color: subject?.color || '#B8472F' }}
                fill={i < question.difficulty ? subject?.color || '#B8472F' : 'none'}
                strokeWidth={i < question.difficulty ? 0 : 1.5}
              />
            ))}
          </div>

          {question.error_tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {question.error_tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="px-1.5 py-0.5 rounded text-[10px] bg-paper text-ink-soft border border-line"
                >
                  {tag}
                </span>
              ))}
              {question.error_tags.length > 2 && (
                <span className="text-[10px] text-ink-muted">+{question.error_tags.length - 2}</span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] text-ink-muted">{formatRelativeTime(question.created_at)}</span>
          {mastered && (
            <span className="flex items-center gap-0.5 text-[10px] text-major-accent">
              <CheckCircle2 size={11} />
              已掌握
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
