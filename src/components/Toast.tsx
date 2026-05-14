import { useAppStore } from '@/store/appStore';

export default function Toast() {
  const toasts = useAppStore(s => s.toasts);

  return (
    <div className="fixed top-4 left-4 right-4 flex flex-col gap-2 pointer-events-none z-50">
      {toasts.map(toast => {
        const bgColor = {
          success: 'bg-green-500',
          error: 'bg-red-500',
          warning: 'bg-yellow-500',
          info: 'bg-blue-500',
        }[toast.type];

        return (
          <div
            key={toast.id}
            className={`${bgColor} text-white px-4 py-3 rounded-lg shadow-lg pointer-events-auto`}
          >
            {toast.message}
          </div>
        );
      })}
    </div>
  );
}
