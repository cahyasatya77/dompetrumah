-- =============================================================
-- DompetRumah - Migration Fase 1 (Fondasi)
-- Tabel: profiles, categories, units, audit_logs
-- Jalankan di Supabase SQL Editor (atau: supabase db push)
-- =============================================================

-- Ekstensi untuk gen_random_uuid()
create extension if not exists pgcrypto;

-- -------------------------------------------------------------
-- 1. ENUM role pengguna
-- -------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('user', 'supervisor', 'admin');
  end if;
end
$$;

-- -------------------------------------------------------------
-- 2. Fungsi bantu: updated_at otomatis
-- -------------------------------------------------------------
create or replace function public.set_diperbarui_pada()
returns trigger
language plpgsql
as $$
begin
  new.diperbarui_pada = now();
  return new;
end;
$$;

-- -------------------------------------------------------------
-- 3. Tabel profiles (daftar pengguna yang boleh masuk)
--    Admin mendaftarkan email Google di sini SEBELUM user login.
--    user_id terisi otomatis saat user pertama kali login.
-- -------------------------------------------------------------
create table if not exists public.profiles (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid unique references auth.users (id) on delete set null,
  email           text not null,
  nama            text not null,
  role            public.user_role not null default 'user',
  aktif           boolean not null default true,
  no_wa           text,
  avatar_url      text,
  login_terakhir  timestamptz,
  dibuat_pada     timestamptz not null default now(),
  diperbarui_pada timestamptz not null default now()
);

-- Email unik tanpa membedakan huruf besar/kecil
create unique index if not exists profiles_email_unik
  on public.profiles (lower(email));

drop trigger if exists trg_profiles_diperbarui on public.profiles;
create trigger trg_profiles_diperbarui
  before update on public.profiles
  for each row execute function public.set_diperbarui_pada();

-- -------------------------------------------------------------
-- 4. Tabel categories (master kategori pengeluaran)
-- -------------------------------------------------------------
create table if not exists public.categories (
  id              uuid primary key default gen_random_uuid(),
  nama            text not null,
  deskripsi       text,
  aktif           boolean not null default true,
  dibuat_oleh     uuid references public.profiles (id) on delete set null,
  dibuat_pada     timestamptz not null default now(),
  diperbarui_pada timestamptz not null default now()
);

create unique index if not exists categories_nama_unik
  on public.categories (lower(nama));

drop trigger if exists trg_categories_diperbarui on public.categories;
create trigger trg_categories_diperbarui
  before update on public.categories
  for each row execute function public.set_diperbarui_pada();

-- -------------------------------------------------------------
-- 5. Tabel units (master satuan: pcs, kg, liter, ...)
--    Dipakai mulai Fase 2 pada form input pengeluaran.
-- -------------------------------------------------------------
create table if not exists public.units (
  id              uuid primary key default gen_random_uuid(),
  nama            text not null,
  aktif           boolean not null default true,
  dibuat_pada     timestamptz not null default now(),
  diperbarui_pada timestamptz not null default now()
);

create unique index if not exists units_nama_unik
  on public.units (lower(nama));

drop trigger if exists trg_units_diperbarui on public.units;
create trigger trg_units_diperbarui
  before update on public.units
  for each row execute function public.set_diperbarui_pada();

-- -------------------------------------------------------------
-- 6. Tabel audit_logs (tidak bisa diubah / dihapus)
-- -------------------------------------------------------------
create table if not exists public.audit_logs (
  id               bigint generated always as identity primary key,
  aktor_profile_id uuid references public.profiles (id) on delete set null,
  aktor_email      text,
  aksi             text not null,   -- create | update | delete | login | activate | deactivate | role_change
  tabel            text not null,
  record_id        text,
  data_sebelum     jsonb,
  data_sesudah     jsonb,
  catatan          text,
  dibuat_pada      timestamptz not null default now()
);

create index if not exists audit_logs_dibuat_pada_idx
  on public.audit_logs (dibuat_pada desc);
create index if not exists audit_logs_tabel_idx
  on public.audit_logs (tabel);

-- Blokir UPDATE/DELETE pada audit_logs (berlaku juga untuk service role)
create or replace function public.tolak_ubah_audit()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_logs bersifat permanen: tidak boleh diubah atau dihapus';
end;
$$;

drop trigger if exists trg_audit_immutable on public.audit_logs;
create trigger trg_audit_immutable
  before update or delete on public.audit_logs
  for each row execute function public.tolak_ubah_audit();

-- Paksa kolom aktor diisi dari sesi yang sedang login, supaya pengguna tidak
-- bisa menulis log atas nama orang lain. Service role (auth.uid() kosong)
-- tetap boleh mengisi sendiri; dipakai saat mencatat login.
create or replace function public.isi_aktor_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  p_id    uuid;
  p_email text;
begin
  select id, email into p_id, p_email
  from public.profiles
  where user_id = auth.uid()
  limit 1;

  if p_id is not null then
    new.aktor_profile_id := p_id;
    new.aktor_email := p_email;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_audit_aktor on public.audit_logs;
create trigger trg_audit_aktor
  before insert on public.audit_logs
  for each row execute function public.isi_aktor_audit();

-- -------------------------------------------------------------
-- 7. Fungsi bantu untuk RLS
--    SECURITY DEFINER supaya tidak terjadi rekursi policy di profiles.
-- -------------------------------------------------------------
create or replace function public.profil_saya()
returns public.profiles
language sql
stable
security definer
set search_path = public
as $$
  select p.* from public.profiles p where p.user_id = auth.uid() limit 1;
$$;

create or replace function public.role_saya()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select p.role from public.profiles p
  where p.user_id = auth.uid() and p.aktif limit 1;
$$;

create or replace function public.aktif_saya()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.aktif from public.profiles p where p.user_id = auth.uid() limit 1),
    false
  );
$$;

create or replace function public.profile_id_saya()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id from public.profiles p
  where p.user_id = auth.uid() and p.aktif limit 1;
$$;

grant execute on function public.profil_saya()      to authenticated;
grant execute on function public.role_saya()        to authenticated;
grant execute on function public.aktif_saya()       to authenticated;
grant execute on function public.profile_id_saya()  to authenticated;

-- -------------------------------------------------------------
-- 8. Row Level Security
-- -------------------------------------------------------------
alter table public.profiles   enable row level security;
alter table public.categories enable row level security;
alter table public.units      enable row level security;
alter table public.audit_logs enable row level security;

-- --- profiles ---
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (user_id = auth.uid() or public.aktif_saya());

drop policy if exists profiles_insert_admin on public.profiles;
create policy profiles_insert_admin on public.profiles
  for insert to authenticated
  with check (public.role_saya() = 'admin');

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles
  for update to authenticated
  using (public.role_saya() = 'admin')
  with check (public.role_saya() = 'admin');

drop policy if exists profiles_delete_admin on public.profiles;
create policy profiles_delete_admin on public.profiles
  for delete to authenticated
  using (public.role_saya() = 'admin' and user_id is distinct from auth.uid());

-- --- categories ---
drop policy if exists categories_select on public.categories;
create policy categories_select on public.categories
  for select to authenticated
  using (public.aktif_saya());

drop policy if exists categories_tulis on public.categories;
create policy categories_tulis on public.categories
  for all to authenticated
  using (public.role_saya() in ('supervisor', 'admin'))
  with check (public.role_saya() in ('supervisor', 'admin'));

-- --- units ---
drop policy if exists units_select on public.units;
create policy units_select on public.units
  for select to authenticated
  using (public.aktif_saya());

drop policy if exists units_tulis on public.units;
create policy units_tulis on public.units
  for all to authenticated
  using (public.role_saya() in ('supervisor', 'admin'))
  with check (public.role_saya() in ('supervisor', 'admin'));

-- --- audit_logs: admin boleh baca, semua user aktif boleh menulis,
--     tidak ada policy update/delete sehingga otomatis ditolak.
drop policy if exists audit_select_admin on public.audit_logs;
create policy audit_select_admin on public.audit_logs
  for select to authenticated
  using (public.role_saya() = 'admin');

drop policy if exists audit_insert on public.audit_logs;
create policy audit_insert on public.audit_logs
  for insert to authenticated
  with check (public.aktif_saya());

-- -------------------------------------------------------------
-- 9. Seed master kategori (13 kategori awal) dan satuan
-- -------------------------------------------------------------
insert into public.categories (nama) values
  ('Belanja Mingguan'),
  ('Iuran Bulanan'),
  ('Wisata'),
  ('Parkir'),
  ('Bensin'),
  ('Jajan Makanan Minuman'),
  ('Perlengkapan Rumah'),
  ('Daging Seafood'),
  ('Perlengkapan Anak'),
  ('Skin Body Care'),
  ('Snack'),
  ('Untuk Istri'),
  ('Vegetable')
on conflict do nothing;

insert into public.units (nama) values
  ('pcs'), ('kg'), ('gram'), ('liter'), ('ml'),
  ('pack'), ('botol'), ('box'), ('porsi'), ('meter')
on conflict do nothing;
