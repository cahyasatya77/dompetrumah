# DompetRumah

Aplikasi web pencatatan pengeluaran rumah tangga. Repo ini berisi **Fase 1 (Fondasi)**:
setup proyek, login Google, master pengguna & role, master kategori, layout responsif,
dan audit log.

Semua layanan memakai tier gratis: Supabase (database + auth) dan Vercel (hosting).

---

## Isi Fase 1

| Fitur | Status |
| --- | --- |
| Setup Next.js 16 (App Router) + TypeScript + Tailwind v4 | Selesai |
| Login Google lewat Supabase Auth, hanya email terdaftar | Selesai |
| Master pengguna & role (user / supervisor / admin) | Selesai |
| Aktifkan & nonaktifkan pengguna | Selesai |
| Master kategori (CRUD) + 13 kategori awal | Selesai |
| Layout responsif: sidebar desktop, bottom nav HP, mode gelap | Selesai |
| Audit log (admin) + Row Level Security | Selesai |
| Input pengeluaran, approval, laporan, notifikasi | Fase 2–5 |

### Hak akses yang sudah berlaku

| Aksi | User | Supervisor | Admin |
| --- | --- | --- | --- |
| Lihat dashboard | Ya | Ya | Ya |
| Kelola master kategori | Tidak | Ya | Ya |
| Hapus kategori permanen | Tidak | Tidak | Ya |
| Kelola pengguna & role | Tidak | Tidak | Ya |
| Lihat audit log | Tidak | Tidak | Ya |

---

## Langkah setup

### 1. Buat project Supabase

1. Buka [supabase.com](https://supabase.com), buat akun, lalu **New project**.
2. Isi nama project, password database (simpan baik-baik), pilih region
   **Southeast Asia (Singapore)** agar dekat dengan Indonesia.
3. Tunggu sampai project selesai dibuat (± 2 menit).

### 2. Jalankan migration

1. Di dashboard Supabase, buka menu **SQL Editor** → **New query**.
2. Salin seluruh isi `supabase/migrations/0001_fondasi.sql`, tempel, klik **Run**.
3. Buka `supabase/seed.sql`, **ganti email pada baris pertama dengan email Google
   Anda**, lalu jalankan juga di SQL Editor. Email ini menjadi akun admin pertama.

> Tanpa langkah seed ini tidak ada satu pun email yang boleh masuk, sehingga Anda
> akan selalu terdampar di halaman "Email belum terdaftar".

### 3. Aktifkan login Google

**a. Di Google Cloud Console** ([console.cloud.google.com](https://console.cloud.google.com)):

1. Buat project baru.
2. **APIs & Services → OAuth consent screen**: pilih **External**, isi nama aplikasi
   dan email Anda, simpan. Selama masih status *Testing*, tambahkan email keluarga
   di bagian **Test users**.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**
   - Authorized redirect URIs: isi dengan
     `https://<project-ref>.supabase.co/auth/v1/callback`
     (`<project-ref>` ada di URL dashboard Supabase Anda)
4. Salin **Client ID** dan **Client secret**.

**b. Di Supabase**: menu **Authentication → Sign In / Providers → Google**,
aktifkan, tempel Client ID dan Client secret, lalu **Save**.

**c. Di Supabase**: menu **Authentication → URL Configuration**:
- Site URL: `http://localhost:3000` (ganti ke URL Vercel setelah deploy)
- Redirect URLs: tambahkan `http://localhost:3000/auth/callback` dan
  `https://<nama-app>.vercel.app/auth/callback`

### 4. Isi variabel lingkungan

```bash
cp .env.example .env.local
```

Isi dari **Project Settings → API** di Supabase:

| Variabel | Dari mana |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon / public key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key (**rahasia**, server saja) |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` saat lokal |

### 5. Jalankan di lokal

```bash
npm install
npm run dev
```

Buka <http://localhost:3000>, klik **Masuk dengan Google**, pakai email yang tadi
Anda masukkan di `seed.sql`.

### 6. Deploy ke Vercel

1. Push repo ini ke GitHub.
2. Di [vercel.com](https://vercel.com) → **Add New → Project** → pilih repo ini.
3. Tambahkan keempat variabel lingkungan di atas (`NEXT_PUBLIC_SITE_URL` diisi URL
   Vercel, misalnya `https://dompetrumah.vercel.app`).
4. Deploy, lalu kembali ke Supabase **Authentication → URL Configuration** untuk
   menambahkan URL Vercel pada Site URL dan Redirect URLs.

---

## Cara kerja login

Login hanya lewat Google — tidak ada password aplikasi, jadi tidak ada fitur
"lupa password". Pengendalian akses dilakukan admin:

1. Admin mendaftarkan email Google seseorang di menu **Master Pengguna**.
2. Orang itu login dengan Google. Sistem mencocokkan emailnya dengan daftar.
3. Email tidak terdaftar atau berstatus nonaktif → ditolak dan sesi dihapus.
4. Admin bisa mengubah role atau menonaktifkan akun kapan saja.

Pengaman tambahan: sistem menolak permintaan yang akan membuat tidak ada lagi
admin aktif, dan admin tidak bisa menonaktifkan atau menurunkan role dirinya sendiri.

---

## Struktur folder

```
supabase/
  migrations/0001_fondasi.sql   skema tabel, RLS policy, seed kategori
  seed.sql                      data awal pengguna untuk testing
  tests/                        skrip uji RLS (lihat supabase/tests/README.md)
src/
  proxy.ts                      penyegaran sesi + proteksi rute (dulu middleware.ts)
  app/
    login/                      halaman masuk + tombol Google
    auth/callback/route.ts      callback OAuth + pengecekan daftar email
    auth/keluar/route.ts        logout
    akses-ditolak/              halaman penolakan
    (app)/                      halaman yang butuh login
      layout.tsx                cek profil aktif, bungkus AppShell
      dashboard/                ringkasan
      kategori/                 master kategori (supervisor & admin)
      pengguna/                 master pengguna (admin)
      audit/                    audit log (admin)
  components/                   AppShell, navigasi, tema, komponen UI
  lib/
    auth.ts                     wajibProfil / wajibRole
    audit.ts                    penulisan audit log
    validations.ts              skema zod
    supabase/                   klien server, browser, dan service role
```

---

## Catatan keamanan

- Row Level Security aktif pada semua tabel; policy memakai fungsi
  `role_saya()` dan `aktif_saya()`.
- `SUPABASE_SERVICE_ROLE_KEY` hanya dipakai di `src/app/auth/callback/route.ts`
  dan `src/lib/supabase/admin.ts`, tidak pernah dikirim ke browser.
- `audit_logs` punya dua trigger: satu menolak UPDATE dan DELETE (termasuk dari
  service role), satu lagi menimpa kolom aktor dengan identitas sesi yang login
  sehingga tidak bisa dipalsukan.
- Semua input form divalidasi ulang di server dengan zod.
- Policy RLS sudah diuji terhadap PostgreSQL asli; lihat `supabase/tests/`.

---

## Fase berikutnya

| Fase | Isi |
| --- | --- |
| 2 | Input pengeluaran, lampiran struk, workflow approval |
| 3 | Laporan bulanan + opening balance, export Excel/PDF, dashboard chart |
| 4 | Notifikasi email & WhatsApp, reminder 21.00 WIB, import Google Sheets |
| 5 | Chat AI, input pengeluaran via WhatsApp |
