'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, Plus, Check } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { Chapter, KnowledgePoint } from '@/types';
import { listChapters } from '@/lib/supabase/chapters';
import { listKnowledgePoints } from '@/lib/supabase/knowledge-points';
import { createChapter } from '@/lib/supabase/chapters';
import { createKnowledgePoint } from '@/lib/supabase/knowledge-points';

interface Props {
  subjectId?: string;
  chapterId?: string;
  knowledgePointId?: string | null;
  onChapterChange: (id: string) => void;
  onKnowledgePointChange: (id: string | null) => void;
}

export function ChapterKnowledgePicker({
  subjectId,
  chapterId,
  knowledgePointId,
  onChapterChange,
  onKnowledgePointChange,
}: Props) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [knowledgePoints, setKnowledgePoints] = useState<KnowledgePoint[]>([]);
  const [chapterOpen, setChapterOpen] = useState(false);
  const [kpOpen, setKpOpen] = useState(false);
  const [newChapterName, setNewChapterName] = useState('');
  const [newKpName, setNewKpName] = useState('');

  useEffect(() => {
    if (!subjectId) {
      setChapters([]);
      return;
    }
    listChapters(subjectId).then(setChapters).catch(console.error);
  }, [subjectId]);

  useEffect(() => {
    if (!chapterId) {
      setKnowledgePoints([]);
      return;
    }
    listKnowledgePoints(chapterId).then(setKnowledgePoints).catch(console.error);
  }, [chapterId]);

  const handleCreateChapter = async () => {
    if (!subjectId || !newChapterName.trim()) return;
    try {
      const created = await createChapter(subjectId, newChapterName.trim());
      setChapters((prev) => [...prev, created]);
      onChapterChange(created.id);
      setNewChapterName('');
      setChapterOpen(false);
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleCreateKp = async () => {
    if (!chapterId || !newKpName.trim()) return;
    try {
      const created = await createKnowledgePoint(chapterId, newKpName.trim());
      setKnowledgePoints((prev) => [...prev, created]);
      onKnowledgePointChange(created.id);
      setNewKpName('');
      setKpOpen(false);
    } catch (e: any) {
      console.error(e);
    }
  };

  const selectedChapter = chapters.find((c) => c.id === chapterId);
  const selectedKp = knowledgePoints.find((k) => k.id === knowledgePointId);

  return (
    <div className="flex flex-col gap-3">
      {/* 章节选择 */}
      <div>
        <label className="block text-xs text-ink-soft mb-1.5">
          章节 <span className="text-danger">*</span>
        </label>
        <button
          onClick={() => setChapterOpen(!chapterOpen)}
          disabled={!subjectId}
          className={cn(
            'w-full h-11 px-3 rounded-card border flex items-center justify-between text-sm',
            !subjectId
              ? 'bg-paper text-ink-muted border-line cursor-not-allowed'
              : 'bg-card border-line text-ink'
          )}
        >
          <span className={selectedChapter ? '' : 'text-ink-muted'}>
            {selectedChapter ? selectedChapter.name : subjectId ? '选择章节' : '请先选择科目'}
          </span>
          <ChevronDown size={16} className={chapterOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
        </button>
        {chapterOpen && subjectId && (
          <div className="mt-1 bg-card border border-line rounded-card shadow-card-hover overflow-hidden animate-slide-down">
            {chapters.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  onChapterChange(c.id);
                  onKnowledgePointChange(null);
                  setChapterOpen(false);
                }}
                className="w-full px-3 h-11 flex items-center justify-between text-sm hover:bg-paper"
              >
                {c.name}
                {c.id === chapterId && <Check size={16} className="text-math-accent" />}
              </button>
            ))}
            <div className="border-t border-line p-2 flex gap-2">
              <input
                value={newChapterName}
                onChange={(e) => setNewChapterName(e.target.value)}
                placeholder="新建章节名称"
                className="flex-1 h-9 px-2 text-sm bg-paper rounded border border-line"
              />
              <button
                onClick={handleCreateChapter}
                className="h-9 px-3 rounded bg-math-accent text-white text-xs flex items-center gap-1"
              >
                <Plus size={14} />
                添加
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 知识点选择 */}
      <div>
        <label className="block text-xs text-ink-soft mb-1.5">知识点</label>
        <button
          onClick={() => setKpOpen(!kpOpen)}
          disabled={!chapterId}
          className={cn(
            'w-full h-11 px-3 rounded-card border flex items-center justify-between text-sm',
            !chapterId
              ? 'bg-paper text-ink-muted border-line cursor-not-allowed'
              : 'bg-card border-line text-ink'
          )}
        >
          <span className={selectedKp ? '' : 'text-ink-muted'}>
            {selectedKp ? selectedKp.name : chapterId ? '选择知识点（可选）' : '请先选择章节'}
          </span>
          <ChevronDown size={16} className={kpOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
        </button>
        {kpOpen && chapterId && (
          <div className="mt-1 bg-card border border-line rounded-card shadow-card-hover overflow-hidden animate-slide-down">
            <button
              onClick={() => {
                onKnowledgePointChange(null);
                setKpOpen(false);
              }}
              className="w-full px-3 h-11 flex items-center justify-between text-sm text-ink-muted hover:bg-paper"
            >
              不选择
              {knowledgePointId === null && <Check size={16} className="text-math-accent" />}
            </button>
            {knowledgePoints.map((k) => (
              <button
                key={k.id}
                onClick={() => {
                  onKnowledgePointChange(k.id);
                  setKpOpen(false);
                }}
                className="w-full px-3 h-11 flex items-center justify-between text-sm hover:bg-paper"
              >
                {k.name}
                {k.id === knowledgePointId && <Check size={16} className="text-math-accent" />}
              </button>
            ))}
            <div className="border-t border-line p-2 flex gap-2">
              <input
                value={newKpName}
                onChange={(e) => setNewKpName(e.target.value)}
                placeholder="新建知识点名称"
                className="flex-1 h-9 px-2 text-sm bg-paper rounded border border-line"
              />
              <button
                onClick={handleCreateKp}
                className="h-9 px-3 rounded bg-math-accent text-white text-xs flex items-center gap-1"
              >
                <Plus size={14} />
                添加
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
