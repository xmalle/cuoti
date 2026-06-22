'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface PageHeaderProps {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, onBack, right, className }: PageHeaderProps) {
  const router = useRouter();
  return (
    <header
      className={cn(
        'sticky top-0 z-40 bg-paper/95 backdrop-blur-sm border-b border-line',
        className
      )}
    >
      <div className="flex items-center justify-between px-4 h-14">
        <button
          onClick={() => (onBack ? onBack() : router.back())}
          className="tap-area flex items-center justify-center -ml-2 text-ink"
          aria-label="返回"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-base font-semibold text-ink">{title}</h1>
        <div className="min-w-[44px] flex justify-end">{right}</div>
      </div>
    </header>
  );
}
