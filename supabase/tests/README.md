# Uji Row Level Security

Skrip ini memeriksa bahwa policy RLS benar-benar menutup akses yang seharusnya
tertutup. Dijalankan di PostgreSQL lokal, tanpa perlu menyentuh project Supabase
Anda.

## Cara menjalankan

Butuh PostgreSQL 14+ terpasang di komputer Anda.

```bash
# 1. Siapkan database kosong
createdb uji_dompetrumah

# 2. Tiruan lingkungan Supabase (schema auth, role anon/authenticated)
psql -d uji_dompetrumah -f supabase/tests/00_stub_supabase.sql

# 3. Migration yang sebenarnya
psql -d uji_dompetrumah -f supabase/migrations/0001_fondasi.sql
psql -d uji_dompetrumah -f supabase/migrations/0002_transaksi.sql

# 4. Data uji
psql -d uji_dompetrumah -c "
insert into auth.users (id,email) values
 ('11111111-1111-1111-1111-111111111111','admin@contoh.com'),
 ('22222222-2222-2222-2222-222222222222','spv@contoh.com'),
 ('33333333-3333-3333-3333-333333333333','user@contoh.com'),
 ('44444444-4444-4444-4444-444444444444','mati@contoh.com');
insert into public.profiles (user_id,email,nama,role,aktif) values
 ('11111111-1111-1111-1111-111111111111','admin@contoh.com','Admin','admin',true),
 ('22222222-2222-2222-2222-222222222222','spv@contoh.com','Spv','supervisor',true),
 ('33333333-3333-3333-3333-333333333333','user@contoh.com','User','user',true),
 ('44444444-4444-4444-4444-444444444444','mati@contoh.com','Mati','user',false);
insert into public.audit_logs (aksi,tabel,aktor_email) values ('login','auth','admin@contoh.com');"

# 5. Jalankan pengujian
psql -d uji_dompetrumah -f supabase/tests/01_uji_rls.sql
psql -d uji_dompetrumah -f supabase/tests/02_uji_transaksi.sql
psql -d uji_dompetrumah -f supabase/tests/03_uji_alur_approval.sql
```

## Hasil yang diharapkan

| Peran | Harapan |
| --- | --- |
| Admin | boleh semua |
| Supervisor | kategori boleh; tambah pengguna **ditolak**; audit log 0 baris |
| User | kategori hanya baca; tambah kategori **ditolak**; naikkan role sendiri 0 baris; audit log 0 baris |
| User nonaktif | kategori 0 baris; hanya melihat barisnya sendiri di profiles; tulis audit **ditolak** |
| Belum login (anon) | 0 baris di semua tabel |
| Siapa pun | UPDATE / DELETE pada `audit_logs` **ditolak** |

> "0 baris" adalah hasil yang benar: pada SELECT, RLS menyaring baris secara
> diam-diam, bukan memunculkan error.

Pengujian terpisah yang juga sudah lolos: pengguna biasa yang mencoba menulis
audit log atas nama admin akan tetap tercatat dengan emailnya sendiri, karena
kolom aktor ditimpa oleh trigger `trg_audit_aktor`.

## 02 — transaksi dan approval (Fase 2)

| Yang diuji | Harapan |
| --- | --- |
| User input Rp400.000 | status `aktif` |
| User input Rp600.000, memaksa status `aktif` | dipaksa jadi `pending` |
| User mencatat atas nama orang lain | pencatat dipaksa jadi dirinya sendiri |
| Supervisor input Rp900.000 | tetap `aktif`, tanpa approval |
| User mengubah transaksi | 0 baris (disaring RLS) |
| User menyetujui permintaannya sendiri | 0 baris |
| Request kedua untuk transaksi yang sama | **ditolak** unique index |
| User membaca notifikasi milik supervisor | 0 baris |

## 03 — alur approval ujung ke ujung (Fase 2)

Meniru langkah yang dijalankan server action saat supervisor menekan Setujui
atau Tolak, untuk memastikan RLS tidak menghalangi penerapan perubahan:
pencatatan pending menjadi aktif, usulan ubah tertulis ke transaksi, permintaan
hapus menjadi soft delete, pencatatan yang ditolak bertanda `ditolak`, dan total
hanya menjumlahkan transaksi berstatus `aktif`.
