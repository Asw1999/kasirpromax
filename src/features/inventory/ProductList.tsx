import { useMemo } from 'react';
import { useProducts } from '@/hooks';
import { formatRp, formatDate } from '@/utils';
import { Modal, EmptyState } from '@/components';
import { softDeleteProduct } from './productService';
import { useToast } from '@/hooks/useToast';

interface ProductListProps {
  onEdit: (productId: string) => void;
  onImport: () => void;
}

export default function ProductList({ onEdit, onImport }: ProductListProps) {
  const { products, isLoading } = useProducts();
  const { success, error } = useToast();

  const handleDelete = async (id: string) => {
    if (!window.confirm('Hapus produk ini?')) return;
    try {
      await softDeleteProduct(id);
      success('Produk dihapus');
    } catch (err) {
      error((err as Error).message);
    }
  };

  if (isLoading) {
    return <div className="p-4 text-center">Memuat produk...</div>;
  }

  if (products.length === 0) {
    return (
      <EmptyState
        icon="📦"
        title="Belum ada produk"
        description="Mulai dengan tambah produk baru atau import dari file"
        action={{ label: 'Tambah Produk', onClick: () => onEdit('') }}
      />
    );
  }

  return (
    <div className="p-4 pb-20">
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => onEdit('')}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors"
        >
          ➕ Produk Baru
        </button>
        <button
          onClick={onImport}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg transition-colors"
        >
          📥 Import
        </button>
      </div>

      <div className="space-y-2">
        {products.map(product => (
          <div
            key={product.id}
            className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700"
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-semibold">{product.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {product.category} • {product.unit}
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-green-600">{formatRp(product.sellPrice)}</div>
                <div className="text-xs text-slate-500">Modal: {formatRp(product.buyPrice)}</div>
              </div>
            </div>

            <div className="flex justify-between items-center text-sm mb-3">
              <div>
                <span className="font-semibold">{product.stock}</span>
                <span className="text-slate-500 ml-1">stok</span>
                {product.minStock && (
                  <span className={product.stock <= product.minStock ? 'text-red-600 ml-2 font-semibold' : ''}>
                    (Min: {product.minStock})
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500">
                Update: {formatDate(product.updatedAt)}
              </div>
            </div>

            {product.barcode && (
              <div className="text-xs mb-2 p-2 bg-slate-100 dark:bg-slate-700 rounded font-mono">
                {product.barcode}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => onEdit(product.id)}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded transition-colors text-sm"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(product.id)}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded transition-colors text-sm"
              >
                Hapus
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
