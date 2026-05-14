# KasirProMax — Architecture Blueprint v2
> Ditulis ulang dari nol. Pragmatis, production-grade, solo developer friendly.
> Stack: React + TypeScript + Zustand + Dexie + Zod + Vite PWA

---

## FILOSOFI DASAR

Blueprint ini dibangun di atas tiga prinsip:

**1. Ship dulu, refactor kemudian — tapi dengan fondasi yang benar.**
Artinya: tidak overengineer di hari pertama, tapi tidak juga technical debt yang nyesek 3 bulan lagi.

**2. Solo developer ≠ startup engineering team.**
Pattern yang masuk akal untuk tim 5 orang bisa membunuh produktivitas solo developer. Setiap layer abstraksi harus earn its place.

**3. Data integrity > fitur baru.**
Ini POS. Transaksi keuangan. Stok salah atau transaksi hilang = masalah nyata di lapangan. Prioritaskan correctness di data layer sebelum UX polish.

---

## 1. FOLDER STRUCTURE

Ini yang saya pakai. Lebih flat, lebih sedikit file, lebih mudah navigate di Termux.

```
src/
├── db/
│   ├── index.ts          ← Dexie instance + schema (SATU FILE)
│   └── migrate.ts        ← script migrasi dari data lama
│
├── features/
│   ├── pos/
│   │   ├── Cart.tsx
│   │   ├── ProductGrid.tsx
│   │   ├── CheckoutModal.tsx
│   │   ├── cartStore.ts
│   │   └── cartService.ts
│   │
│   ├── inventory/
│   │   ├── ProductList.tsx
│   │   ├── ProductForm.tsx
│   │   └── productService.ts
│   │
│   ├── sales/
│   │   ├── TransactionList.tsx
│   │   ├── ReceiptModal.tsx
│   │   └── salesService.ts
│   │
│   ├── customers/
│   │   ├── CustomerList.tsx
│   │   ├── CustomerForm.tsx
│   │   └── customerService.ts
│   │
│   └── reports/
│       ├── Dashboard.tsx
│       └── reportService.ts
│
├── components/
│   ├── AppShell.tsx       ← layout wrapper
│   ├── BottomNav.tsx
│   ├── Modal.tsx          ← reusable modal primitive
│   ├── Toast.tsx
│   └── EmptyState.tsx
│
├── store/
│   └── appStore.ts        ← global state: view, darkmode, toasts, settings
│
├── hooks/
│   ├── useToast.ts
│   └── useDebounce.ts
│
├── utils/
│   ├── currency.ts
│   ├── date.ts
│   └── id.ts
│
└── types/
    ├── product.ts
    ├── transaction.ts
    ├── customer.ts
    └── settings.ts
```

**Kenapa lebih flat dari blueprint v1?**

- `src/lib/` dihapus — tidak ada value, hanya re-export
- `src/services/sync/` dipindah ke setelah core selesai — prematur
- `src/services/pwa/` dihapus — PWA config ada di `vite.config.ts`, bukan source code
- Tidak ada `src/app/router.tsx` — navigasi SPA cukup lewat `appStore.currentView`
- `components/ui/` diganti shadcn/ui — tidak perlu bangun sendiri

---

## 2. TYPES

Perbedaan utama dari v1: **multi-unit TIDAK ada di tipe dasar dulu.** Tambah setelah core POS stabil.

### `src/types/product.ts`

```typescript
export interface Product {
  id: string;
  name: string;
  category: string;
  barcode?: string;
  buyPrice: number;       // harga modal (single unit dulu)
  sellPrice: number;      // harga jual
  stock: number;
  minStock?: number;
  unit: string;           // "pcs", "kg", "botol" — free text, bukan enum
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

// Ditambah NANTI ketika multi-unit dibutuhkan:
// export interface ProductUnit { name, multiplier, buyPrice, sellPrice }
// Backward compat: Product.units = [{ name: Product.unit, multiplier: 1, ... }]
```

### `src/types/transaction.ts`

```typescript
export type PaymentMethod = 'TUNAI' | 'TRANSFER' | 'QRIS' | 'KREDIT';
export type TransactionStatus = 'completed' | 'voided';

export interface CartItem {
  productId: string;
  productName: string;    // snapshot saat transaksi
  unit: string;
  qty: number;
  unitPrice: number;      // snapshot harga saat transaksi
  costPrice: number;      // snapshot modal saat transaksi
  subtotal: number;       // qty * unitPrice (sebelum diskon item)
}

export interface Transaction {
  id: string;
  date: string;           // ISO string
  items: CartItem[];
  customerId?: string;
  customerName?: string;  // snapshot, wajib diisi kalau ada customerId
  subtotal: number;       // sum of items subtotal
  discount: number;       // diskon keseluruhan (Rp)
  total: number;          // subtotal - discount
  profit: number;         // sum of (unitPrice - costPrice) * qty
  payMethod: PaymentMethod;
  amountPaid: number;
  change: number;
  status: TransactionStatus;
  voidReason?: string;    // wajib ada kalau status === 'voided'
  cashier: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}
```

> **Catatan `voidReason`:** Ini yang kurang di v1. Setiap void HARUS ada alasan. Bukan cuma best practice — ini audit trail operasional.

### `src/types/customer.ts`

```typescript
export interface Customer {
  id: string;
  name: string;
  phone?: string;
  storeName?: string;
  address?: string;
  notes?: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}
```

Tidak ada `CustomerWithStats` di types. Stats dihitung on-demand di `reportService`, bukan disimpan.

### `src/types/settings.ts`

```typescript
export interface AppSettings {
  shopName: string;
  address: string;
  phone: string;
  cashierName: string;
  currency: 'IDR';
  // Turso sync — user input via Settings screen, disimpan ke DB
  tursoUrl?: string;
  tursoToken?: string;
  // Feature toggles — tambah ketika fiturnya SUDAH ADA, bukan antisipasi
  showCostPrice: boolean;
  enableCustomers: boolean;
  enableStockTracking: boolean;
}

// AppMode DIHAPUS dari v1.
// Tambah kembali ketika ada satu user story konkret tentang "mode resto".
// Premature abstraction sekarang = maintenance burden nanti.
```

---

## 3. DATABASE LAYER

### `src/db/index.ts`

Satu file. Tidak perlu `database.ts` + `migrations.ts` + `index.ts` terpisah untuk skala ini.

```typescript
import Dexie, { type Table } from 'dexie';
import type { Product } from '@/types/product';
import type { Transaction } from '@/types/transaction';
import type { Customer } from '@/types/customer';

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

export async function getSettings(): Promise<Partial<import('@/types/settings').AppSettings>> {
  const rows = await db.settings.toArray();
  return Object.fromEntries(rows.map(r => [r.key, r.value])) as any;
}
```

**Kenapa `kasirpromax_v2` bukan `kasirpromax`?**

Karena schema lama (vanilla IndexedDB) kemungkinan sudah pakai nama `kasirpromax`. Daripada migrate in-place yang berisiko, buka DB baru dan run migration script sekali saat startup. Lebih predictable.

### `src/db/migrate.ts`

```typescript
import { db, setSetting } from './index';
import type { Product } from '@/types/product';
import { generateId } from '@/utils/id';

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
    const newProducts: Product[] = oldProducts.map(p => ({
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

    await db.products.bulkAdd(newProducts);

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
```

---

## 4. SERVICE LAYER

### Prinsip Service Layer

```
Service = pure business logic
         + DB access via Dexie
         - React imports
         - DOM access
         - Zustand imports
```

Service boleh akses `db` langsung. Service TIDAK boleh import store atau hook. Ini yang membuat service testable dan reusable.

### `src/features/pos/cartService.ts`

```typescript
import type { CartItem } from '@/types/transaction';
import type { Product } from '@/types/product';

// ── Kalkulasi (pure functions, zero side effects) ────────────

export function calcSubtotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.subtotal, 0);
}

export function calcTotal(subtotal: number, discount: number): number {
  return Math.max(0, subtotal - discount);
}

export function calcProfit(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + (i.unitPrice - i.costPrice) * i.qty, 0);
}

export function calcChange(total: number, amountPaid: number): number {
  return Math.max(0, amountPaid - total);
}

export function suggestPayAmounts(total: number): number[] {
  if (total <= 0) return [];
  const results = new Set<number>([total]);
  const round = [1000, 2000, 5000, 10000, 20000, 50000, 100000];
  for (const r of round) {
    const up = Math.ceil(total / r) * r;
    if (up > total) results.add(up);
    if (results.size >= 5) break;
  }
  return [...results].sort((a, b) => a - b);
}

// ── Mutasi Cart (immutable — return array baru) ───────────────

export function addItem(items: CartItem[], product: Product, qty = 1): CartItem[] {
  const existing = items.find(i => i.productId === product.id);

  if (existing) {
    return items.map(i =>
      i.productId === product.id
        ? { ...i, qty: i.qty + qty, subtotal: (i.qty + qty) * i.unitPrice }
        : i
    );
  }

  return [
    ...items,
    {
      productId: product.id,
      productName: product.name,
      unit: product.unit,
      qty,
      unitPrice: product.sellPrice,
      costPrice: product.buyPrice,
      subtotal: product.sellPrice * qty,
    },
  ];
}

export function setQty(items: CartItem[], productId: string, qty: number): CartItem[] {
  if (qty <= 0) return removeItem(items, productId);
  return items.map(i =>
    i.productId === productId
      ? { ...i, qty, subtotal: i.unitPrice * qty }
      : i
  );
}

export function removeItem(items: CartItem[], productId: string): CartItem[] {
  return items.filter(i => i.productId !== productId);
}

export function clearItems(): CartItem[] {
  return [];
}
```

### `src/features/sales/salesService.ts`

```typescript
import { db } from '@/db';
import { generateId } from '@/utils/id';
import { calcSubtotal, calcTotal, calcProfit, calcChange } from '@/features/pos/cartService';
import type { CartItem, Transaction, PaymentMethod } from '@/types/transaction';

export interface CheckoutInput {
  items: CartItem[];
  discount: number;
  payMethod: PaymentMethod;
  amountPaid: number;
  customerId?: string;
  notes?: string;
  cashier: string;
}

export interface CheckoutResult {
  transaction: Transaction;
  change: number;
}

export async function checkout(input: CheckoutInput): Promise<CheckoutResult> {
  const { items, discount, payMethod, amountPaid, customerId, notes, cashier } = input;

  if (items.length === 0) throw new Error('Keranjang kosong');

  // Resolve customer name — dilakukan di service, bukan di caller
  let customerName: string | undefined;
  if (customerId) {
    const customer = await db.customers.get(customerId);
    customerName = customer?.name;
    if (!customer) throw new Error('Pelanggan tidak ditemukan');
  }

  const subtotal = calcSubtotal(items);
  const total = calcTotal(subtotal, discount);
  const profit = calcProfit(items);
  const change = calcChange(total, amountPaid);

  if (amountPaid < total) {
    throw new Error(`Pembayaran kurang Rp ${(total - amountPaid).toLocaleString('id-ID')}`);
  }

  const now = Date.now();
  const transaction: Transaction = {
    id: generateId(),
    date: new Date().toISOString(),
    items,
    customerId,
    customerName,       // selalu diisi di sini, bukan "nanti di caller"
    subtotal,
    discount,
    total,
    profit,
    payMethod,
    amountPaid,
    change,
    status: 'completed',
    cashier,
    notes,
    createdAt: now,
    updatedAt: now,
  };

  // Atomik: transaksi + stok deduction dalam satu DB transaction
  await db.transaction('rw', db.transactions, db.products, async () => {
    await db.transactions.add(transaction);

    for (const item of items) {
      const product = await db.products.get(item.productId);
      if (!product) continue; // produk dihapus? skip, jangan throw

      await db.products.update(item.productId, {
        stock: Math.max(0, product.stock - item.qty),
        updatedAt: now,
      });
    }
  });

  return { transaction, change };
}

export async function voidTransaction(
  transactionId: string,
  reason: string    // WAJIB — bukan optional
): Promise<void> {
  if (!reason.trim()) throw new Error('Alasan void wajib diisi');

  const trx = await db.transactions.get(transactionId);
  if (!trx) throw new Error('Transaksi tidak ditemukan');
  if (trx.status === 'voided') throw new Error('Transaksi sudah di-void sebelumnya');

  const now = Date.now();

  await db.transaction('rw', db.transactions, db.products, async () => {
    await db.transactions.update(transactionId, {
      status: 'voided',
      voidReason: reason,
      updatedAt: now,
    });

    // Rollback stok
    for (const item of trx.items) {
      const product = await db.products.get(item.productId);
      if (!product) continue;

      await db.products.update(item.productId, {
        stock: product.stock + item.qty,
        updatedAt: now,
      });
    }
  });
}
```

### `src/features/inventory/productService.ts`

```typescript
import { z } from 'zod';
import { db } from '@/db';
import { generateId } from '@/utils/id';
import type { Product } from '@/types/product';

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

  const updated = { ...existing, ...input, updatedAt: Date.now() };
  await db.products.put(updated);
  return updated;
}

export async function softDeleteProduct(id: string): Promise<void> {
  await db.products.update(id, { isActive: false, updatedAt: Date.now() });
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
      result.errors.push(`"${raw.name}": ${parsed.error.issues[0]?.message}`);
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
```

### `src/features/reports/reportService.ts`

```typescript
import { db } from '@/db';
import type { Transaction } from '@/types/transaction';

export interface SalesReport {
  revenue: number;
  profit: number;
  transactionCount: number;
  avgOrderValue: number;
  marginPct: number;
  voidCount: number;
}

export interface DailySales {
  date: string;           // YYYY-MM-DD
  revenue: number;
  profit: number;
  count: number;
}

export interface TopProduct {
  productId: string;
  name: string;
  qtySold: number;
  revenue: number;
}

// Query langsung dari Dexie — tidak perlu load semua ke memory
export async function getSalesReport(from: Date, to: Date): Promise<SalesReport> {
  const fromISO = from.toISOString();
  const toISO = to.toISOString();

  // Gunakan Dexie index — jangan toArray() + filter di JS untuk data besar
  const transactions = await db.transactions
    .where('date')
    .between(fromISO, toISO, true, true)
    .toArray();

  const completed = transactions.filter(t => t.status === 'completed');
  const revenue = completed.reduce((s, t) => s + t.total, 0);
  const profit = completed.reduce((s, t) => s + t.profit, 0);
  const count = completed.length;

  return {
    revenue,
    profit,
    transactionCount: count,
    avgOrderValue: count > 0 ? revenue / count : 0,
    marginPct: revenue > 0 ? (profit / revenue) * 100 : 0,
    voidCount: transactions.filter(t => t.status === 'voided').length,
  };
}

export async function getDailySales(from: Date, to: Date): Promise<DailySales[]> {
  const transactions = await db.transactions
    .where('date')
    .between(from.toISOString(), to.toISOString(), true, true)
    .filter(t => t.status === 'completed')
    .toArray();

  const map = new Map<string, DailySales>();

  for (const t of transactions) {
    const day = t.date.slice(0, 10);
    const entry = map.get(day) ?? { date: day, revenue: 0, profit: 0, count: 0 };
    map.set(day, {
      ...entry,
      revenue: entry.revenue + t.total,
      profit: entry.profit + t.profit,
      count: entry.count + 1,
    });
  }

  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export async function getTopProducts(from: Date, to: Date, limit = 10): Promise<TopProduct[]> {
  const transactions = await db.transactions
    .where('date')
    .between(from.toISOString(), to.toISOString(), true, true)
    .filter(t => t.status === 'completed')
    .toArray();

  const map = new Map<string, TopProduct>();

  for (const t of transactions) {
    for (const item of t.items) {
      const entry = map.get(item.productId) ?? {
        productId: item.productId,
        name: item.productName,
        qtySold: 0,
        revenue: 0,
      };
      map.set(item.productId, {
        ...entry,
        qtySold: entry.qtySold + item.qty,
        revenue: entry.revenue + item.subtotal,
      });
    }
  }

  return [...map.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}
```

---

## 5. ZUSTAND STORES

### Aturan Store

```
appStore  → satu store untuk global state (view, darkmode, toasts, settings)
cartStore → cart state + actions, computed via selector
```

Tidak ada `syncStore` terpisah. Sync status masuk `appStore`.

### `src/store/appStore.ts`

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppSettings } from '@/types/settings';

export type ViewId = 'pos' | 'inventory' | 'customers' | 'history' | 'reports' | 'settings';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface AppState {
  view: ViewId;
  darkMode: boolean;
  toasts: Toast[];
  settings: Partial<AppSettings>;
  syncStatus: 'idle' | 'syncing' | 'error';
  lastSyncedAt?: number;

  setView: (v: ViewId) => void;
  toggleDark: () => void;
  toast: (msg: string, type?: ToastType) => void;
  dismissToast: (id: string) => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  setSyncStatus: (status: AppState['syncStatus']) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      view: 'pos',
      darkMode: false,
      toasts: [],
      settings: {},
      syncStatus: 'idle',

      setView: (view) => set({ view }),

      toggleDark: () => set(s => ({ darkMode: !s.darkMode })),

      toast: (message, type = 'success') => {
        const id = crypto.randomUUID();
        set(s => ({ toasts: [...s.toasts, { id, message, type }] }));
        setTimeout(() => get().dismissToast(id), 3000);
      },

      dismissToast: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),

      updateSettings: (patch) => set(s => ({ settings: { ...s.settings, ...patch } })),

      setSyncStatus: (syncStatus) => set({ syncStatus }),
    }),
    {
      name: 'kasir-app',
      // Hanya persist preferensi UI — bukan settings sensitif (token disimpan di DB)
      partialize: s => ({ darkMode: s.darkMode, view: s.view }),
    }
  )
);
```

### `src/features/pos/cartStore.ts`

```typescript
import { create } from 'zustand';
import type { CartItem, PaymentMethod } from '@/types/transaction';
import type { Product } from '@/types/product';
import { addItem, setQty, removeItem, clearItems } from './cartService';

interface CartState {
  items: CartItem[];
  discount: number;
  payMethod: PaymentMethod;
  amountPaid: number;
  customerId?: string;
  isCheckoutOpen: boolean;

  add: (product: Product, qty?: number) => void;
  updateQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  setDiscount: (d: number) => void;
  setPayMethod: (m: PaymentMethod) => void;
  setAmountPaid: (a: number) => void;
  setCustomer: (id?: string) => void;
  openCheckout: () => void;
  closeCheckout: () => void;
  clear: () => void;
}

export const useCartStore = create<CartState>()((set) => ({
  items: [],
  discount: 0,
  payMethod: 'TUNAI',
  amountPaid: 0,
  customerId: undefined,
  isCheckoutOpen: false,

  add: (product, qty = 1) =>
    set(s => ({ items: addItem(s.items, product, qty) })),

  updateQty: (productId, qty) =>
    set(s => ({ items: setQty(s.items, productId, qty) })),

  remove: (productId) =>
    set(s => ({ items: removeItem(s.items, productId) })),

  setDiscount: (discount) => set({ discount }),
  setPayMethod: (payMethod) => set({ payMethod }),
  setAmountPaid: (amountPaid) => set({ amountPaid }),
  setCustomer: (customerId) => set({ customerId }),

  openCheckout: () => set({ isCheckoutOpen: true }),
  closeCheckout: () => set({ isCheckoutOpen: false }),

  clear: () => set({
    items: clearItems(),
    discount: 0,
    payMethod: 'TUNAI',
    amountPaid: 0,
    customerId: undefined,
    isCheckoutOpen: false,
  }),
}));

// ── Selectors — computed di luar store ────────────────────────
// Pattern yang benar untuk Zustand: bukan getter di dalam create()
// Computed = selector function yang dipanggil di component

import { calcSubtotal, calcTotal, calcProfit, calcChange } from './cartService';

export const selectSubtotal = (s: CartState) => calcSubtotal(s.items);
export const selectTotal = (s: CartState) => calcTotal(calcSubtotal(s.items), s.discount);
export const selectProfit = (s: CartState) => calcProfit(s.items);
export const selectChange = (s: CartState) => calcChange(
  calcTotal(calcSubtotal(s.items), s.discount),
  s.amountPaid
);
export const selectItemCount = (s: CartState) => s.items.reduce((n, i) => n + i.qty, 0);

// Penggunaan di component:
// const total = useCartStore(selectTotal);
// const itemCount = useCartStore(selectItemCount);
```

> **Ini yang fix dari v1:** Computed values bukan getter di dalam `create()` — itu tidak bekerja di Zustand. Semua computed diekspresikan sebagai selector functions yang memoize otomatis ketika dipakai dengan `useCartStore(selector)`.

---

## 6. HOOKS

### `src/hooks/useToast.ts`

```typescript
import { useAppStore } from '@/store/appStore';

export function useToast() {
  const toast = useAppStore(s => s.toast);
  return {
    success: (msg: string) => toast(msg, 'success'),
    error: (msg: string) => toast(msg, 'error'),
    warning: (msg: string) => toast(msg, 'warning'),
    info: (msg: string) => toast(msg, 'info'),
  };
}
```

### Hook Pattern untuk Feature Data

Untuk semua data features, gunakan `useLiveQuery` dari Dexie — bukan `useState + useEffect + fetch`. Ini reactive: setiap perubahan di Dexie langsung re-render component.

```typescript
// src/features/inventory/useProducts.ts
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';

export function useProducts(opts: { search?: string; category?: string } = {}) {
  const products = useLiveQuery(
    () => db.products
      .where('isActive').equals(1)
      .sortBy('name'),
    []   // deps array — kosong karena query tidak bergantung variable
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

// src/features/sales/useTransactions.ts
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';

export function useTransactions(from?: Date, to?: Date) {
  return useLiveQuery(
    async () => {
      if (from && to) {
        return db.transactions
          .where('date')
          .between(from.toISOString(), to.toISOString(), true, true)
          .reverse()
          .toArray();
      }
      return db.transactions.orderBy('date').reverse().limit(100).toArray();
    },
    [from?.toISOString(), to?.toISOString()]  // re-query saat date berubah
  );
}
```

**Kenapa `useLiveQuery` bukan `useState + useEffect`?**

Ketika kasir checkout, stok produk berkurang di Dexie. Dengan `useLiveQuery`, halaman inventory langsung update tanpa perlu emit event, tanpa perlu global state, tanpa perlu manual `reload()`. Ini satu-satunya cara yang benar untuk offline-first reactive UI.

---

## 7. UTILITIES

### `src/utils/id.ts`

```typescript
// crypto.randomUUID() — built-in browser, collision-free
// Tidak perlu library, tidak perlu Date.now() trick
export function generateId(): string {
  return crypto.randomUUID();
}

export function shortId(id: string): string {
  return id.slice(-6).toUpperCase();
}
```

### `src/utils/currency.ts`

```typescript
const LOCALE = 'id-ID';

export function formatRp(amount: number): string {
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Untuk display ringkas: "Rp 12.500"
export function formatRpShort(amount: number): string {
  return `Rp ${amount.toLocaleString(LOCALE)}`;
}

// Untuk input field: 12500 ↔ "12.500"
export function formatInput(amount: number): string {
  return amount > 0 ? amount.toLocaleString(LOCALE) : '';
}

export function parseInput(str: string): number {
  return Number(str.replace(/\./g, '').replace(',', '.')) || 0;
}
```

### `src/utils/date.ts`

```typescript
const LOCALE = 'id-ID';

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString(LOCALE);
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString(LOCALE, { dateStyle: 'short', timeStyle: 'short' });
}

export function todayRange(): { from: Date; to: Date } {
  const from = new Date(); from.setHours(0, 0, 0, 0);
  const to = new Date(); to.setHours(23, 59, 59, 999);
  return { from, to };
}

export function lastNDaysRange(n: number): { from: Date; to: Date } {
  const to = new Date(); to.setHours(23, 59, 59, 999);
  const from = new Date(); from.setDate(from.getDate() - n); from.setHours(0, 0, 0, 0);
  return { from, to };
}

export function thisMonthRange(): { from: Date; to: Date } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { from, to };
}
```

---

## 8. VITE CONFIG

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',  // user konfirmasi update — jangan auto
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // TIDAK ada runtimeCaching untuk Turso API.
        // Turso adalah database, bukan static resource.
        // Offline data sudah dihandle Dexie.
      },
      manifest: {
        name: 'KasirProMax',
        short_name: 'KasirPro',
        theme_color: '#1e40af',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
```

---

## 9. TURSO SYNC STRATEGY

Ini bagian yang paling underspecified di v1. Keputusan yang harus dibuat sebelum implement:

### Pertanyaan Kritis

**Skenario apa yang kamu support?**

| Skenario | Implikasi |
|---|---|
| Satu device, backup ke cloud | Sederhana. Sync = upload. No conflict. |
| Dua device, satu cashier bergantian | Perlu last-write-wins dengan timestamp. |
| Dua device, dua cashier bersamaan | Perlu conflict resolution per record. |
| Dua device + offline interval | Perlu queue + idempotent upsert. |

**Pilih satu dulu. Jangan design untuk semua skenario sekaligus.**

Rekomendasi untuk warung kecil: **Satu device, backup ke cloud.** Sync adalah upload-only. Ketika device ganti, download semua data dari Turso sebagai restore. Tidak perlu sync queue yang kompleks.

### Implementasi Sederhana (Satu Device)

```typescript
// src/features/settings/syncService.ts
import { db, getSetting } from '@/db';

export async function syncToTurso(): Promise<void> {
  const url = await getSetting<string>('tursoUrl');
  const token = await getSetting<string>('tursoToken');
  if (!url || !token) throw new Error('Sync belum dikonfigurasi');

  // Ambil semua records yang diupdate sejak last sync
  const lastSync = await getSetting<number>('lastSyncedAt') ?? 0;

  const [products, transactions, customers] = await Promise.all([
    db.products.where('updatedAt').above(lastSync).toArray(),
    db.transactions.where('updatedAt').above(lastSync).toArray(),
    db.customers.where('updatedAt').above(lastSync).toArray(),
  ]);

  // TODO: batch upsert ke Turso via libSQL client
  // PENTING: gunakan INSERT OR REPLACE / UPSERT, bukan INSERT
  // sehingga idempotent kalau dijalankan ulang

  const now = Date.now();
  await db.settings.put({ key: 'lastSyncedAt', value: now });
}
```

**Token security:**
```typescript
// Settings screen → user input → simpan ke Dexie
// TIDAK PERNAH di source code, TIDAK PERNAH di git
await db.settings.bulkPut([
  { key: 'tursoUrl', value: url },
  { key: 'tursoToken', value: token },
]);

// Baca sebelum sync
const token = await getSetting<string>('tursoToken');
```

---

## 10. ROADMAP

Berbeda dari v1 yang estimasi "10 minggu". Roadmap ini ditulis untuk **solo developer dengan pekerjaan lain** — realistis, berurutan, setiap fase deliver value nyata.

### Fase 0 — Setup (3-5 hari)
```bash
npm create vite@latest kasirpromax -- --template react-ts
npm install dexie dexie-react-hooks zustand zod
npm install -D vite-plugin-pwa tailwindcss
npx shadcn@latest init
```

Checklist:
- [ ] Vite + React + TypeScript
- [ ] Tailwind + shadcn/ui
- [ ] Path alias `@/` → `src/`
- [ ] Dexie schema v1 (`src/db/index.ts`)
- [ ] Migration script (`src/db/migrate.ts`)
- [ ] AppShell + BottomNav + routing via `appStore`

**Deliverable: App bisa dibuka, navigasi berfungsi, data lama ter-migrate.**

---

### Fase 1 — Inventory (1-2 minggu)
**Prioritas pertama karena POS depends on products**

- [ ] `productService.ts` + Zod validation
- [ ] `useProducts` hook dengan `useLiveQuery`
- [ ] `ProductList.tsx` — list + search + filter category
- [ ] `ProductForm.tsx` — add/edit produk
- [ ] Import/Export JSON

**Deliverable: Bisa manage produk sepenuhnya.**

---

### Fase 2 — POS + Checkout (2-3 minggu)
- [ ] `cartService.ts` (pure functions)
- [ ] `cartStore.ts` + selectors yang benar
- [ ] `ProductGrid.tsx` — grid produk + tap to add
- [ ] `Cart.tsx` — drawer/panel cart
- [ ] `CheckoutModal.tsx` — input bayar + kembalian + suggestPayAmounts
- [ ] `salesService.ts` — checkout atomik + stok deduction
- [ ] Nota sederhana (print / share text)

**Deliverable: Bisa transaksi dari awal sampai akhir.**

---

### Fase 3 — History + Void (1 minggu)
- [ ] `TransactionList.tsx` — filter by date
- [ ] `ReceiptModal.tsx` — detail transaksi
- [ ] Void transaksi + wajib input alasan
- [ ] Export history CSV

**Deliverable: Audit trail transaksi lengkap.**

---

### Fase 4 — Dashboard (1 minggu)
- [ ] `reportService.ts` — query by date range
- [ ] Stats hari ini: omzet, profit, jumlah transaksi
- [ ] Grafik harian sederhana (tanpa library besar, pakai CSS atau recharts)
- [ ] Top 5 produk terlaris

**Deliverable: Bisa lihat performa harian.**

---

### Fase 5 — Customers (1 minggu, opsional)
Lakukan hanya jika **sudah ada kebutuhan konkret** dari penggunaan lapangan.

- [ ] `customerService.ts`
- [ ] CustomerList + CustomerForm
- [ ] Customer selector di CheckoutModal
- [ ] Histori pembelian per customer

---

### Fase 6 — Sync + Settings (1-2 minggu)
- [ ] Settings screen: nama toko, cashier, Turso config
- [ ] `syncService.ts` — upload ke Turso
- [ ] Sync status indicator
- [ ] Offline indicator (PWA)

---

### Yang Tidak Ada di Roadmap Ini (Sengaja)

| Fitur | Alasan Ditunda |
|---|---|
| Multi-unit product | Tambah setelah core stabil, ada migration path yang jelas |
| Restaurant mode | Belum ada spec konkret |
| Barcode scanner | Nice to have, bukan blocker |
| Stock adjustment log | Tambah setelah `adjustStock()` sering dipakai |
| Custom syncQueue | Evaluate kebutuhan nyata dulu, Turso mungkin punya solusi |

---

## 11. TYPESCRIPT MIGRATION

Sama dengan v1 — ini sudah benar di blueprint asli. Ulangi di sini untuk completeness:

### `tsconfig.json` — Bertahap
```json
// Mulai non-strict:
{
  "compilerOptions": {
    "strict": false,
    "allowJs": true,
    "noImplicitAny": false
  }
}

// Aktifkan strict setelah types selesai:
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": false
  }
}

// Full strict setelah semua stabil:
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### Urutan Migration File
```
1. src/types/       ← foundational, tidak punya dependencies
2. src/utils/       ← pure functions, tidak butuh types kompleks
3. src/db/          ← butuh types
4. src/features/*/services  ← butuh types + db
5. src/store/       ← butuh types + services
6. src/features/*/hooks     ← butuh store + db
7. src/components/  ← butuh semua di atas
```

---

## 12. CHECKLIST SEBELUM LAUNCH

Sebelum deploy ke production (dipakai di lapangan):

**Data integrity:**
- [ ] Checkout dengan keranjang kosong → error jelas
- [ ] Checkout dengan amountPaid < total → error jelas
- [ ] Checkout di tengah jalan crash browser → data tidak korup
- [ ] Void transaksi → stok kembali dengan benar
- [ ] Import produk dengan format salah → error per baris, tidak crash semua

**PWA:**
- [ ] Install ke homescreen berhasil
- [ ] Buka tanpa internet → app berfungsi penuh
- [ ] Ada notifikasi update saat versi baru tersedia

**Edge cases:**
- [ ] Produk dihapus tapi ada di transaksi lama → transaksi masih tampil dengan data snapshot
- [ ] Stok produk = 0 → warning, tapi masih bisa dijual (warung bisa pesan dulu)
- [ ] Dua tab browser buka bersamaan → `useLiveQuery` sync otomatis

---

## PERBANDINGAN v1 vs v2

| Aspek | Blueprint v1 | Blueprint v2 |
|---|---|---|
| File count | ~45 files | ~28 files |
| Multi-unit | Di types dari awal | Ditunda, migration path jelas |
| Computed state | Getter broken di Zustand | Selector functions yang benar |
| Reactive data | useState + fetch | useLiveQuery (Dexie native) |
| customerName di checkout | "diisi di caller" | Resolved di service |
| voidReason | Optional | Wajib |
| Sync complexity | Queue custom + conflict resolution | Satu device dulu, evaluate setelah itu |
| SW caching Turso | Ada (berbahaya) | Dihapus |
| AppMode (retail/resto) | Ada di types | Dihapus, tambah saat ada spec |
| syncStore | Store terpisah | Merge ke appStore |
| generateId | Date.now + Math.random | crypto.randomUUID() |
| Roadmap | 10 minggu full-time | Per fase, deliverable konkret |

---

*Blueprint ini adalah titik awal, bukan kontrak. Prioritaskan correctness di service layer dan data layer. UI bisa diiterasi kapan saja, bug di checkout dan stok deduction itu yang menyakitkan.*