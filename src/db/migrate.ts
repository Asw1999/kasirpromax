import { db, setSetting } from './index';
import { generateId } from '@/utils/id';
import type { Product } from '@/types';

// Jalankan sekali saat app pertama kali dibuka dengan schema baru
export async function runMigration(): Promise<void> {
  const alreadyMigrated = await db.settings.get('migration_v1_done');
  if (alreadyMigrated) return;

  try {
    // Buka DB lama
    const oldDB = await openLegacyDB();
    if (!oldDB) {
      // Tidak ada data lama — fresh install
      await setSetting('migration_v1_done', true);
      return;
    }

    // Migrate products
    const oldProducts = await getAllFromStore(oldDB, 'products');
    const newProducts: Product[] = oldProducts.map((p: any) => ({
      id: generateId(),
      name: p.name ?? 'Produk Tanpa Nama',
      category: p.category ?? 'Umum',
      barcode: p.barcode,
      buyPrice: Number(p.cost ?? p.buyPrice ?? 0),
      sellPrice: Number(p.price ?? p.sellPrice ?? 0),
      stock: Number(p.stock ?? 0),
      minStock: p.minStock,
      unit: p.unit ?? 'pcs',
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }));

    if (newProducts.length > 0) {
      await db.products.bulkAdd(newProducts);
    }

    // TODO: migrate transactions, customers — struktur tergantung schema lama

    await setSetting('migration_v1_done', true);
    console.log(`Migration complete: ${newProducts.length} products migrated`);
  } catch (err) {
    console.error('Migration failed:', err);
    // JANGAN throw — biarkan app jalan dengan data kosong
    // User bisa import manual dari backup
  }
}

async function openLegacyDB(): Promise<IDBDatabase | null> {
  return new Promise(resolve => {
    const req = indexedDB.open('kasirpromax'); // nama DB lama
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
    req.onupgradeneeded = () => {
      // DB lama tidak ada — close dan return null
      req.result.close();
      resolve(null);
    };
  });
}

async function getAllFromStore(db: IDBDatabase, storeName: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    if (!db.objectStoreNames.contains(storeName)) {
      resolve([]);
      return;
    }
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
