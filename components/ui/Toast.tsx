'use client';

import { useToastStore } from '@/store/toast';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export function ToastContainer() {
  const { toasts, remove } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-0 left-1/2 -translate-x-1/2 z-[100] w-full max-w-[480px] px-4 pt-3 pointer-events-none">
      <div className="flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-card shadow-card-hover animate-slide-down',
              t.type === 'success' && 'bg-success text-white',
              t.type === 'error' && 'bg-danger text-white',
              t.type === 'info' && 'bg-ink text-white'
            )}
          >
            {t.type === 'success' && <CheckCircle2 size={18} />}
            {t.type === 'error' && <XCircle size={18} />}
            {t.type === 'info' && <Info size={18} />}
            <span className="text-sm flex-1">{t.message}</span>
            <button
              onClick={() => remove(t.id)}
              className="tap-area flex items-center justify-center -mr-2 opacity-80"
              aria-label="关闭"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
