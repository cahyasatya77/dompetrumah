\pset format unaligned
\pset tuples_only on

create or replace function pg_temp.coba(label text, sql text) returns void
language plpgsql as $$
declare n int;
begin
  execute sql;
  get diagnostics n = row_count;
  raise notice 'BOLEH  % (% baris)', label, n;
exception when others then
  raise notice 'TOLAK  % -> %', label, split_part(replace(sqlerrm, E'\n', ' '), '.', 1);
end; $$;

create or replace function pg_temp.kat() returns uuid
language sql stable as $$ select id from public.categories order by nama limit 1 $$;

create or replace function pg_temp.prof(e text) returns uuid
language sql stable as $$ select id from public.profiles where email = e $$;

\echo ''
\echo '=== Reminder tidak boleh dobel di hari yang sama ==='
begin;
set local role authenticated;
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
insert into public.notifications (penerima_id, jenis, judul)
values (pg_temp.prof('spv@contoh.com'), 'reminder_harian', 'Belum mencatat');
select pg_temp.coba('reminder kedua, orang sama',
  $$insert into public.notifications (penerima_id, jenis, judul)
    values (public.profile_id_saya(), 'reminder_harian', 'Belum mencatat lagi')$$);
select pg_temp.coba('notifikasi jenis lain tetap boleh',
  $$insert into public.notifications (penerima_id, jenis, judul)
    values (public.profile_id_saya(), 'request_baru', 'Ada request')$$);
rollback;

\echo ''
\echo '=== Log pengiriman: siapa boleh membaca ==='
begin;
set local role authenticated;
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select pg_temp.coba('spv menulis log  ',
  $$insert into public.notification_deliveries (penerima_id, kanal, tujuan, status)
    values (public.profile_id_saya(), 'email', 'spv@contoh.com', 'terkirim')$$);
select pg_temp.coba('spv membaca log  ', 'select * from public.notification_deliveries');
reset role;
set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select pg_temp.coba('admin membaca log', 'select * from public.notification_deliveries');
reset role;
set local role authenticated;
set local request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';
select pg_temp.coba('mati menulis log ',
  $$insert into public.notification_deliveries (penerima_id, kanal, tujuan, status)
    values (public.profile_id_saya(), 'email', 'x@contoh.com', 'terkirim')$$);
rollback;

\echo ''
\echo '=== Kanal dan status hanya menerima nilai yang dikenal ==='
begin;
set local role authenticated;
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select pg_temp.coba('kanal ngawur     ',
  $$insert into public.notification_deliveries (penerima_id, kanal, status)
    values (public.profile_id_saya(), 'merpati', 'terkirim')$$);
select pg_temp.coba('status ngawur    ',
  $$insert into public.notification_deliveries (penerima_id, kanal, status)
    values (public.profile_id_saya(), 'email', 'entahlah')$$);
rollback;

\echo ''
\echo '=== Siapa yang belum mencatat hari ini (logika reminder) ==='
begin;
set local role authenticated;
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
-- Hanya supervisor yang mencatat hari ini.
insert into public.expenses (tanggal, category_id, nominal, kuantiti, dicatat_oleh)
values (((now() at time zone 'Asia/Jakarta')::date), pg_temp.kat(), 25000, 1,
        pg_temp.prof('spv@contoh.com'));
-- Transaksi kemarin tidak boleh dihitung sebagai "sudah mencatat".
insert into public.expenses (tanggal, category_id, nominal, kuantiti, dicatat_oleh)
values (((now() at time zone 'Asia/Jakarta')::date - 1), pg_temp.kat(), 25000, 1,
        pg_temp.prof('admin@contoh.com'));
-- Transaksi yang dihapus juga tidak dihitung.
insert into public.expenses (tanggal, category_id, nominal, kuantiti, dicatat_oleh, dihapus_pada)
values (((now() at time zone 'Asia/Jakarta')::date), pg_temp.kat(), 25000, 1,
        pg_temp.prof('user@contoh.com'), now());

select 'perlu diingatkan: ' || string_agg(p.nama, ', ' order by p.nama)
from public.profiles p
where p.aktif
  and p.id not in (
    select e.dicatat_oleh from public.expenses e
    where e.tanggal = ((now() at time zone 'Asia/Jakarta')::date)
      and e.dihapus_pada is null
  );
rollback;
