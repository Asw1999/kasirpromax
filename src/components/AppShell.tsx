import React from 'react';
import { useAppStore } from '@/store/appStore';
import BottomNav from './BottomNav';
import Toast from './Toast';

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const darkMode = useAppStore(s => s.darkMode);

  return (
    <div className={`flex flex-col h-screen ${darkMode ? 'dark' : ''}`}>
      <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900">
        {children}
      </div>
      <BottomNav />
      <Toast />
    </div>
  );
}
