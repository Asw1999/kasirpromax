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
