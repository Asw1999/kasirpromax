import { useAppStore } from '@/store/appStore';

const NAV_ITEMS: { id: ReturnType<typeof useAppStore>['view']; label: string; icon: string }[] = [
  { id: 'pos', label: 'POS', icon: '🛒' },
  { id: 'inventory', label: 'Stok', icon: '📦' },
  { id: 'history', label: 'Riwayat', icon: '📋' },
  { id: 'reports', label: 'Laporan', icon: '📊' },
  { id: 'settings', label: 'Seting', icon: '⚙️' },
];

export default function BottomNav() {
  const { view, setView } = useAppStore();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
      <div className="flex justify-around items-center h-16">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={`flex flex-col items-center justify-center flex-1 h-full text-xs gap-1 transition-colors ${
              view === item.id
                ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
