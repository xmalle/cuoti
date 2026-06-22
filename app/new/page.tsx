'use client';

import { QuestionForm } from '@/components/new/QuestionForm';

export default function NewQuestionPage() {
  return (
    <div>
      <div className="px-4 pt-5 pb-3">
        <h1 className="text-xl font-bold text-ink">新增错题</h1>
      </div>
      <QuestionForm />
    </div>
  );
}
