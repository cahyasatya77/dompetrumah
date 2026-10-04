-- =============================================================
-- DompetRumah - Migration Fase 4 (Notifikasi & integrasi)
-- Tabel: notification_deliveries
-- Jalankan SETELAH 0003_laporan.sql
-- =============================================================

-- -------------------------------------------------------------
-- Catatan pengiriman email dan WhatsApp.
-- Tanpa ini, kegagalan kirim hanya terlihat di log server dan
-- akan luput dari perhatian.
-- -------------------------------------------------------------
create table if not exists public.notification_deliveries (
  id              uuid primary key default gen_random_uuid(),
  notification_id uuid references public.notifications (id) on delete set null,
  penerima_id     uuid references public.profiles (id) on delete set null,
  kanal           text not null check (kanal in ('email', 'whatsapp')),
  tujuan          text,
  status          text not null check (status in ('terkirim', 'gagal', 'dilewati')),
  galat           text,
  dibuat_pada     timestamptz not null default now()
);

create index if not exists kirim_dibuat_idx
  on public.notification_deliveries (dibuat_pada desc);
create index if not exists kirim_status_idx
  on public.notification_deliveries (status)
  where status = 'gagal';

alter table public.notification_deliveries enable row level security;

-- Hanya admin yang perlu melihat log teknis ini.
drop policy if exists kirim_select_admin on public.notification_deliveries;
create policy kirim_select_admin on public.notification_deliveries
  for select to authenticated
  using (public.role_saya() = 'admin');

-- Ditulis saat aksi approval berlangsung atas nama pengguna.
drop policy if exists kirim_insert on public.notification_deliveries;
create policy kirim_insert on public.notification_deliveries
  for insert to authenticated
  with check (public.aktif_saya());

-- -------------------------------------------------------------
-- Indeks pembantu: mencari siapa yang belum mencatat hari ini.
-- -------------------------------------------------------------
create index if not exists expenses_pencatat_tanggal_idx
  on public.expenses (dicatat_oleh, tanggal)
  where dihapus_pada is null;

-- Mencegah reminder ganda bila cron terpanggil dua kali pada hari yang sama.
create unique index if not exists notif_reminder_harian_unik
  on public.notifications (penerima_id, jenis, ((dibuat_pada at time zone 'Asia/Jakarta')::date))
  where jenis = 'reminder_harian';
