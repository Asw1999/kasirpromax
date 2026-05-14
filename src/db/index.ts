import Dexie, { type Table } from 'dexie';
import type { Product, Transaction, Customer, AppSettings } from '@/types';

interface SettingsRow {
  key: string;
  value: unknown;
}

// SyncQueue: sederhana dulu. Evaluate kebutuhan setelah offline usage
// nyata teridentifikasi — jangan asumsi requirement.
interface SyncQueueItem {
  id?: number;
  operation: 'create' | 'update' | 'delete';
  tableName: string;
  recordId: string;
  payload: unknown;
  timestamp: number;
  retries: number;
}

class KasirDB extends Dexie {
  products!: Table<Product, string>;
  transactions!: Table<Transaction, string>;
  customers!: Table<Customer, string>;
  settings!: Table<SettingsRow, string>;
  syncQueue!: Table<SyncQueueItem, number>;

  constructor() {
    super('kasirpromax_v2');

    this.version(1).stores({
      // Index yang benar-benar dipakai untuk query:
      products:     'id, category, barcode, isActive, updatedAt',
      transactions: 'id, date, customerId, status, payMethod, createdAt',
      customers:    'id, name, isActive, updatedAt',
      settings:     'key',
      syncQueue:    '++id, tableName, timestamp',
    });

    // Migrasi versi SELALU di bawah, jangan edit versi yang sudah ada:
    // this.version(2).stores({ ... }).upgrade(tx => { ... });
  }
}

export const db = new KasirDB();

// Settings helpers — dipakai di banyak tempat
export async function getSetting<T>(key: string): Promise<T | undefined> {
  const row = await db.settings.get(key);
  return row?.value as T | undefined;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await db.settings.put({ key, value });
}

export async function getSettings(): Promise<Partial<AppSettings>> {
  const rows = await db.settings.toArray();
  return Object.fromEntries(rows.map(r => [r.key, r.value])) as any;
}
