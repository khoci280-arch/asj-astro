/**
 * Toast.tsx — Notification system (Preact)
 * Migrated from legacy showToast() pattern
 * 
 * Usage: <Toast /> in BaseLayout, call showToast() from anywhere
 */
import { useStore } from '@nanostores/preact';
import { atom } from 'nanostores';
import { useEffect, useState } from 'preact/hooks';

export interface ToastMessage {
  id: number;
  text: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

/** Toast state atom */
export const toasts = atom<ToastMessage[]>([]);
let toastId = 0;

/** Show a toast notification */
export function showToast(text: string, type: ToastMessage['type'] = 'info') {
  const id = ++toastId;
  toasts.set([...toasts.get(), { id, text, type }]);
  // Auto-dismiss after 4s
  setTimeout(() => {
    toasts.set(toasts.get().filter(t => t.id !== id));
  }, 4000);
}

const colors = {
  success: 'bg-emerald-600 border-emerald-400',
  error: 'bg-red-600 border-red-400',
  info: 'bg-sky-600 border-sky-400',
  warning: 'bg-amber-600 border-amber-400',
};

const icons = {
  success: 'fa-check-circle',
  error: 'fa-exclamation-circle',
  info: 'fa-info-circle',
  warning: 'fa-exclamation-triangle',
};

export default function Toast() {
  const $toasts = useStore(toasts);
  
  if ($toasts.length === 0) return null;
  
  return (
    <div class="fixed top-4 right-4 z-[999] flex flex-col gap-2 max-w-sm">
      {$toasts.map(toast => (
        <div
          key={toast.id}
          class={`${colors[toast.type]} border-l-4 px-4 py-3 rounded-lg shadow-lg animate-slide-in flex items-center gap-3 text-white text-sm font-bold`}
        >
          <i class={`fas ${icons[toast.type]}`}></i>
          <span>{toast.text}</span>
        </div>
      ))}
    </div>
  );
}
