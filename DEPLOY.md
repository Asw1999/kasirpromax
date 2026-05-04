# 🚀 Panduan Deploy KasirProMax ke Internet

Target: App bisa diakses dari HP manapun via internet.
Stack: **Railway** (hosting) + **Turso** (SQLite cloud) — keduanya gratis.

---

## STEP 1 — Setup Turso (database cloud)

1. Buka **https://turso.tech** → Sign up gratis (bisa pakai GitHub)

2. Install Turso CLI (opsional tapi lebih cepat):
   ```bash
   # macOS/Linux
   curl -sSfL https://get.tur.so/install.sh | bash

   # Atau lewat npm
   npm install -g @turso/cli
   ```

   Atau bisa lewat dashboard web saja di **https://app.turso.tech**

3. **Buat database:**
   ```bash
   turso db create kasirpromax --location sin  # Singapore, paling dekat
   ```
   Atau di dashboard: **New Database** → nama `kasirpromax` → region Singapore

4. **Ambil URL dan Token:**
   ```bash
   turso db show kasirpromax   # lihat URL
   turso db tokens create kasirpromax  # buat token
   ```
   Atau di dashboard: klik database → **Connect** → copy `libsql://...` URL dan token-nya

   Contoh:
   ```
   TURSO_URL=libsql://kasirpromax-johndoe.turso.io
   TURSO_TOKEN=eyJhbGci...panjang banget
   ```

---

## STEP 2 — Upload ke GitHub

1. Buka **https://github.com** → Login → **New repository**
2. Nama repo: `kasirpromax` → **Create repository** (boleh private)
3. Di terminal, masuk folder project:

```bash
cd /path/ke/folder/kasir

git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/USERNAME/kasirpromax.git
git push -u origin main
```

> ⚠️ Pastikan file `.env` **tidak ikut** ke GitHub (sudah ada di `.gitignore`)

---

## STEP 3 — Deploy ke Railway

1. Buka **https://railway.app** → Login dengan GitHub
2. Klik **"New Project"** → **"Deploy from GitHub repo"**
3. Pilih repo `kasirpromax` → klik **Deploy Now**

### Set environment variables di Railway:
Klik project → **Variables** → tambahkan:

| Key | Value |
|-----|-------|
| `TURSO_URL` | `libsql://kasirpromax-username.turso.io` |
| `TURSO_TOKEN` | Token panjang dari Turso |
| `API_TOKEN` | Token yang sama dengan di `frontend/js/config.js` |
| `FRONTEND_ORIGIN` | `*` |

4. Setelah deploy selesai, Railway kasih URL:
   ```
   https://kasirpromax-production.up.railway.app
   ```

---

## STEP 4 — Update config frontend

Buka `frontend/js/config.js`, pastikan:
```js
window.API_URL   = '';       // kosong = pakai host yang sama
window.API_TOKEN = 'TOKEN_YANG_SAMA_DENGAN_ENV_RAILWAY';
```

Commit & push:
```bash
git add frontend/js/config.js
git commit -m "Update token for production"
git push
```

Railway auto-redeploy setiap push. Tunggu ~1 menit → buka URL Railway di browser. Selesai! 🎉

---

## Biaya

| Service | Free Tier |
|---------|-----------|
| Turso | 500 DB, 1GB storage, 1 miliar row reads/bulan — gratis selamanya |
| Railway | $5 credit/bulan (cukup buat app kecil non-24/7) |

---

## Troubleshooting

**`TURSO_URL atau TURSO_TOKEN belum diset`**
→ Cek Railway Variables, pastikan key-nya persis `TURSO_URL` dan `TURSO_TOKEN`

**`401 Unauthorized`**
→ `API_TOKEN` di Railway Variables harus sama persis dengan `window.API_TOKEN` di `config.js`

**Data lama hilang setelah deploy**
→ Export dulu via fitur Export di app sebelum deploy, lalu Import setelah live.
