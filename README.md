# KasirProMax v3 — Dengan Backend API

Versi ini menggantikan `localStorage` dengan **backend Express + SQLite** yang bisa dijalankan di Termux, VPS, atau free hosting.

---

## Struktur Folder

```
KasirProMax_v3/
├── backend/          ← Node.js Express API
│   ├── server.js
│   ├── database.js
│   ├── middleware/auth.js
│   ├── routes/
│   │   ├── products.js
│   │   ├── transactions.js
│   │   └── settings.js
│   ├── package.json
│   └── .env.example
└── frontend/         ← PWA (modifikasi dari v2)
    ├── index.html
    ├── js/
    │   ├── config.js   ← ⚙️ SET API URL & TOKEN DI SINI
    │   ├── api.js
    │   └── ...
    └── css/
```

---

## Cara Setup

### 1. Backend

```bash
# Masuk ke folder backend
cd backend

# Install dependencies
npm install

# Buat file .env dari template
cp .env.example .env

# Edit .env — wajib ganti API_TOKEN!
nano .env   # atau vim / notepad

# Jalankan server
npm start
```

**Isi `.env`:**
```
PORT=3000
API_TOKEN=token_rahasia_kamu_yang_panjang
DB_FILE=kasirpromax.db
FRONTEND_ORIGIN=*
```

> Generate token: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### 2. Frontend

Buka `frontend/js/config.js` dan sesuaikan:

```js
window.API_URL   = 'http://localhost:3000';      // URL backend
window.API_TOKEN = 'token_rahasia_kamu';          // Sama dengan .env
```

Lalu buka `frontend/index.html` di browser (atau serve pakai server statis).

---

## Deploy di Termux

```bash
# Install Node
pkg install nodejs

# Clone / copy folder ke HP
cd /sdcard/KasirProMax_v3/backend
npm install
npm start

# Backend jalan di http://localhost:3000
# Di frontend/js/config.js: API_URL = 'http://localhost:3000'
```

Kalau mau akses dari HP lain di WiFi yang sama:
1. Cari IP HP: `ip addr show wlan0`
2. Set `API_URL = 'http://192.168.x.x:3000'`

---

## Deploy di Railway / Render (Gratis)

1. Push folder `backend/` ke GitHub
2. Connect ke Railway/Render
3. Set environment variables: `PORT`, `API_TOKEN`, `DB_FILE`
4. Update `config.js` frontend dengan URL yang dikasih Railway

---

## API Endpoints

Semua endpoint butuh header: `x-api-token: <token>`

| Method | Path | Keterangan |
|--------|------|-----------|
| GET | `/health` | Cek status server (tanpa auth) |
| GET | `/api/products` | List semua produk |
| POST | `/api/products` | Tambah produk |
| PUT | `/api/products/:id` | Update produk |
| DELETE | `/api/products/:id` | Hapus produk |
| POST | `/api/products/import` | Import bulk produk |
| GET | `/api/transactions` | List semua transaksi |
| POST | `/api/transactions` | Simpan transaksi baru |
| PUT | `/api/transactions/:id` | Edit transaksi |
| DELETE | `/api/transactions/:id` | Hapus transaksi |
| GET | `/api/settings` | Ambil pengaturan toko |
| PUT | `/api/settings` | Simpan pengaturan toko |
