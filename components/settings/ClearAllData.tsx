'use client';

import { useState } from 'react';
import { clearAllData } from '@/lib/supabase/questions';
import { toast } from '@/store/toast';

export function ClearAllData() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await clearAllData();
      toast.success('已清空所有错题');
      setShowConfirm(false);
      // 刷新首页数据
      window.location.href = '/';
    } catch {
      toast.error('清空失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6">
      <h2 className="text-sm font-semibold text-red-600 mb-3">危险操作</h2>
      <button
        onClick={() => setShowConfirm(true)}
        className="w-full py-2.5 rounded-lg border border-red-300 text-red-600 text-sm font-medium active:scale-[0.98] transition-transform"
      >
        清空所有错题
      </button>

      {showConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-8">
          <div className="bg-white rounded-2xl p-5 w-full max-w-xs shadow-lg">
            <p className="text-sm text-ink leading-relaxed">
              此操作将删除所有错题及图片，且无法恢复。确认清空？
            </p>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={loading}
                className="flex-1 py-2 rounded-lg border border-line text-ink-soft text-sm"
              >
                取消
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-medium disabled:opacity-50"
              >
                {loading ? '清空中…' : '确认清空'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
