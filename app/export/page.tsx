'use client';

import { useState, useCallback } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { ExportFilters } from '@/components/export/ExportFilters';
import { listQuestionsForExport } from '@/lib/supabase/questions';
import { generatePdf } from '@/lib/pdf/generate-pdf';
import { toast } from '@/store/toast';

type ExportFiltersState = {
  subject_ids: string[];
  chapter_ids: string[];
  review_status: 'all' | 'pending' | 'mastered';
  difficulty_min: number;
  difficulty_max: number;
  group_by_chapter: boolean;
  include_analysis: boolean;
};

const defaultFilters: ExportFiltersState = {
  subject_ids: [],
  chapter_ids: [],
  review_status: 'all',
  difficulty_min: 1,
  difficulty_max: 5,
  group_by_chapter: true,
  include_analysis: false,
};

export default function ExportPage() {
  const [filters, setFilters] = useState<ExportFiltersState>(defaultFilters);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [imageScale, setImageScale] = useState(50);
  const [questionGap, setQuestionGap] = useState(60);

  const handlePreview = useCallback(async () => {
    setPreviewing(true);
    try {
      const questions = await listQuestionsForExport(filters);
      setPreviewCount(questions.length);
    } catch (e: any) {
      toast.error(e.message || '预览失败');
    } finally {
      setPreviewing(false);
    }
  }, [filters]);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      const questions = await listQuestionsForExport(filters);
      if (questions.length === 0) {
        toast.error('没有符合条件的题目');
        setGenerating(false);
        return;
      }
      await generatePdf(questions, {
        groupByChapter: filters.group_by_chapter,
        includeAnalysis: filters.include_analysis,
        imageScale: imageScale / 100,
        questionGap: questionGap,
        onStatus: (msg) => setStatusText(msg),
      });
      toast.success('PDF 已生成并下载');
    } catch (e: any) {
      toast.error(e.message || '生成失败');
    } finally {
      setGenerating(false);
      setStatusText('');
    }
  }, [filters, imageScale, questionGap]);

  return (
    <div className="px-4 pt-5 pb-4">
      <h1 className="text-xl font-bold text-ink mb-4">导出 PDF</h1>

      <ExportFilters filters={filters} onChange={setFilters} />

      {/* 页面布局选项 */}
      <div className="mt-3 bg-card rounded-card shadow-card p-4 flex flex-col gap-5">
        <h3 className="text-sm font-medium text-ink">页面布局</h3>

        <div>
          <div className="flex items-center justify-between text-sm text-ink-soft mb-2">
            <span>题目图片缩放</span>
            <span className="text-math-accent font-medium">{imageScale}%</span>
          </div>
          <input
            type="range"
            min={50}
            max={100}
            step={5}
            value={imageScale}
            onChange={(e) => setImageScale(Number(e.target.value))}
            className="w-full accent-math-accent"
          />
          <div className="flex justify-between text-xs text-ink-muted mt-1">
            <span>小 50%</span>
            <span>大 100%</span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-sm text-ink-soft mb-2">
            <span>题目之间间距</span>
            <span className="text-math-accent font-medium">{questionGap}mm</span>
          </div>
          <input
            type="range"
            min={10}
            max={60}
            step={5}
            value={questionGap}
            onChange={(e) => setQuestionGap(Number(e.target.value))}
            className="w-full accent-math-accent"
          />
          <div className="flex justify-between text-xs text-ink-muted mt-1">
            <span>密 10mm</span>
            <span>疏 60mm</span>
          </div>
        </div>
      </div>

      {/* 预览数量 */}
      <div className="mt-4 bg-card rounded-card shadow-card p-4 flex items-center justify-between">
        <div>
          <span className="text-sm text-ink-soft">符合条件的题目</span>
          {previewCount !== null && (
            <span className="ml-2 text-2xl font-bold text-math-accent">{previewCount}</span>
          )}
        </div>
        <button
          onClick={handlePreview}
          disabled={previewing}
          className="h-9 px-4 rounded-card bg-paper text-ink-soft text-xs border border-line"
        >
          {previewing ? '查询中...' : '预览数量'}
        </button>
      </div>

      {/* 生成按钮 */}
      <button
        onClick={handleGenerate}
        disabled={generating}
        className="mt-4 w-full h-14 rounded-card bg-math-accent text-white text-base font-medium flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {generating ? (
          <>
            <Loader2 size={20} className="animate-spin" />
            {statusText || '生成中...'}
          </>
        ) : (
          <>
            <FileDown size={20} />
            生成 PDF
          </>
        )}
      </button>
    </div>
  );
}
