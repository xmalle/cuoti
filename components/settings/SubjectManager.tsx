'use client';

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, ChevronRight, Check, X } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils/cn';
import {
  listSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
} from '@/lib/supabase/subjects';
import {
  listChapters,
  createChapter,
  updateChapter,
  deleteChapter,
  reorderChapters,
} from '@/lib/supabase/chapters';
import {
  listKnowledgePoints,
  createKnowledgePoint,
  updateKnowledgePoint,
  deleteKnowledgePoint,
} from '@/lib/supabase/knowledge-points';
import { toast } from '@/store/toast';
import type { Subject, Chapter, KnowledgePoint } from '@/types';

export function SubjectManager() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('#B8472F');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#B8472F');

  const load = () => listSubjects().then(setSubjects).catch(console.error);
  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    try {
      await createSubject(newName.trim(), newColor);
      setAddOpen(false);
      setNewName('');
      load();
      toast.success('科目已添加');
    } catch (e: any) { toast.error(e.message); }
  };

  const startEdit = (s: Subject) => {
    setEditId(s.id);
    setEditName(s.name);
    setEditColor(s.color);
  };

  const handleUpdate = async () => {
    if (!editId || !editName.trim()) return;
    try {
      await updateSubject(editId, { name: editName.trim(), color: editColor });
      setEditId(null);
      load();
      toast.success('已更新');
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteSubject(deleteId);
      setDeleteId(null);
      load();
      toast.success('已删除');
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-ink">科目管理</h3>
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-1 text-xs text-math-accent tap-area"
        >
          <Plus size={14} /> 新增
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {subjects.map((s) => (
          <div key={s.id} className="bg-card rounded-card shadow-card px-4 h-12 flex items-center gap-3">
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
            {editId === s.id ? (
              <div className="flex-1 flex items-center gap-2">
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 h-8 px-2 text-sm bg-paper rounded border border-line"
                />
                <button onClick={handleUpdate} className="tap-area text-major-accent"><Check size={16} /></button>
                <button onClick={() => setEditId(null)} className="tap-area text-ink-muted"><X size={16} /></button>
              </div>
            ) : (
              <>
                <span className="flex-1 text-sm text-ink">{s.name}</span>
                <button onClick={() => startEdit(s)} className="tap-area text-ink-muted"><Pencil size={14} /></button>
                <button onClick={() => setDeleteId(s.id)} className="tap-area text-danger"><Trash2 size={14} /></button>
              </>
            )}
          </div>
        ))}
        {subjects.length === 0 && (
          <p className="text-xs text-ink-muted text-center py-4">暂无科目</p>
        )}
      </div>

      {/* 新增弹窗 */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="新增科目">
        <div className="flex flex-col gap-3">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="科目名称"
            className="w-full h-11 px-3 rounded-card bg-paper border border-line text-sm"
          />
          <div className="flex gap-2">
            {['#B8472F', '#3E7470', '#C2861B', '#5A4A7A', '#4A6A8A'].map((c) => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                className="w-9 h-9 rounded-full border-2"
                style={{ backgroundColor: c, borderColor: newColor === c ? '#2B2A28' : 'transparent' }}
              />
            ))}
          </div>
          <button onClick={handleAdd} className="h-11 rounded-card bg-math-accent text-white text-sm font-medium">
            添加
          </button>
        </div>
      </Modal>

      {/* 删除确认 */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="确认删除">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-soft">删除科目将级联删除其下所有章节、知识点和错题，此操作不可恢复。确定删除吗？</p>
          <div className="flex gap-2">
            <button onClick={() => setDeleteId(null)} className="flex-1 h-11 rounded-card bg-paper text-ink-soft text-sm border border-line">取消</button>
            <button onClick={handleDelete} className="flex-1 h-11 rounded-card bg-danger text-white text-sm font-medium">删除</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
