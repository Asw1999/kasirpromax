// crypto.randomUUID() — built-in browser, collision-free
// Tidak perlu library, tidak perlu Date.now() trick
export function generateId(): string {
  return crypto.randomUUID();
}

export function shortId(id: string): string {
  return id.slice(-6).toUpperCase();
}
