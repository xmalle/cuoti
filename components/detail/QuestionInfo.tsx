'use client';

import { StarRating } from '@/components/ui/StarRating';
import type { Question } from '@/types';
import { formatDate } from '@/lib/utils/format';

interface Props {
  question: Question;
}

export function QuestionInfo({ question }: Props) {
  const subject = question.subject;
  return (
    <div className="flex flex-col gap-4">
      {/* 错因标签 */}
      {question.error_tags.length > 0 && (
        <section>
          <h3 className="text-xs text-ink-soft mb-2">错因标签</h3>
          <div className="flex flex-wrap gap-2">
            {question.error_tags.map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-1 rounded-full text-xs bg-paper text-ink-soft border border-line"
              >
                {tag}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* 错因描述 */}
      {question.error_description && (
        <section>
          <h3 className="text-xs text-ink-soft mb-2">错因描述</h3>
          <p className="text-sm text-ink leading-relaxed bg-paper p-3 rounded-card">
            {question.error_description}
          </p>
        </section>
      )}

      {/* 解析补充 */}
      {question.analysis_supplement && (
        <section>
          <h3 className="text-xs text-ink-soft mb-2">解析补充</h3>
          <p className="text-sm text-ink leading-relaxed bg-paper p-3 rounded-card">
            {question.analysis_supplement}
          </p>
        </section>
      )}

      {/* 难度 */}
      <section>
        <h3 className="text-xs text-ink-soft mb-2">难度</h3>
        <StarRating value={question.difficulty} readOnly color={subject?.color || '#B8472F'} />
      </section>

      {/* 来源 */}
      {question.source && (
        <section>
          <h3 className="text-xs text-ink-soft mb-2">来源</h3>
          <p className="text-sm text-ink">{question.source}</p>
        </section>
      )}

      {/* 录入时间 */}
      <section>
        <h3 className="text-xs text-ink-soft mb-2">录入时间</h3>
        <p className="text-sm text-ink-muted">{formatDate(question.created_at)}</p>
      </section>
    </div>
  );
}
