'use client';

import { SubjectManager } from '@/components/settings/SubjectManager';
import { ChapterManager } from '@/components/settings/ChapterManager';
import { KnowledgePointManager } from '@/components/settings/KnowledgePointManager';
import { DataStats } from '@/components/settings/DataStats';
import { ClearAllData } from '@/components/settings/ClearAllData';

export default function SettingsPage() {
  return (
    <div className="px-4 pt-5 pb-4">
      <h1 className="text-xl font-bold text-ink mb-4">设置</h1>

      <div className="flex flex-col gap-6">
        <SubjectManager />
        <div className="h-px bg-line" />
        <ChapterManager />
        <div className="h-px bg-line" />
        <KnowledgePointManager />
        <div className="h-px bg-line" />
        <DataStats />
        <div className="h-px bg-line" />
        <ClearAllData />
      </div>
    </div>
  );
}
