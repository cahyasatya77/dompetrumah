-- =============================================================
-- DompetRumah - Migration Fase 3 (Laporan & dashboard)
-- Tabel: opening_balances
-- View : v_rekap_bulanan, v_rekap_kategori
-- Jalankan SETELAH 0002_transaksi.sql
-- =============================================================

-- -------------------------------------------------------------
-- 1. Saldo awal (anggaran) per bulan
--    periode selalu disimpan sebagai tanggal 1 bulan tersebut.
-- -------------------------------------------------------------
create table if not exists public.opening_balances (
  id              uuid primary key default gen_random_uuid(),
  periode         date not null unique,
  saldo_awal      numeric(14, 2) not null check (saldo_awal >= 0),
  catatan         text,
  diisi_oleh      uuid references public.profiles (id) on delete set null,
  dibuat_pada     timestamptz not null default now(),
  diperbarui_pada timestamptz not null default now(),
  constraint periode_awal_bulan check (date_trunc('month', periode) = periode)
);

drop trigger if exists trg_saldo_diperbarui on public.opening_balances;
create trigger trg_saldo_diperbarui
  before update on public.opening_balances
  for each row execute function public.set_diperbarui_pada();

-- Pengisi selalu diri sendiri, dan periode dibulatkan ke awal bulan
-- supaya "Oktober" selalu satu baris, bukan satu baris per tanggal.
create or replace function public.paksa_aturan_saldo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.periode := date_trunc('month', new.periode)::date;

  if auth.uid() is not null then
    new.diisi_oleh := coalesce(public.profile_id_saya(), new.diisi_oleh);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_saldo_aturan on public.opening_balances;
create trigger trg_saldo_aturan
  before insert or update on public.opening_balances
  for each row execute function public.paksa_aturan_saldo();

alter table public.opening_balances enable row level security;

drop policy if exists saldo_select on public.opening_balances;
create policy saldo_select on public.opening_balances
  for select to authenticated
  using (public.aktif_saya());

drop policy if exists saldo_tulis on public.opening_balances;
create policy saldo_tulis on public.opening_balances
  for all to authenticated
  using (public.role_saya() in ('supervisor', 'admin'))
  with check (public.role_saya() in ('supervisor', 'admin'));

-- -------------------------------------------------------------
-- 2. View rekap
--    security_invoker = on supaya RLS tabel expenses tetap berlaku
--    bagi siapa pun yang membaca view ini.
-- -------------------------------------------------------------
create or replace view public.v_rekap_bulanan
with (security_invoker = on) as
select
  date_trunc('month', e.tanggal)::date as periode,
  sum(e.total)                         as total,
  count(*)                             as jumlah_transaksi
from public.expenses e
where e.status = 'aktif'
  and e.dihapus_pada is null
group by 1;

create or replace view public.v_rekap_kategori
with (security_invoker = on) as
select
  date_trunc('month', e.tanggal)::date as periode,
  e.category_id,
  c.nama                               as kategori,
  sum(e.total)                         as total,
  count(*)                             as jumlah_transaksi
from public.expenses e
join public.categories c on c.id = e.category_id
where e.status = 'aktif'
  and e.dihapus_pada is null
group by 1, 2, 3;

grant select on public.v_rekap_bulanan  to authenticated;
grant select on public.v_rekap_kategori to authenticated;
