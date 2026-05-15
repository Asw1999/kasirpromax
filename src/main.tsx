import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppShell } from '@/components';
import { useAppStore } from '@/store/appStore';
import { runMigration } from '@/db/migrate';
import './index.css';

import { InventoryView } from '@/features/inventory';

// POS view (placeholder)
function POSView() {
  return <div className="p-4">🛒 POS - Belum diimplementasi</div>;
}

// History view
function HistoryView() {
  return <div className="p-4">📋 Riwayat - Belum diimplementasi</div>;
}

// Reports view
function ReportsView() {
  return <div className="p-4">📊 Laporan - Belum diimplementasi</div>;
}

// Settings view
function SettingsView() {
  return <div className="p-4">⚙️ Seting - Belum diimplementasi</div>;
}

// Customers view
function CustomersView() {
  return <div className="p-4">👥 Pelanggan - Belum diimplementasi</div>;
}

function App() {
  const view = useAppStore(s => s.view);

  const renderView = () => {
    switch (view) {
      case 'pos':
        return <POSView />;
      case 'inventory':
        return <InventoryView />;
      case 'history':
        return <HistoryView />;
      case 'reports':
        return <ReportsView />;
      case 'settings':
        return <SettingsView />;
      case 'customers':
        return <CustomersView />;
      default:
        return <POSView />;
    }
  };

  return <AppShell>{renderView()}</AppShell>;
}

// Initialize migration on app start
runMigration().catch(err => console.error('Migration error:', err));

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
