# KasirProMax v2 — Architecture Blueprint Implementation

> **Status:** 🟢 PHASE 0 SELESAI - Foundation Ready
>
> Stack: React + TypeScript + Zustand + Dexie + Zod + Vite PWA

---

## 📦 PHASE 0 - Setup (Completed ✅)

Foundation layer sudah selesai di-push ke branch `feat/v2-refactor`:

### ✅ Struktur Folder Lengkap
```
src/
├── types/          # Product, Transaction, Customer, Settings
├── utils/          # id, currency, date (pure functions)
├── db/             # Dexie schema + migration script
├── store/          # Zustand (appStore + cartStore)
├── hooks/          # useToast, useDebounce, useProducts, useTransactions
├── components/     # AppShell, BottomNav, Toast, Modal, EmptyState
├── index.css       # Tailwind base styles
└── main.tsx        # React entry point
```

### ✅ Dependencies Installed
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Dexie 4** - IndexedDB wrapper (offline-first)
- **Zustand** - State management
- **Zod** - Schema validation
- **Tailwind CSS** - Styling
- **Vite** - Build tool
- **PWA Plugin** - Offline support

### ✅ Core Features Ready
1. **Type System** - Fully typed data models (Product, Transaction, Customer, Settings)
2. **Database Layer** - Dexie with v1 → v2 migration support
3. **State Management** - Zustand stores with proper selectors
4. **UI Components** - AppShell, BottomNav navigation, Toast, Modal, EmptyState
5. **Utilities** - Currency formatting, date helpers, ID generation
6. **Hooks** - useToast, useProducts, useTransactions with Dexie integration

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Type check
npm run type-check

# Production build
npm run build
```

### Akses App
- Local: http://localhost:5173
- PWA install: Buka browser menu → "Install app"

---

## 📋 Next Steps - PHASE 1 (Inventory)

Setelah PHASE 0 selesai, mulai implementasi **Service Layer** untuk inventory:

### Akan di-push:
1. **`src/features/inventory/productService.ts`**
   - CRUD operations dengan Zod validation
   - `createProduct()`, `updateProduct()`, `softDeleteProduct()`
   - `adjustStock()` dengan reason tracking
   - `importProducts()` (merge/replace/reset modes)

2. **`src/features/inventory/ProductList.tsx`**
   - List produk dengan search + filter
   - Edit/Delete actions
   - Add new product button

3. **`src/features/inventory/ProductForm.tsx`**
   - Form untuk tambah/edit produk
   - Validation errors display
   - Barcode input

4. **`src/features/inventory/useProductForm.ts`** (hook)
   - Form state management
   - Submit handler dengan error handling

### Deliverable PHASE 1
✅ **Bisa manage produk sepenuhnya** - add, edit, delete, import, search

---

## 🔐 Design Principles

✨ **Setiap layer ada tanggung jawab jelas:**

- **Types** (`src/types/`) - Contract data, tidak ada logic
- **Utils** (`src/utils/`) - Pure functions, zero side effects
- **Services** (`src/features/*/`) - Business logic + DB access
- **Store** (`src/store/`) - Global state, no service imports
- **Hooks** (`src/hooks/`) - Data queries + component logic
- **Components** - UI only, logic di hooks/services

✨ **Data integrity > UX polish**
- Atomic transactions di checkout
- voidReason WAJIB diisi setiap void transaksi
- Stock snapshot di CartItem (tidak bisa berubah mid-transaction)

✨ **Solo developer friendly**
- Flat folder structure (mudah navigate di Termux)
- Satu file per service (tidak perlu banyak imports)
- useLiveQuery untuk reactive data (tanpa event emit)

---

## 📝 Notes

### Why `kasirpromax_v2` DB name?
DB lama (vanilla IndexedDB) pakai nama `kasirpromax`. Untuk avoid migration risk, pakai DB baru dengan migration script yang run once saat startup. Lebih predictable.

### Why tidak ada `src/features/pos/` di PHASE 0?
POS depends on products (dari inventory). PHASE 1 dulu biar inventory selesai, baru PHASE 2 untuk POS + checkout.

### Why Dexie instead of pure IndexedDB?
- Type-safe queries dengan TypeScript
- Live reactive queries (`useLiveQuery`)
- Better migration support
- Atomic transactions

### Why Zustand instead of Redux/Context?
- Solo developer: minimal boilerplate
- Selectors yang benar-benar work (tidak perlu reselect)
- Middleware support for persist

---

## 🔗 Resources

- **Blueprint Document:** [kasirpromax-refactor-blueprint-v2.md](./BLUEPRINT.md)
- **Branch:** `feat/v2-refactor`
- **Target:** Production-grade offline POS untuk warung kecil

---

**Siap untuk PHASE 1? Bilang "Gas" dan aku push Inventory Service Layer! 🚀**
