import { create } from 'zustand';
import type { ToastMessage } from '@/types';

interface ToastStore {
  toasts: ToastMessage[];
  show: (type: ToastMessage['type'], message: string) => void;
  remove: (id: string) => void;
}

let toastId = 0;

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  show: (type, message) => {
    const id = `toast-${++toastId}`;
    set((state) => ({ toasts: [...state.toasts, { id, type, message }] }));
    // 3 秒后自动移除
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 3000);
  },
  remove: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

// 便捷方法
export const toast = {
  success: (message: string) => useToastStore.getState().show('success', message),
  error: (message: string) => useToastStore.getState().show('error', message),
  info: (message: string) => useToastStore.getState().show('info', message),
};
