import { create } from 'zustand';
import type { CartItem, PaymentMethod } from '@/types';
import type { Product } from '@/types';
import { addItem, setQty, removeItem, clearItems } from '@/features/pos/cartService';

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

// ── Selectors — computed di luar store ────────────────────
// Pattern yang benar untuk Zustand: bukan getter di dalam create()
// Computed = selector function yang dipanggil di component

import { calcSubtotal, calcTotal, calcProfit, calcChange } from '@/features/pos/cartService';

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
