\pset format unaligned
\pset tuples_only on

-- Memakai data uji yang sama dengan 01_uji_rls.sql
-- (admin / spv / user / mati sudah ada di public.profiles).

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
\echo '=== USER input di BAWAH batas (Rp400.000) -> harus langsung aktif ==='
begin;
set local role authenticated;
set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
insert into public.expenses (tanggal, category_id, nominal, kuantiti, keterangan, dicatat_oleh)
values ('2026-10-01', pg_temp.kat(), 200000, 2, 'uji kecil', pg_temp.prof('user@contoh.com'));
select 'status=' || status || ' total=' || total from public.expenses where keterangan = 'uji kecil';
rollback;

\echo ''
\echo '=== USER input di ATAS batas (Rp600.000) -> harus dipaksa pending ==='
begin;
set local role authenticated;
set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
insert into public.expenses (tanggal, category_id, nominal, kuantiti, keterangan, status, dicatat_oleh)
values ('2026-10-01', pg_temp.kat(), 300000, 2, 'uji besar', 'aktif', pg_temp.prof('user@contoh.com'));
select 'status=' || status || ' total=' || total from public.expenses where keterangan = 'uji besar';
rollback;

\echo ''
\echo '=== USER mencatat atas nama orang lain -> pencatat dipaksa jadi dirinya ==='
begin;
set local role authenticated;
set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
insert into public.expenses (tanggal, category_id, nominal, kuantiti, keterangan, dicatat_oleh)
values ('2026-10-01', pg_temp.kat(), 10000, 1, 'uji samaran', pg_temp.prof('admin@contoh.com'));
select 'dicatat_oleh=' || (select email from public.profiles p
  join public.expenses e on e.dicatat_oleh = p.id where e.keterangan = 'uji samaran');
rollback;

\echo ''
\echo '=== SUPERVISOR input Rp900.000 -> tetap aktif, tanpa approval ==='
begin;
set local role authenticated;
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
insert into public.expenses (tanggal, category_id, nominal, kuantiti, keterangan, dicatat_oleh)
values ('2026-10-01', pg_temp.kat(), 900000, 1, 'uji spv', pg_temp.prof('spv@contoh.com'));
select 'status=' || status from public.expenses where keterangan = 'uji spv';
rollback;

\echo ''
\echo '=== Siapa boleh mengubah transaksi ==='
begin;
set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
insert into public.expenses (tanggal, category_id, nominal, kuantiti, keterangan, dicatat_oleh)
values ('2026-10-02', pg_temp.kat(), 50000, 1, 'uji ubah', pg_temp.prof('admin@contoh.com'));
reset role;
set local role authenticated;
set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
select pg_temp.coba('user ubah transaksi ',
  $$update public.expenses set nominal = 1 where keterangan = 'uji ubah'$$);
select pg_temp.coba('user lihat transaksi ',
  $$select * from public.expenses where keterangan = 'uji ubah'$$);
reset role;
set local role authenticated;
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select pg_temp.coba('spv ubah transaksi  ',
  $$update public.expenses set nominal = 60000 where keterangan = 'uji ubah'$$);
rollback;

\echo ''
\echo '=== Approval request: pemohon dipaksa diri sendiri ==='
begin;
set local role authenticated;
set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
insert into public.expenses (tanggal, category_id, nominal, kuantiti, keterangan, dicatat_oleh)
values ('2026-10-02', pg_temp.kat(), 10000, 1, 'uji req', pg_temp.prof('user@contoh.com'));
insert into public.approval_requests (jenis, expense_id, pemohon_id, alasan)
select 'delete', id, pg_temp.prof('admin@contoh.com'), 'salah input'
from public.expenses where keterangan = 'uji req';
select 'pemohon=' || (select email from public.profiles p
  join public.approval_requests r on r.pemohon_id = p.id limit 1);
rollback;

\echo ''
\echo '=== Approval request: siapa boleh menyetujui ==='
begin;
set local role authenticated;
set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
insert into public.expenses (tanggal, category_id, nominal, kuantiti, keterangan, dicatat_oleh)
values ('2026-10-02', pg_temp.kat(), 10000, 1, 'uji approve', pg_temp.prof('user@contoh.com'));
insert into public.approval_requests (jenis, expense_id, pemohon_id, alasan)
select 'delete', id, pg_temp.prof('user@contoh.com'), 'salah input'
from public.expenses where keterangan = 'uji approve';
select pg_temp.coba('user setujui sendiri ',
  $$update public.approval_requests set status = 'approved' where alasan = 'salah input'$$);
reset role;
set local role authenticated;
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select pg_temp.coba('spv setujui          ',
  $$update public.approval_requests set status = 'approved' where alasan = 'salah input'$$);
rollback;

\echo ''
\echo '=== Satu transaksi hanya boleh punya satu request menggantung ==='
begin;
set local role authenticated;
set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
insert into public.expenses (tanggal, category_id, nominal, kuantiti, keterangan, dicatat_oleh)
values ('2026-10-02', pg_temp.kat(), 10000, 1, 'uji ganda', pg_temp.prof('user@contoh.com'));
insert into public.approval_requests (jenis, expense_id, pemohon_id, alasan)
select 'delete', id, pg_temp.prof('user@contoh.com'), 'req pertama'
from public.expenses where keterangan = 'uji ganda';
select pg_temp.coba('request kedua        ',
  $$insert into public.approval_requests (jenis, expense_id, pemohon_id, alasan)
    select 'update', id, public.profile_id_saya(), 'req kedua'
    from public.expenses where keterangan = 'uji ganda'$$);
rollback;

\echo ''
\echo '=== Notifikasi hanya terbaca oleh penerimanya ==='
begin;
set local role authenticated;
set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
insert into public.notifications (penerima_id, jenis, judul)
values (pg_temp.prof('spv@contoh.com'), 'request_baru', 'Ada request baru');
select pg_temp.coba('user baca notif spv  ', 'select * from public.notifications');
reset role;
set local role authenticated;
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select pg_temp.coba('spv baca notif-nya   ', 'select * from public.notifications');
rollback;
