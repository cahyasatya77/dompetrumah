# DompetRumah

Aplikasi web pencatatan pengeluaran rumah tangga. Repo ini berisi **Fase 1 (Fondasi)**,
**Fase 2 (Transaksi inti)**, **Fase 3 (Laporan & dashboard)**, dan
**Fase 4 (Notifikasi & integrasi)**.

Semua layanan memakai tier gratis: Supabase (database + auth + storage) dan Vercel.

---

## Yang sudah jalan

**Fase 1 — Fondasi**

| Fitur | Status |
| --- | --- |
| Setup Next.js 16 (App Router) + TypeScript + Tailwind v4 | Selesai |
| Login Google lewat Supabase Auth, hanya email terdaftar | Selesai |
| Master pengguna & role (user / supervisor / admin) | Selesai |
| Master kategori (CRUD) + 13 kategori awal | Selesai |
| Layout responsif: sidebar desktop, bottom nav HP, mode gelap | Selesai |
| Audit log (admin) + Row Level Security | Selesai |

**Fase 2 — Transaksi inti**

| Fitur | Status |
| --- | --- |
| Input pengeluaran: nominal × kuantiti, satuan, total otomatis | Selesai |
| Lampiran struk JPG/PNG/PDF maks 5 MB, foto dikompres di browser | Selesai |
| Workflow approval untuk input user di atas Rp500.000 | Selesai |
| Permintaan ubah & hapus oleh user, wajib beralasan | Selesai |
| Halaman approval supervisor + perbandingan sebelum/sesudah | Selesai |
| Notifikasi in-app dengan badge belum dibaca | Selesai |
| Daftar transaksi dengan filter bulan, kategori, dan pencatat | Selesai |

**Fase 3 — Laporan & dashboard**

| Fitur | Status |
| --- | --- |
| Saldo awal (anggaran) per bulan, diisi supervisor & admin | Selesai |
| Laporan bulanan: saldo awal − pengeluaran = sisa | Selesai |
| Rincian per kategori + persentase | Selesai |
| Grafik perbandingan kategori dan tren 6 bulan | Selesai |
| Export Excel (.xlsx) dua sheet: ringkasan & rincian | Selesai |
| Cetak / simpan PDF lewat dialog cetak browser | Selesai |

**Fase 4 — Notifikasi & integrasi**

| Fitur | Status |
| --- | --- |
| Email approval lewat Gmail SMTP | Selesai |
| WhatsApp lewat modul yang bisa ganti provider (Fonnte / log) | Selesai |
| Reminder harian 21.00 WIB via Vercel Cron | Selesai |
| Log pengiriman email & WhatsApp (admin) | Selesai |
| Import kategori, pengguna, dan saldo awal dari Google Sheets | Selesai |
| Chat AI dan input lewat WhatsApp | Fase 5 |

### Hak akses yang sudah berlaku

| Aksi | User | Supervisor | Admin |
| --- | --- | --- | --- |
| Lihat dashboard, laporan & semua transaksi | Ya | Ya | Ya |
| Input pengeluaran | Ya* | Ya | Ya |
| Isi saldo awal bulanan | Tidak | Ya | Ya |
| Ubah / hapus transaksi | Request saja | Ya | Ya |
| Setujui / tolak request | Tidak | Ya | Ya |
| Kelola master kategori | Tidak | Ya | Ya |
| Hapus kategori permanen | Tidak | Tidak | Ya |
| Kelola pengguna & role | Tidak | Tidak | Ya |
| Import dari Google Sheets | Tidak | Tidak | Ya |
| Lihat audit log & log pengiriman | Tidak | Tidak | Ya |

\* Input user dengan total di atas Rp500.000 berstatus PENDING sampai disetujui
supervisor, dan belum dihitung dalam total pengeluaran.

### Cara kerja approval

Batas Rp500.000 dipaksakan di database lewat trigger `trg_expenses_aturan`,
bukan hanya di form. Mengakali tampilan tidak membuat transaksi lolos:
status tetap jadi `pending`. Hal yang sama berlaku untuk kolom pencatat —
selalu diisi dari sesi yang sedang login.

Aturan lain yang dijaga database: satu transaksi hanya boleh punya satu
permintaan yang menggantung, dan pengaju tidak bisa menyetujui permintaannya
sendiri.

Penghapusan memakai soft delete, sehingga data tetap ada untuk audit dan
laporan historis.

### Notifikasi dan reminder

Setiap notifikasi disimpan sebagai pesan in-app, lalu diteruskan ke email dan
WhatsApp. Pengiriman berjalan **setelah** respons dikirim ke pengguna
(memakai `after()` dari Next.js), jadi orang yang menekan Simpan tidak
menunggu koneksi SMTP. Hasil tiap pengiriman dicatat di tabel
`notification_deliveries` — kalau email gagal, kegagalannya terlihat, bukan
hilang di log.

Modul WhatsApp sengaja ditaruh di balik satu antarmuka (`src/lib/kirim/whatsapp.ts`).
Selama `WA_PROVIDER` belum diisi, pesan hanya dicatat ke konsol dan aplikasi
berjalan normal. Saat produksi nanti, tambahkan driver WhatsApp Cloud API resmi
di file itu — tidak ada kode pemanggil yang perlu diubah.

Reminder harian berjalan lewat Vercel Cron pada pukul 14.00 UTC = 21.00 WIB
(lihat `vercel.json`). Endpoint-nya memakai service role sehingga dilindungi
`CRON_SECRET`; tanpa header yang benar, permintaan ditolak 401. Satu orang
hanya bisa menerima satu reminder per hari — dijaga unique index di database,
bukan hanya oleh kode, sehingga cron yang terpanggil dua kali tidak mengirim
pesan ganda.

### Import dari Google Sheets

Sheet dibaca sebagai CSV publik, tanpa kredensial. Aplikasi hanya mau mengambil
alamat di `docs.google.com` — pembatasan ini penting, karena tanpa itu kolom
tautan bisa dipakai untuk menyuruh server memanggil alamat internal.

Setiap import selalu melewati pratinjau: tiap baris ditandai *baru*,
*diperbarui*, *lewati* (sudah ada), atau *galat* beserta alasannya. Hanya baris
baru dan yang diperbarui yang disimpan.

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
3. Ulangi untuk `supabase/migrations/0002_transaksi.sql` (sekaligus membuat
   bucket Storage privat `struk` untuk lampiran) lalu
   `supabase/migrations/0003_laporan.sql`, lalu
   `supabase/migrations/0004_notifikasi.sql`.
4. Buka `supabase/seed.sql`, **ganti email pada baris pertama dengan email Google
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

Untuk Fase 4, tambahkan juga (semuanya boleh dikosongkan dulu — aplikasi tetap
jalan, pesan hanya dicatat ke log server):

| Variabel | Dari mana |
| --- | --- |
| `GMAIL_USER` | alamat Gmail pengirim |
| `GMAIL_APP_PASSWORD` | App Password 16 huruf dari <https://myaccount.google.com/apppasswords> (butuh verifikasi 2 langkah aktif, **bukan** password Gmail biasa) |
| `WA_PROVIDER` | `log` selama belum pakai gateway, atau `fonnte` |
| `FONNTE_TOKEN` | token dari fonnte.com, hanya bila `WA_PROVIDER=fonnte` |
| `CRON_SECRET` | kata sandi acak buatan sendiri, untuk melindungi endpoint reminder |

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
5. Reminder harian aktif otomatis setelah deploy — Vercel membaca `vercel.json`.
   Pastikan `CRON_SECRET` sudah diisi di environment variables Vercel, kalau
   tidak endpoint-nya menolak semua panggilan.

Untuk menguji reminder tanpa menunggu pukul 21.00:

```bash
curl -H "Authorization: Bearer <CRON_SECRET>" http://localhost:3000/api/cron/reminder
```

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
      dashboard/                ringkasan, tren, transaksi terbaru
      laporan/                  laporan bulanan, saldo awal, grafik
      import/                   import Google Sheets (admin)
      pengeluaran/              daftar, catat baru, detail, request ubah/hapus
      approval/                 antrean persetujuan (supervisor & admin)
      notifikasi/               notifikasi in-app
      kategori/                 master kategori (supervisor & admin)
      pengguna/                 master pengguna (admin)
      audit/                    audit log (admin)
    cetak/laporan/              tampilan khusus cetak (tanpa sidebar)
    api/laporan/excel/          route export .xlsx
    api/cron/reminder/          endpoint reminder harian (Vercel Cron)
  components/                   AppShell, navigasi, tema, komponen UI
    chart/                      grafik kategori dan tren bulanan
  lib/
    auth.ts                     wajibProfil / wajibRole
    audit.ts                    penulisan audit log
    laporan.ts                  sumber tunggal angka laporan
    periode.ts                  olah periode "YYYY-MM"
    csv.ts                      pembaca CSV dan normalisasi tautan Sheets
    kirim/email.ts              pengirim email (Gmail SMTP)
    kirim/whatsapp.ts           pengirim WhatsApp (bisa ganti provider)
    notifikasi.ts               pengiriman notifikasi in-app
    kompres.ts                  kompresi foto struk di browser
    konstanta.ts                batas approval, bucket, batas ukuran file
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
| 5 | Chat AI untuk bertanya soal data, lalu input pengeluaran via WhatsApp |
