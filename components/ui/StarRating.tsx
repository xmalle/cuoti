'use client';

import { Star } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface StarRatingProps {
  value: number;
  max?: number;
  onChange?: (value: number) => void;
  size?: number;
  color?: string;
  readOnly?: boolean;
}

export function StarRating({
  value,
  max = 5,
  onChange,
  size = 20,
  color = '#B8472F',
  readOnly = false,
}: StarRatingProps) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: max }).map((_, i) => {
        const filled = i < value;
        return (
          <button
            key={i}
            type="button"
            disabled={readOnly}
            onClick={() => !readOnly && onChange?.(i + 1)}
            className={cn(
              'tap-area flex items-center justify-center',
              !readOnly && 'cursor-pointer'
            )}
            aria-label={`${i + 1}星`}
          >
            <Star
              size={size}
              style={{ color }}
              fill={filled ? color : 'none'}
              strokeWidth={filled ? 0 : 1.5}
            />
          </button>
        );
      })}
    </div>
  );
}
