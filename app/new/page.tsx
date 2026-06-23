'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { QuestionForm } from '@/components/new/QuestionForm';

export default function NewQuestionPage() {
  const router = useRouter();
  return (
    <div>
      <header className="sticky top-0 z-40 bg-paper/95 backdrop-blur-sm border-b border-line">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            onClick={() => router.back()}
            className="tap-area flex items-center justify-center -ml-2 text-[#5C7385]"
            aria-label="返回"
          >
            <ChevronLeft size={24} />
            <span className="text-sm ml-0.5">返回</span>
          </button>
          <h1 className="text-base font-semibold text-ink">新增错题</h1>
          <div className="min-w-[44px]" />
        </div>
      </header>
      <QuestionForm />
    </div>
  );
}
