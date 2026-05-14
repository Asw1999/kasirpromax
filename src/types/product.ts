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
