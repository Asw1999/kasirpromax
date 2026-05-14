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
