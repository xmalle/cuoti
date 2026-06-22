'use client';

import { cn } from '@/lib/utils/cn';
import { ERROR_TAGS } from '@/types';

interface Props {
  selected: string[];
  onChange: (tags: string[]) => void;
}

export function ErrorTagSelector({ selected, onChange }: Props) {
  const toggle = (tag: string) => {
    if (selected.includes(tag)) {
      onChange(selected.filter((t) => t !== tag));
    } else {
      onChange([...selected, tag]);
    }
  };

  return (
    <div>
      <label className="block text-xs text-ink-soft mb-1.5">错因标签</label>
      <div className="flex flex-wrap gap-2">
        {ERROR_TAGS.map((tag) => {
          const active = selected.includes(tag);
          return (
            <button
              key={tag}
              onClick={() => toggle(tag)}
              className={cn(
                'px-3 h-9 rounded-full text-xs border transition-colors',
                active
                  ? 'bg-math-accent text-white border-math-accent'
                  : 'bg-card text-ink-soft border-line'
              )}
            >
              {tag}
            </button>
          );
        })}
      </div>
    </div>
  );
}
