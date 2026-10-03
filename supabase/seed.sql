-- =============================================================
-- DompetRumah - data awal untuk testing
-- Jalankan SETELAH 0001_fondasi.sql
--
-- PENTING: ganti alamat email di bawah dengan email Google Anda
-- sendiri. Baris pertama adalah akun admin yang Anda pakai untuk
-- login pertama kali.
-- =============================================================

insert into public.profiles (email, nama, role, aktif) values
  ('ganti.dengan.email.anda@gmail.com', 'Admin Keluarga', 'admin',      true),
  ('supervisor.keluarga@gmail.com',      'Supervisor',     'supervisor', true),
  ('anggota.keluarga@gmail.com',         'Anggota',        'user',       true)
on conflict do nothing;

-- Kategori dan satuan sudah ikut terisi di 0001_fondasi.sql.
-- Untuk memeriksa hasilnya:
--   select nama, role, aktif from public.profiles order by nama;
--   select nama, aktif from public.categories order by nama;
