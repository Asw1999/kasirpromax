import { useAppStore } from '@/store/appStore';

export function useToast() {
  const toast = useAppStore(s => s.toast);
  return {
    success: (msg: string) => toast(msg, 'success'),
    error: (msg: string) => toast(msg, 'error'),
    warning: (msg: string) => toast(msg, 'warning'),
    info: (msg: string) => toast(msg, 'info'),
  };
}
