'use client';

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils/cn';
import { listSubjects } from '@/lib/supabase/subjects';
import { listChapters } from '@/lib/supabase/chapters';
import {
  listKnowledgePoints,
  createKnowledgePoint,
  updateKnowledgePoint,
  deleteKnowledgePoint,
} from '@/lib/supabase/knowledge-points';
import { toast } from '@/store/toast';
import type { Subject, Chapter, KnowledgePoint } from '@/types';

export function KnowledgePointManager() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedChapterId, setSelectedChapterId] = useState('');
  const [knowledgePoints, setKnowledgePoints] = useState<KnowledgePoint[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => { listSubjects().then(setSubjects).catch(console.error); }, []);

  useEffect(() => {
    if (!selectedSubjectId) { setChapters([]); setSelectedChapterId(''); return; }
    listChapters(selectedSubjectId).then(setChapters).catch(console.error);
  }, [selectedSubjectId]);

  useEffect(() => {
    if (!selectedChapterId) { setKnowledgePoints([]); return; }
    listKnowledgePoints(selectedChapterId).then(setKnowledgePoints).catch(console.error);
  }, [selectedChapterId]);

  const handleAdd = async () => {
    if (!selectedChapterId || !newName.trim()) return;
    try {
      await createKnowledgePoint(selectedChapterId, newName.trim());
      setAddOpen(false);
      setNewName('');
      listKnowledgePoints(selectedChapterId).then(setKnowledgePoints);
      toast.success('知识点已添加');
    } catch (e: any) { toast.error(e.message); }
  };

  const handleUpdate = async () => {
    if (!editId || !editName.trim()) return;
    try {
      await updateKnowledgePoint(editId, editName.trim());
      setEditId(null);
      if (selectedChapterId) listKnowledgePoints(selectedChapterId).then(setKnowledgePoints);
      toast.success('已更新');
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteKnowledgePoint(deleteId);
      setDeleteId(null);
      if (selectedChapterId) listKnowledgePoints(selectedChapterId).then(setKnowledgePoints);
      toast.success('已删除');
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-ink">知识点管理</h3>
        {selectedChapterId && (
          <button onClick={() => setAddOpen(true)} className="flex items-center gap-1 text-xs text-math-accent tap-area">
            <Plus size={14} /> 新增
          </button>
        )}
      </div>

      {/* 科目选择 */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-2">
        {subjects.map((s) => (
          <button
            key={s.id}
            onClick={() => { setSelectedSubjectId(s.id); setSelectedChapterId(''); }}
            className={cn(
              'px-3 h-8 rounded-full text-xs whitespace-nowrap border flex items-center gap-1.5',
              selectedSubjectId === s.id ? 'bg-math-accent text-white border-math-accent' : 'bg-card text-ink-soft border-line'
            )}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
            {s.name}
          </button>
        ))}
      </div>

      {/* 章节选择 */}
      {selectedSubjectId && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-3">
          {chapters.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedChapterId(c.id)}
              className={cn(
                'px-3 h-8 rounded-full text-xs whitespace-nowrap border',
                selectedChapterId === c.id ? 'bg-major-accent text-white border-major-accent' : 'bg-card text-ink-soft border-line'
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {!selectedChapterId ? (
        <p className="text-xs text-ink-muted text-center py-4">请先选择科目和章节</p>
      ) : (
        <div className="flex flex-col gap-2">
          {knowledgePoints.map((kp) => (
            <div key={kp.id} className="bg-card rounded-card shadow-card px-4 h-12 flex items-center gap-3">
              {editId === kp.id ? (
                <div className="flex-1 flex items-center gap-2">
                  <input value={editName} onChange={(e) => setEditName(e.target.value)} className="flex-1 h-8 px-2 text-sm bg-paper rounded border border-line" />
                  <button onClick={handleUpdate} className="tap-area text-major-accent"><Check size={16} /></button>
                  <button onClick={() => setEditId(null)} className="tap-area text-ink-muted"><X size={16} /></button>
                </div>
              ) : (
                <>
                  <span className="flex-1 text-sm text-ink">{kp.name}</span>
                  <button onClick={() => { setEditId(kp.id); setEditName(kp.name); }} className="tap-area text-ink-muted"><Pencil size={14} /></button>
                  <button onClick={() => setDeleteId(kp.id)} className="tap-area text-danger"><Trash2 size={14} /></button>
                </>
              )}
            </div>
          ))}
          {knowledgePoints.length === 0 && <p className="text-xs text-ink-muted text-center py-4">暂无知识点</p>}
        </div>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="新增知识点">
        <div className="flex flex-col gap-3">
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="知识点名称" className="w-full h-11 px-3 rounded-card bg-paper border border-line text-sm" />
          <button onClick={handleAdd} className="h-11 rounded-card bg-math-accent text-white text-sm font-medium">添加</button>
        </div>
      </Modal>

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="确认删除">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-soft">删除知识点后，关联的错题将不再显示该知识点。确定删除吗？</p>
          <div className="flex gap-2">
            <button onClick={() => setDeleteId(null)} className="flex-1 h-11 rounded-card bg-paper text-ink-soft text-sm border border-line">取消</button>
            <button onClick={handleDelete} className="flex-1 h-11 rounded-card bg-danger text-white text-sm font-medium">删除</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
