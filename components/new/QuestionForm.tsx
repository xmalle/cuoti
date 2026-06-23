'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { SubjectPicker } from '@/components/new/SubjectPicker';
import { ChapterKnowledgePicker } from '@/components/new/ChapterKnowledgePicker';
import { ImageUploader } from '@/components/new/ImageUploader';
import { ErrorTagSelector } from '@/components/new/ErrorTagSelector';
import { DifficultyPicker } from '@/components/new/DifficultyPicker';
import { Modal } from '@/components/ui/Modal';
import { listSubjects, createSubject } from '@/lib/supabase/subjects';
import { createQuestion, updateQuestion } from '@/lib/supabase/questions';
import {
  uploadImages,
  createImageRecords,
  replaceImages,
} from '@/lib/supabase/images';
import { getPublicImageUrl } from '@/lib/supabase/client';
import { toast } from '@/store/toast';
import type { Subject, Question } from '@/types';

interface Props {
  editingQuestion?: Question;
  onSaved?: () => void;
}

export function QuestionForm({ editingQuestion, onSaved }: Props) {
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState(editingQuestion?.subject_id || '');
  const [chapterId, setChapterId] = useState(editingQuestion?.chapter_id || '');
  const [knowledgePointId, setKnowledgePointId] = useState<string | null>(
    editingQuestion?.knowledge_point_id || null
  );
  const [questionFiles, setQuestionFiles] = useState<File[]>([]);
  const [analysisFiles, setAnalysisFiles] = useState<File[]>([]);
  const [errorTags, setErrorTags] = useState<string[]>(editingQuestion?.error_tags || []);
  const [errorDesc, setErrorDesc] = useState(editingQuestion?.error_description || '');
  const [analysisSupplement, setAnalysisSupplement] = useState(
    editingQuestion?.analysis_supplement || ''
  );
  const [difficulty, setDifficulty] = useState(editingQuestion?.difficulty || 3);
  const [source, setSource] = useState(editingQuestion?.source || '');
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [createSubjectOpen, setCreateSubjectOpen] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectColor, setNewSubjectColor] = useState('#B8472F');

  const existingQuestionUrls =
    editingQuestion?.images
      ?.filter((i) => i.type === 'question')
      .map((i) => getPublicImageUrl(i.storage_path)) || [];
  const existingAnalysisUrls =
    editingQuestion?.images
      ?.filter((i) => i.type === 'analysis')
      .map((i) => getPublicImageUrl(i.storage_path)) || [];

  useEffect(() => {
    listSubjects().then(setSubjects).catch(console.error);
  }, []);

  const handleCreateSubject = async () => {
    if (!newSubjectName.trim()) return;
    try {
      const created = await createSubject(newSubjectName.trim(), newSubjectColor);
      setSubjects((prev) => [...prev, created]);
      setSubjectId(created.id);
      setCreateSubjectOpen(false);
      setNewSubjectName('');
      toast.success('科目已创建');
    } catch (e: any) {
      toast.error(e.message || '创建失败');
    }
  };

  const validate = (): string | null => {
    if (!subjectId) return '请选择科目';
    if (!chapterId) return '请选择章节';
    if (!editingQuestion && questionFiles.length === 0) return '请至少上传一张题目图片';
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    setSaving(true);
    setProgress(0);
    try {
      const formData = {
        subject_id: subjectId,
        chapter_id: chapterId,
        knowledge_point_id: knowledgePointId,
        difficulty,
        error_tags: errorTags,
        error_description: errorDesc,
        analysis_supplement: analysisSupplement,
        source,
      };

      let questionId: string;
      if (editingQuestion) {
        await updateQuestion(editingQuestion.id, formData);
        questionId = editingQuestion.id;
        setProgressText('更新图片...');
        setProgress(30);
        if (questionFiles.length > 0) {
          await replaceImages(questionId, 'question', questionFiles, (d, t) => {
            setProgress(30 + Math.round((d / t) * 35));
          });
        }
        if (analysisFiles.length > 0) {
          await replaceImages(questionId, 'analysis', analysisFiles, (d, t) => {
            setProgress(65 + Math.round((d / t) * 35));
          });
        }
      } else {
        const created = await createQuestion(formData);
        questionId = created.id;
        setProgressText('上传题目图片...');
        const qPaths = await uploadImages(questionId, 'question', questionFiles, (d, t) => {
          setProgress(Math.round((d / t) * 50));
        });
        await createImageRecords(questionId, 'question', qPaths);
        if (analysisFiles.length > 0) {
          setProgressText('上传解析图片...');
          const aPaths = await uploadImages(questionId, 'analysis', analysisFiles, (d, t) => {
            setProgress(50 + Math.round((d / t) * 50));
          });
          await createImageRecords(questionId, 'analysis', aPaths);
        }
      }
      setProgress(100);
      toast.success(editingQuestion ? '已更新' : '已保存');
      if (onSaved) {
        onSaved();
      } else {
        setTimeout(() => router.push('/'), 500);
      }
    } catch (e: any) {
      toast.error(e.message || '保存失败');
      setSaving(false);
      setProgress(0);
    }
  };

  return (
    <div className="px-4 pt-3 pb-28 flex flex-col gap-5">
      <section>
        <label className="block text-xs text-ink-soft mb-1.5">
          科目 <span className="text-danger">*</span>
        </label>
        <SubjectPicker
          subjects={subjects}
          selectedId={subjectId}
          onSelect={setSubjectId}
          onCreate={() => setCreateSubjectOpen(true)}
        />
      </section>

      <section>
        <ChapterKnowledgePicker
          subjectId={subjectId}
          chapterId={chapterId}
          knowledgePointId={knowledgePointId}
          onChapterChange={setChapterId}
          onKnowledgePointChange={setKnowledgePointId}
        />
      </section>

      <section>
        <ImageUploader
          label="题目图片"
          required
          max={5}
          files={questionFiles}
          onChange={setQuestionFiles}
          existingUrls={existingQuestionUrls}
        />
      </section>

      <section>
        <ImageUploader
          label="解析图片"
          max={5}
          files={analysisFiles}
          onChange={setAnalysisFiles}
          existingUrls={existingAnalysisUrls}
        />
      </section>

      <section>
        <ErrorTagSelector selected={errorTags} onChange={setErrorTags} />
      </section>

      <section>
        <label className="block text-xs text-ink-soft mb-1.5">错因描述</label>
        <textarea
          value={errorDesc}
          onChange={(e) => setErrorDesc(e.target.value)}
          placeholder="可选：记录错因细节"
          rows={2}
          className="w-full p-3 rounded-card bg-card border border-line text-sm resize-none"
        />
      </section>

      <section>
        <label className="block text-xs text-ink-soft mb-1.5">解析补充</label>
        <textarea
          value={analysisSupplement}
          onChange={(e) => setAnalysisSupplement(e.target.value)}
          placeholder="可选：补充解析要点"
          rows={2}
          className="w-full p-3 rounded-card bg-card border border-line text-sm resize-none"
        />
      </section>

      <section>
        <DifficultyPicker value={difficulty} onChange={setDifficulty} />
      </section>

      <section>
        <label className="block text-xs text-ink-soft mb-1.5">题目来源</label>
        <input
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="可选：如 2023真题T15"
          className="w-full h-11 px-3 rounded-card bg-card border border-line text-sm"
        />
      </section>

      <div
        className="fixed bottom-0 left-0 right-0 bg-[#EFEEE7] border-t border-[#DEDACD] px-4 pt-3 z-50"
        style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
      >
        {saving && progress > 0 && (
          <div className="mb-2">
            <div className="flex justify-between text-[10px] text-ink-soft mb-1">
              <span>{progressText || '保存中...'}</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1 bg-paper rounded-full overflow-hidden">
              <div
                className="h-full bg-math-accent transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-14 rounded-card bg-math-accent text-white text-base font-medium flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {saving && <Loader2 size={16} className="animate-spin" />}
          {saving ? '保存中...' : editingQuestion ? '更新错题' : '保存错题'}
        </button>
      </div>

      <Modal open={createSubjectOpen} onClose={() => setCreateSubjectOpen(false)} title="新建科目">
        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-xs text-ink-soft mb-1">科目名称</label>
            <input
              value={newSubjectName}
              onChange={(e) => setNewSubjectName(e.target.value)}
              placeholder="如：数学一"
              className="w-full h-11 px-3 rounded-card bg-paper border border-line text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-ink-soft mb-1">颜色</label>
            <div className="flex gap-2">
              {['#B8472F', '#3E7470', '#C2861B', '#5A4A7A', '#4A6A8A'].map((c) => (
                <button
                  key={c}
                  onClick={() => setNewSubjectColor(c)}
                  className="w-9 h-9 rounded-full border-2"
                  style={{
                    backgroundColor: c,
                    borderColor: newSubjectColor === c ? '#2B2A28' : 'transparent',
                  }}
                />
              ))}
            </div>
          </div>
          <button
            onClick={handleCreateSubject}
            className="h-11 rounded-card bg-math-accent text-white text-sm font-medium"
          >
            创建
          </button>
        </div>
      </Modal>
    </div>
  );
}
