'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  const [local, setLocal] = useState(value);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  const handleChange = (v: string) => {
    setLocal(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onChange(v);
    }, 400);
  };

  const handleClear = () => {
    setLocal('');
    onChange('');
  };

  return (
    <div className="px-4 pt-2">
      <div
        className="flex items-center gap-2 h-10 px-3 rounded-[12px] border"
        style={{ background: '#FBFAF6', border: '1px solid #DEDACD' }}
      >
        <Search size={16} className="text-ink-muted flex-shrink-0" />
        <input
          type="text"
          value={local}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="搜索来源、错因描述、解析补充…"
          className="flex-1 text-sm bg-transparent outline-none text-ink placeholder:text-ink-muted"
        />
        {local && (
          <button
            onClick={handleClear}
            className="tap-area flex items-center justify-center text-ink-muted"
            aria-label="清空搜索"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
