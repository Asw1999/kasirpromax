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
