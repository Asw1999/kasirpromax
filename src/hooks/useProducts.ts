import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';

export function useProducts(opts: { search?: string; category?: string } = {}) {
  const products = useLiveQuery(
    () => db.products
      .where('isActive').equals(true as any)
      .sortBy('name'),
    []
  );

  // Filter di client — data sudah kecil untuk skala warung
  const filtered = (products ?? []).filter(p => {
    if (opts.category && opts.category !== 'Semua' && p.category !== opts.category)
      return false;
    if (opts.search) {
      const q = opts.search.toLowerCase();
      return p.name.toLowerCase().includes(q) || (p.barcode ?? '').includes(q);
    }
    return true;
  });

  return {
    products: filtered,
    allProducts: products ?? [],
    isLoading: products === undefined,
  };
}
