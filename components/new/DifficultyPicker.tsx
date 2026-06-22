'use client';

import { StarRating } from '@/components/ui/StarRating';

interface Props {
  value: number;
  onChange: (v: number) => void;
}

export function DifficultyPicker({ value, onChange }: Props) {
  return (
    <div>
      <label className="block text-xs text-ink-soft mb-1.5">难度评级</label>
      <StarRating value={value} onChange={onChange} size={28} />
    </div>
  );
}
