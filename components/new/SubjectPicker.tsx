'use client';

import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { Subject } from '@/types';

interface SubjectPickerProps {
  subjects: Subject[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onCreate: () => void;
}

export function SubjectPicker({ subjects, selectedId, onSelect, onCreate }: SubjectPickerProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {subjects.map((s) => {
        const active = s.id === selectedId;
        return (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            className={cn(
              'relative h-20 rounded-card border-2 flex flex-col items-center justify-center gap-1 transition-all',
              active ? 'text-white' : 'bg-card border-line text-ink-soft'
            )}
            style={active ? { backgroundColor: s.color, borderColor: s.color } : undefined}
          >
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: active ? '#fff' : s.color }} />
            <span className="text-sm font-medium">{s.name}</span>
          </button>
        );
      })}
      <button
        onClick={onCreate}
        className="h-20 rounded-card border-2 border-dashed border-line flex flex-col items-center justify-center gap-1 text-ink-muted"
      >
        <Plus size={20} />
        <span className="text-xs">新建科目</span>
      </button>
    </div>
  );
}
