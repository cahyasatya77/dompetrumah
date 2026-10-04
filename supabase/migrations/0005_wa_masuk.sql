-- =============================================================
-- DompetRumah - Migration Fase 5 (Input via WhatsApp)
-- Tabel: wa_inbound_messages
-- Jalankan SETELAH 0004_notifikasi.sql
-- =============================================================

-- Setiap pesan masuk disimpan apa adanya, termasuk yang gagal diproses.
-- Kalau ada pengguna mengeluh "sudah saya kirim kok tidak masuk", jejaknya
-- bisa ditelusuri di sini.
create table if not exists public.wa_inbound_messages (
  id            uuid primary key default gen_random_uuid(),
  nomor         text not null,
  isi           text not null,
  profile_id    uuid references public.profiles (id) on delete set null,
  expense_id    uuid references public.expenses (id) on delete set null,
  status        text not null check (status in ('diproses', 'ditolak', 'diabaikan')),
  galat         text,
  balasan       text,
  mentah        jsonb,
  dibuat_pada   timestamptz not null default now()
);

create index if not exists wa_masuk_dibuat_idx
  on public.wa_inbound_messages (dibuat_pada desc);
create index if not exists wa_masuk_nomor_idx
  on public.wa_inbound_messages (nomor);

alter table public.wa_inbound_messages enable row level security;

-- Hanya admin yang perlu melihat log teknis ini.
-- Penulisan dilakukan webhook dengan service role, yang melewati RLS.
drop policy if exists wa_masuk_select_admin on public.wa_inbound_messages;
create policy wa_masuk_select_admin on public.wa_inbound_messages
  for select to authenticated
  using (public.role_saya() = 'admin');

-- Nomor WhatsApp harus unik supaya satu pesan masuk hanya cocok
-- dengan satu orang.
create unique index if not exists profiles_no_wa_unik
  on public.profiles (no_wa)
  where no_wa is not null;
