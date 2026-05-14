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
