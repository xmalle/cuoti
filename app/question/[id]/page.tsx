'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Pencil, Trash2, CheckCircle2, Clock } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { ImageCarousel } from '@/components/detail/ImageCarousel';
import { QuestionInfo } from '@/components/detail/QuestionInfo';
import { QuestionForm } from '@/components/new/QuestionForm';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { getQuestion, toggleReviewStatus, deleteQuestion } from '@/lib/supabase/questions';
import { toast } from '@/store/toast';
import { cn } from '@/lib/utils/cn';
import type { Question } from '@/types';

export default function QuestionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getQuestion(id);
      setQuestion(data);
    } catch (e: any) {
      toast.error(e.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggleStatus = async () => {
    if (!question) return;
    const next = question.review_status === 'pending' ? 'mastered' : 'pending';
    try {
      await toggleReviewStatus(question.id, next);
      setQuestion({ ...question, review_status: next });
      toast.success(next === 'mastered' ? '已标记为已掌握' : '已标记为待复习');
    } catch (e: any) {
      toast.error(e.message || '操作失败');
    }
  };

  const handleDelete = async () => {
    if (!question) return;
    try {
      await deleteQuestion(question.id);
      toast.success('已删除');
      router.push('/');
    } catch (e: any) {
      toast.error(e.message || '删除失败');
    }
  };

  if (loading) {
    return (
      <div>
        <PageHeader title="错题详情" />
        <div className="p-4 flex flex-col gap-4">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <div>
        <PageHeader title="错题详情" />
        <div className="p-8 text-center text-ink-muted text-sm">未找到该错题</div>
      </div>
    );
  }

  if (editing) {
    return (
      <div>
        <PageHeader
          title="编辑错题"
          onBack={() => {
            setEditing(false);
            load();
          }}
        />
        <QuestionForm
          editingQuestion={question}
          onSaved={() => {
            setEditing(false);
            load();
          }}
        />
      </div>
    );
  }

  const subject = question.subject;
  const chapter = question.chapter;
  const kp = question.knowledge_point;
  const questionImages = question.images?.filter((i) => i.type === 'question') || [];
  const analysisImages = question.images?.filter((i) => i.type === 'analysis') || [];
  const mastered = question.review_status === 'mastered';

  return (
    <div className="pb-24">
      <PageHeader
        title="错题详情"
        right={
          <div className="flex items-center gap-1">
            <button
              onClick={() => setEditing(true)}
              className="tap-area flex items-center justify-center text-ink-soft"
              aria-label="编辑"
            >
              <Pencil size={18} />
            </button>
            <button
              onClick={() => setDeleteOpen(true)}
              className="tap-area flex items-center justify-center text-danger"
              aria-label="删除"
            >
              <Trash2 size={18} />
            </button>
          </div>
        }
      />

      <div className="px-4 pt-4 flex flex-col gap-5">
        {/* 面包屑 */}
        <div className="flex items-center gap-1.5 text-xs text-ink-soft flex-wrap">
          {subject && (
            <span
              className="px-1.5 py-0.5 rounded text-white"
              style={{ backgroundColor: subject.color }}
            >
              {subject.name}
            </span>
          )}
          {chapter && (
            <>
              <span className="text-ink-muted">/</span>
              <span>{chapter.name}</span>
            </>
          )}
          {kp && (
            <>
              <span className="text-ink-muted">/</span>
              <span className="text-ink-muted">{kp.name}</span>
            </>
          )}
        </div>

        {/* 题目图片 */}
        <ImageCarousel images={questionImages} label="题目" emptyText="无题目图片" />

        {/* 解析图片 */}
        <ImageCarousel images={analysisImages} label="解析" emptyText="无解析图片" />

        {/* 信息 */}
        <QuestionInfo question={question} />
      </div>

      {/* 底部状态切换按钮 */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-card/95 backdrop-blur-sm border-t border-line p-3 z-40">
        <button
          onClick={handleToggleStatus}
          className={cn(
            'w-full h-12 rounded-card text-white text-sm font-medium flex items-center justify-center gap-2',
            mastered ? 'bg-major-accent' : 'bg-math-accent'
          )}
        >
          {mastered ? (
            <>
              <CheckCircle2 size={18} />
              已掌握 · 点击标记为待复习
            </>
          ) : (
            <>
              <Clock size={18} />
              待复习 · 点击标记为已掌握
            </>
          )}
        </button>
      </div>

      {/* 删除确认 */}
      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="确认删除">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-soft">
            删除后无法恢复，且会级联删除该错题的所有图片。确定删除这道错题吗？
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setDeleteOpen(false)}
              className="flex-1 h-11 rounded-card bg-paper text-ink-soft text-sm border border-line"
            >
              取消
            </button>
            <button
              onClick={handleDelete}
              className="flex-1 h-11 rounded-card bg-danger text-white text-sm font-medium"
            >
              删除
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
