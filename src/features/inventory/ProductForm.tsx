import { useState, useEffect } from 'react';
import { Modal } from '@/components';
import { useToast } from '@/hooks/useToast';
import { createProduct, updateProduct, ProductSchema } from './productService';
import { db } from '@/db';
import type { Product, ProductInput } from '@/types';

interface ProductFormProps {
  isOpen: boolean;
  onClose: () => void;
  productId?: string;
}

export default function ProductForm({ isOpen, onClose, productId }: ProductFormProps) {
  const [form, setForm] = useState<ProductInput>({
    name: '',
    category: 'Umum',
    barcode: '',
    buyPrice: 0,
    sellPrice: 0,
    stock: 0,
    minStock: 0,
    unit: 'pcs',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const { success, error: showError } = useToast();

  // Load product jika edit
  useEffect(() => {
    if (!isOpen || !productId) return;

    (async () => {
      const product = await db.products.get(productId);
      if (product) {
        const { id, createdAt, updatedAt, isActive, ...data } = product;
        setForm(data as ProductInput);
      }
    })();
  }, [isOpen, productId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }));
    // Clear error untuk field ini
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      const validated = ProductSchema.parse(form);

      setIsLoading(true);

      if (productId) {
        await updateProduct(productId, validated);
        success('Produk diperbarui');
      } else {
        await createProduct(validated);
        success('Produk ditambahkan');
      }

      onClose();
      setForm({
        name: '',
        category: 'Umum',
        barcode: '',
        buyPrice: 0,
        sellPrice: 0,
        stock: 0,
        minStock: 0,
        unit: 'pcs',
      });
    } catch (err: any) {
      if (err.issues) {
        const newErrors: Record<string, string> = {};
        for (const issue of err.issues) {
          newErrors[issue.path[0]] = issue.message;
        }
        setErrors(newErrors);
      } else {
        showError((err as Error).message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={productId ? 'Edit Produk' : 'Produk Baru'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Nama Produk *</label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            className={`w-full ${errors.name ? 'border-red-500' : ''}`}
          />
          {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Kategori</label>
            <select name="category" value={form.category} onChange={handleChange}>
              <option value="Umum">Umum</option>
              <option value="Makanan">Makanan</option>
              <option value="Minuman">Minuman</option>
              <option value="Lainnya">Lainnya</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Satuan</label>
            <input
              type="text"
              name="unit"
              value={form.unit}
              onChange={handleChange}
              placeholder="pcs, kg, botol"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Barcode (Opsional)</label>
          <input
            type="text"
            name="barcode"
            value={form.barcode || ''}
            onChange={handleChange}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Harga Modal *</label>
            <input
              type="number"
              name="buyPrice"
              value={form.buyPrice}
              onChange={handleChange}
              min="0"
              className={errors.buyPrice ? 'border-red-500' : ''}
            />
            {errors.buyPrice && <p className="text-red-500 text-sm mt-1">{errors.buyPrice}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Harga Jual *</label>
            <input
              type="number"
              name="sellPrice"
              value={form.sellPrice}
              onChange={handleChange}
              min="0"
              className={errors.sellPrice ? 'border-red-500' : ''}
            />
            {errors.sellPrice && <p className="text-red-500 text-sm mt-1">{errors.sellPrice}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Stok Awal</label>
            <input
              type="number"
              name="stock"
              value={form.stock}
              onChange={handleChange}
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Min. Stok (Opsional)</label>
            <input
              type="number"
              name="minStock"
              value={form.minStock || ''}
              onChange={handleChange}
              min="0"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-slate-300 hover:bg-slate-400 dark:bg-slate-600 dark:hover:bg-slate-700 py-2 rounded transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
