-- =============================================================
-- DompetRumah - Migration Fase 2 (Transaksi inti)
-- Tabel: expenses, expense_attachments, approval_requests, notifications
-- Plus bucket Storage privat "struk".
-- Jalankan SETELAH 0001_fondasi.sql
-- =============================================================

-- -------------------------------------------------------------
-- 1. ENUM
-- -------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'expense_status') then
    -- pending : menunggu persetujuan supervisor, belum dihitung
    -- aktif   : tercatat dan dihitung di laporan
    -- ditolak : pengajuan ditolak, disimpan sebagai jejak
    create type public.expense_status as enum ('pending', 'aktif', 'ditolak');
  end if;

  if not exists (select 1 from pg_type where typname = 'request_jenis') then
    create type public.request_jenis as enum ('create', 'update', 'delete');
  end if;

  if not exists (select 1 from pg_type where typname = 'request_status') then
    create type public.request_status as enum ('pending', 'approved', 'rejected');
  end if;
end
$$;

-- -------------------------------------------------------------
-- 2. Batas nominal yang wajib disetujui supervisor
--    Diletakkan sebagai fungsi agar aturan yang sama dipakai
--    oleh trigger database dan oleh kode aplikasi.
-- -------------------------------------------------------------
create or replace function public.batas_approval()
returns numeric
language sql
immutable
as $$
  select 500000::numeric;
$$;

grant execute on function public.batas_approval() to authenticated, anon;

-- -------------------------------------------------------------
-- 3. Tabel expenses
-- -------------------------------------------------------------
create table if not exists public.expenses (
  id              uuid primary key default gen_random_uuid(),
  tanggal         date not null,
  category_id     uuid not null references public.categories (id),
  keterangan      text,
  nominal         numeric(14, 2) not null check (nominal >= 0),   -- harga satuan
  kuantiti        numeric(12, 3) not null check (kuantiti > 0),
  unit_id         uuid references public.units (id),
  total           numeric(14, 2)
                    generated always as (round(nominal * kuantiti, 2)) stored,
  status          public.expense_status not null default 'aktif',
  dicatat_oleh    uuid not null references public.profiles (id),
  dihapus_pada    timestamptz,                                    -- soft delete
  dihapus_oleh    uuid references public.profiles (id),
  dibuat_pada     timestamptz not null default now(),
  diperbarui_pada timestamptz not null default now()
);

create index if not exists expenses_tanggal_idx
  on public.expenses (tanggal desc);
create index if not exists expenses_kategori_idx
  on public.expenses (category_id);
create index if not exists expenses_pencatat_idx
  on public.expenses (dicatat_oleh);
create index if not exists expenses_status_idx
  on public.expenses (status) where dihapus_pada is null;

drop trigger if exists trg_expenses_diperbarui on public.expenses;
create trigger trg_expenses_diperbarui
  before update on public.expenses
  for each row execute function public.set_diperbarui_pada();

-- Aturan wajib yang tidak boleh bisa dilewati dari sisi klien:
-- pencatat selalu diri sendiri, dan input user di atas batas otomatis
-- berstatus pending.
create or replace function public.paksa_aturan_expense()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  role_aktor public.user_role;
  id_aktor   uuid;
begin
  if auth.uid() is null then
    return new;  -- service role / migration, biarkan apa adanya
  end if;

  role_aktor := public.role_saya();
  id_aktor := public.profile_id_saya();

  if tg_op = 'INSERT' then
    new.dicatat_oleh := coalesce(id_aktor, new.dicatat_oleh);

    if role_aktor = 'user' then
      if round(new.nominal * new.kuantiti, 2) > public.batas_approval() then
        new.status := 'pending';
      else
        new.status := 'aktif';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_expenses_aturan on public.expenses;
create trigger trg_expenses_aturan
  before insert on public.expenses
  for each row execute function public.paksa_aturan_expense();

-- -------------------------------------------------------------
-- 4. Tabel expense_attachments (metadata lampiran struk)
-- -------------------------------------------------------------
create table if not exists public.expense_attachments (
  id             uuid primary key default gen_random_uuid(),
  expense_id     uuid not null references public.expenses (id) on delete cascade,
  path           text not null unique,     -- path objek di bucket "struk"
  nama_file      text not null,
  mime           text not null,
  ukuran         integer not null check (ukuran > 0),
  diunggah_oleh  uuid references public.profiles (id),
  dibuat_pada    timestamptz not null default now()
);

create index if not exists lampiran_expense_idx
  on public.expense_attachments (expense_id);

-- -------------------------------------------------------------
-- 5. Tabel approval_requests
-- -------------------------------------------------------------
create table if not exists public.approval_requests (
  id               uuid primary key default gen_random_uuid(),
  jenis            public.request_jenis not null,
  expense_id       uuid references public.expenses (id) on delete cascade,
  pemohon_id       uuid not null references public.profiles (id),
  alasan           text,        -- wajib untuk update & delete
  perubahan        jsonb,       -- usulan nilai baru untuk jenis 'update'
  data_sebelum     jsonb,
  status           public.request_status not null default 'pending',
  peninjau_id      uuid references public.profiles (id),
  catatan_peninjau text,
  ditinjau_pada    timestamptz,
  dibuat_pada      timestamptz not null default now(),
  diperbarui_pada  timestamptz not null default now()
);

create index if not exists request_status_idx
  on public.approval_requests (status, dibuat_pada desc);
create index if not exists request_expense_idx
  on public.approval_requests (expense_id);

-- Satu transaksi hanya boleh punya satu request yang menggantung.
create unique index if not exists request_pending_unik
  on public.approval_requests (expense_id)
  where status = 'pending';

drop trigger if exists trg_request_diperbarui on public.approval_requests;
create trigger trg_request_diperbarui
  before update on public.approval_requests
  for each row execute function public.set_diperbarui_pada();

-- Pemohon selalu diri sendiri, dan peninjau tidak boleh dirinya sendiri.
create or replace function public.paksa_aturan_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.pemohon_id := coalesce(public.profile_id_saya(), new.pemohon_id);
    new.status := 'pending';
    new.peninjau_id := null;
    new.ditinjau_pada := null;
  end if;

  if tg_op = 'UPDATE' and new.status <> old.status then
    new.peninjau_id := public.profile_id_saya();
    new.ditinjau_pada := now();

    if new.peninjau_id = old.pemohon_id then
      raise exception 'Pengaju tidak boleh menyetujui permintaannya sendiri';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_request_aturan on public.approval_requests;
create trigger trg_request_aturan
  before insert or update on public.approval_requests
  for each row execute function public.paksa_aturan_request();

-- -------------------------------------------------------------
-- 6. Tabel notifications (in-app; email & WhatsApp menyusul Fase 4)
-- -------------------------------------------------------------
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  penerima_id uuid not null references public.profiles (id) on delete cascade,
  jenis       text not null,   -- request_baru | request_disetujui | request_ditolak
  judul       text not null,
  pesan       text,
  tautan      text,
  dibaca_pada timestamptz,
  dibuat_pada timestamptz not null default now()
);

create index if not exists notif_penerima_idx
  on public.notifications (penerima_id, dibuat_pada desc);
create index if not exists notif_belum_dibaca_idx
  on public.notifications (penerima_id) where dibaca_pada is null;

-- -------------------------------------------------------------
-- 7. Row Level Security
-- -------------------------------------------------------------
alter table public.expenses            enable row level security;
alter table public.expense_attachments enable row level security;
alter table public.approval_requests   enable row level security;
alter table public.notifications       enable row level security;

-- --- expenses: semua anggota aktif boleh melihat semua transaksi ---
drop policy if exists expenses_select on public.expenses;
create policy expenses_select on public.expenses
  for select to authenticated
  using (public.aktif_saya());

drop policy if exists expenses_insert on public.expenses;
create policy expenses_insert on public.expenses
  for insert to authenticated
  with check (
    public.aktif_saya()
    and dicatat_oleh = public.profile_id_saya()
  );

-- Mengubah transaksi hanya untuk supervisor & admin.
-- User biasa mengubah lewat approval_requests.
drop policy if exists expenses_update on public.expenses;
create policy expenses_update on public.expenses
  for update to authenticated
  using (public.role_saya() in ('supervisor', 'admin'))
  with check (public.role_saya() in ('supervisor', 'admin'));

-- Tidak ada policy DELETE: penghapusan selalu lewat soft delete.

-- --- expense_attachments ---
drop policy if exists lampiran_select on public.expense_attachments;
create policy lampiran_select on public.expense_attachments
  for select to authenticated
  using (public.aktif_saya());

drop policy if exists lampiran_insert on public.expense_attachments;
create policy lampiran_insert on public.expense_attachments
  for insert to authenticated
  with check (public.aktif_saya());

drop policy if exists lampiran_delete on public.expense_attachments;
create policy lampiran_delete on public.expense_attachments
  for delete to authenticated
  using (public.role_saya() in ('supervisor', 'admin'));

-- --- approval_requests ---
drop policy if exists request_select on public.approval_requests;
create policy request_select on public.approval_requests
  for select to authenticated
  using (public.aktif_saya());

drop policy if exists request_insert on public.approval_requests;
create policy request_insert on public.approval_requests
  for insert to authenticated
  with check (
    public.aktif_saya()
    and pemohon_id = public.profile_id_saya()
  );

drop policy if exists request_update on public.approval_requests;
create policy request_update on public.approval_requests
  for update to authenticated
  using (public.role_saya() in ('supervisor', 'admin'))
  with check (public.role_saya() in ('supervisor', 'admin'));

-- --- notifications: hanya penerimanya yang boleh membaca ---
drop policy if exists notif_select on public.notifications;
create policy notif_select on public.notifications
  for select to authenticated
  using (penerima_id = public.profile_id_saya());

drop policy if exists notif_insert on public.notifications;
create policy notif_insert on public.notifications
  for insert to authenticated
  with check (public.aktif_saya());

drop policy if exists notif_update on public.notifications;
create policy notif_update on public.notifications
  for update to authenticated
  using (penerima_id = public.profile_id_saya())
  with check (penerima_id = public.profile_id_saya());

-- -------------------------------------------------------------
-- 8. Storage: bucket privat "struk"
--    Dibungkus pengecekan schema agar file ini tetap bisa dijalankan
--    di PostgreSQL biasa saat menguji RLS secara lokal.
-- -------------------------------------------------------------
do $$
begin
  if not exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    raise notice 'Schema storage tidak ada (bukan Supabase) - bagian bucket dilewati';
    return;
  end if;

  execute $sql$
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('struk', 'struk', false, 5242880,
            array['image/jpeg','image/png','image/webp','application/pdf'])
    on conflict (id) do update
      set public = false,
          file_size_limit = 5242880,
          allowed_mime_types = array['image/jpeg','image/png','image/webp','application/pdf']
  $sql$;

  execute $sql$ drop policy if exists struk_baca on storage.objects $sql$;
  execute $sql$
    create policy struk_baca on storage.objects
      for select to authenticated
      using (bucket_id = 'struk' and public.aktif_saya())
  $sql$;

  execute $sql$ drop policy if exists struk_unggah on storage.objects $sql$;
  execute $sql$
    create policy struk_unggah on storage.objects
      for insert to authenticated
      with check (bucket_id = 'struk' and public.aktif_saya())
  $sql$;

  execute $sql$ drop policy if exists struk_hapus on storage.objects $sql$;
  execute $sql$
    create policy struk_hapus on storage.objects
      for delete to authenticated
      using (bucket_id = 'struk' and public.role_saya() in ('supervisor','admin'))
  $sql$;
end
$$;
