import { useState } from 'react';
import { Modal } from '@/components';
import { useToast } from '@/hooks/useToast';
import { importProducts, type ImportMode } from './productService';
import type { ProductInput } from '@/types';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ImportModal({ isOpen, onClose }: ImportModalProps) {
  const [mode, setMode] = useState<ImportMode>('merge');
  const [jsonText, setJsonText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { success, error: showError } = useToast();

  const handleImport = async () => {
    try {
      setIsLoading(true);
      const data = JSON.parse(jsonText) as ProductInput[];

      if (!Array.isArray(data)) {
        throw new Error('Format JSON harus array produk');
      }

      const result = await importProducts(data, mode);
      setResult(result);

      if (result.errors.length === 0) {
        success(`✓ ${result.added} ditambah, ${result.updated} diupdate, ${result.skipped} dilewat`);
        setTimeout(() => {
          onClose();
          setJsonText('');
          setResult(null);
        }, 2000);
      }
    } catch (err) {
      showError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const template = [
      {
        name: 'Contoh Produk 1',
        category: 'Makanan',
        barcode: '12345678',
        buyPrice: 5000,
        sellPrice: 8000,
        stock: 10,
        minStock: 2,
        unit: 'pcs',
      },
      {
        name: 'Contoh Produk 2',
        category: 'Minuman',
        buyPrice: 3000,
        sellPrice: 5000,
        stock: 20,
        unit: 'botol',
      },
    ];

    const json = JSON.stringify(template, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template-produk.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Import Produk">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Mode Import</label>
          <div className="grid grid-cols-3 gap-2">
            {(['merge', 'replace', 'reset'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`p-2 rounded text-sm font-medium transition-colors ${
                  mode === m
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-300'
                }`}
              >
                {m === 'merge' && '➕ Merge'}
                {m === 'replace' && '🔄 Replace'}
                {m === 'reset' && '🗑️ Reset'}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            {mode === 'merge' && 'Tambah produk baru, skip yang sudah ada'}
            {mode === 'replace' && 'Perbarui produk yang sudah ada, tambah yang baru'}
            {mode === 'reset' && 'Hapus semua produk, import dari awal'}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">JSON Produk</label>
          <textarea
            value={jsonText}
            onChange={e => setJsonText(e.target.value)}
            placeholder='[{"name":"Produk","buyPrice":1000,"sellPrice":2000,...}]'
            className="w-full h-40 p-3 border border-slate-300 dark:border-slate-600 rounded-lg font-mono text-sm"
          />
        </div>

        {result && (
          <div className="p-3 bg-slate-100 dark:bg-slate-700 rounded-lg text-sm space-y-1">
            <p>✓ <strong>{result.added}</strong> produk ditambah</p>
            <p>🔄 <strong>{result.updated}</strong> produk diupdate</p>
            <p>⏭️ <strong>{result.skipped}</strong> produk dilewat</p>
            {result.errors.length > 0 && (
              <div className="mt-2 p-2 bg-red-100 dark:bg-red-900 rounded">
                <p className="font-semibold text-red-800 dark:text-red-200">{result.errors.length} Error:</p>
                {result.errors.map((err: string, i: number) => (
                  <p key={i} className="text-red-700 dark:text-red-300 text-xs">{err}</p>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={handleDownloadTemplate}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded transition-colors text-sm"
          >
            📥 Template
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-slate-300 hover:bg-slate-400 dark:bg-slate-600 dark:hover:bg-slate-700 py-2 rounded transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleImport}
            disabled={isLoading || !jsonText.trim()}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Importing...' : 'Import'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
