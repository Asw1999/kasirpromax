import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppSettings } from '@/types';

export type ViewId = 'pos' | 'inventory' | 'customers' | 'history' | 'reports' | 'settings';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface AppState {
  view: ViewId;
  darkMode: boolean;
  toasts: Toast[];
  settings: Partial<AppSettings>;
  syncStatus: 'idle' | 'syncing' | 'error';
  lastSyncedAt?: number;

  setView: (v: ViewId) => void;
  toggleDark: () => void;
  toast: (msg: string, type?: ToastType) => void;
  dismissToast: (id: string) => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  setSyncStatus: (status: AppState['syncStatus']) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      view: 'pos',
      darkMode: false,
      toasts: [],
      settings: {},
      syncStatus: 'idle',

      setView: (view) => set({ view }),

      toggleDark: () => set(s => ({ darkMode: !s.darkMode })),

      toast: (message, type = 'success') => {
        const id = crypto.randomUUID();
        set(s => ({ toasts: [...s.toasts, { id, message, type }] }));
        setTimeout(() => get().dismissToast(id), 3000);
      },

      dismissToast: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),

      updateSettings: (patch) => set(s => ({ settings: { ...s.settings, ...patch } })),

      setSyncStatus: (syncStatus) => set({ syncStatus }),
    }),
    {
      name: 'kasir-app',
      // Hanya persist preferensi UI — bukan settings sensitif (token disimpan di DB)
      partialize: s => ({ darkMode: s.darkMode, view: s.view }),
    }
  )
);
