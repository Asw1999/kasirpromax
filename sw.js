// Service Worker - Kasir Warung Pro Max
// CACHE_NAME di-generate otomatis dari BUILD_TIMESTAMP yang di-inject saat build.
// Jika tidak ada (mode dev / file statis), fallback ke hash dari URL + tanggal deploy.
// Developer TIDAK perlu update manual — cukup bump BUILD_TIMESTAMP di index.html atau
// gunakan script build yang menggantinya otomatis.
const BUILD_TIMESTAMP = '__BUILD_TS__';
// Kalau BUILD_TIMESTAMP belum di-replace build script, pakai tanggal hari ini
// supaya cache tidak stuck dengan nama placeholder selamanya.
const CACHE_NAME = `kasir-pwa-${BUILD_TIMESTAMP === '__BUILD_TS__' ? new Date().toISOString().slice(0, 10) : BUILD_TIMESTAMP}`;

// Daftar semua aset yang perlu di-cache agar bisa offline
const ASSETS_TO_CACHE = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  // CDN assets - di-cache saat pertama kali diakses online
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://unpkg.com/html5-qrcode',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'
];

// ===== INSTALL EVENT =====
// Dipanggil saat service worker pertama kali terpasang
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching app shell...');
        // Cache file lokal dulu (pasti berhasil)
        return cache.addAll(['./index.html', './manifest.json'])
          .then(() => {
            // Cache CDN assets satu per satu, abaikan yang gagal
            return Promise.allSettled(
              ASSETS_TO_CACHE.slice(2).map(url => 
                cache.add(url).catch(err => console.warn('[SW] Failed to cache:', url, err))
              )
            );
          });
      })
      .then(() => {
        console.log('[SW] Installation complete — auto activating immediately.');
        return self.skipWaiting();
      })
  );
});

// ===== ACTIVATE EVENT =====
// Bersihkan cache lama saat service worker baru aktif
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Activated & old caches cleared!');
        // clients.claim() → picu controllerchange di init.js → page reload otomatis
        return self.clients.claim();
      })
  );
});

// ===== FETCH EVENT =====
// Strategi: Cache First, fallback ke Network
// Prioritaskan cache agar tetap cepat dan offline
self.addEventListener('fetch', (event) => {
  // Skip request non-GET
  if (event.request.method !== 'GET') return;

  // Jangan cache request ke API — data harus selalu fresh dari server
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/')) return;

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Kalau ada di cache, langsung pakai
        if (cachedResponse) {
          return cachedResponse;
        }

        // Kalau tidak ada di cache, ambil dari network
        return fetch(event.request)
          .then((networkResponse) => {
            // Cek apakah respons valid
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'error') {
              return networkResponse;
            }

            // Simpan ke cache untuk penggunaan berikutnya
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          })
          .catch(() => {
            // Kalau offline dan tidak ada cache, tampilkan halaman offline
            if (event.request.destination === 'document') {
              return caches.match('./index.html');
            }
          });
      })
  );
});

// ===== BACKGROUND SYNC =====
// (Opsional) untuk sinkronisasi data saat kembali online
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-transactions') {
    console.log('[SW] Background sync triggered');
  }
});

// ===== MESSAGE HANDLER =====
// Halaman bisa kirim { type: 'SKIP_WAITING' } agar SW baru langsung aktif
// tanpa perlu tutup semua tab. Berguna untuk tombol "Update Tersedia" di UI.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Received SKIP_WAITING — activating new SW immediately');
    self.skipWaiting();
  }
});
