import { z } from 'zod';
import { db } from '@/db';
import { generateId } from '@/utils/id';
import type { Product } from '@/types';

export const ProductSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi').max(100),
  category: z.string().default('Umum'),
  barcode: z.string().optional(),
  buyPrice: z.number().min(0, 'Harga modal tidak boleh negatif'),
  sellPrice: z.number().positive('Harga jual harus lebih dari 0'),
  stock: z.number().min(0).default(0),
  minStock: z.number().min(0).optional(),
  unit: z.string().min(1).default('pcs'),
  isActive: z.boolean().default(true),
}).refine(d => d.sellPrice >= d.buyPrice, {
  message: 'Harga jual tidak boleh lebih rendah dari harga modal',
  path: ['sellPrice'],
});

export type ProductInput = z.infer<typeof ProductSchema>;

export async function createProduct(input: ProductInput): Promise<Product> {
  const data = ProductSchema.parse(input);
  const now = Date.now();
  const product: Product = { id: generateId(), ...data, createdAt: now, updatedAt: now };
  await db.products.add(product);
  return product;
}

export async function updateProduct(id: string, input: Partial<ProductInput>): Promise<Product> {
  const existing = await db.products.get(id);
  if (!existing) throw new Error('Produk tidak ditemukan');

  const merged = { ...existing, ...input };
  const data = ProductSchema.parse(merged);
  const updated: Product = { ...data, id, createdAt: existing.createdAt, updatedAt: Date.now() };
  await db.products.put(updated);
  return updated;
}

export async function softDeleteProduct(id: string): Promise<void> {
  const product = await db.products.get(id);
  if (!product) throw new Error('Produk tidak ditemukan');
  await db.products.update(id, { isActive: false, updatedAt: Date.now() });
}

export async function hardDeleteProduct(id: string): Promise<void> {
  await db.products.delete(id);
}

export async function adjustStock(
  id: string,
  delta: number,        // positif = tambah, negatif = kurangi
  reason: string
): Promise<void> {
  const product = await db.products.get(id);
  if (!product) throw new Error('Produk tidak ditemukan');

  const newStock = Math.max(0, product.stock + delta);
  await db.products.update(id, { stock: newStock, updatedAt: Date.now() });

  // TODO: simpan stock adjustment log ke tabel terpisah
  console.log(`Stock ${product.name}: ${product.stock} → ${newStock} (${reason})`);
}

// Import: merge = skip nama yang sama, replace = update nama yang sama, reset = hapus semua dulu
export type ImportMode = 'merge' | 'replace' | 'reset';

export async function importProducts(
  incoming: ProductInput[],
  mode: ImportMode
): Promise<{ added: number; updated: number; skipped: number; errors: string[] }> {
  const result = { added: 0, updated: 0, skipped: 0, errors: [] as string[] };

  if (mode === 'reset') await db.products.clear();

  const existing = await db.products.toArray();
  const byName = new Map(existing.map(p => [p.name.toLowerCase(), p]));

  for (const raw of incoming) {
    const parsed = ProductSchema.safeParse(raw);
    if (!parsed.success) {
      result.errors.push(`"${(raw as any).name}": ${parsed.error.issues[0]?.message}`);
      continue;
    }

    const key = parsed.data.name.toLowerCase();
    const found = byName.get(key);

    if (found && mode === 'merge') { result.skipped++; continue; }
    if (found && mode === 'replace') { await updateProduct(found.id, parsed.data); result.updated++; continue; }

    await createProduct(parsed.data);
    result.added++;
  }

  return result;
}

export async function getProductsByCategory(): Promise<Map<string, number>> {
  const products = await db.products.where('isActive').equals(true as any).toArray();
  const categoryCount = new Map<string, number>();
  
  for (const product of products) {
    const count = categoryCount.get(product.category) ?? 0;
    categoryCount.set(product.category, count + 1);
  }
  
  return categoryCount;
}

export async function getAllProducts(): Promise<Product[]> {
  return db.products.where('isActive').equals(true as any).toArray();
}
