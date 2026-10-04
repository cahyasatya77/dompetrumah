\pset format unaligned
\pset tuples_only on

-- Meniru langkah yang dijalankan server action saat supervisor menekan
-- Setujui, untuk memastikan RLS tidak menghalangi penerapan perubahan.

create or replace function pg_temp.kat(n text default null) returns uuid
language sql stable as $$
  select id from public.categories
  where n is null or nama = n
  order by nama limit 1
$$;

create or replace function pg_temp.prof(e text) returns uuid
language sql stable as $$ select id from public.profiles where email = e $$;

\echo ''
\echo '=== ALUR 1: pencatatan > batas, lalu DISETUJUI ==='
begin;
-- User mencatat Rp700.000 -> otomatis pending
set local role authenticated;
set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
insert into public.expenses (tanggal, category_id, nominal, kuantiti, keterangan, dicatat_oleh)
values ('2026-10-03', pg_temp.kat(), 700000, 1, 'alur1', pg_temp.prof('user@contoh.com'));
insert into public.approval_requests (jenis, expense_id, pemohon_id, alasan)
select 'create', id, pg_temp.prof('user@contoh.com'), 'Total melebihi batas'
from public.expenses where keterangan = 'alur1';
select 'sebelum: status=' || status from public.expenses where keterangan = 'alur1';

-- Supervisor menyetujui
reset role;
set local role authenticated;
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
update public.expenses set status = 'aktif' where keterangan = 'alur1';
update public.approval_requests set status = 'approved', catatan_peninjau = 'struk sudah dicek'
where alasan = 'Total melebihi batas';
select 'sesudah: status=' || status from public.expenses where keterangan = 'alur1';
select 'request: ' || status || ' oleh ' || (select nama from public.profiles where id = peninjau_id)
from public.approval_requests where alasan = 'Total melebihi batas';
rollback;

\echo ''
\echo '=== ALUR 2: permintaan UBAH, lalu disetujui ==='
begin;
set local role authenticated;
set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
insert into public.expenses (tanggal, category_id, nominal, kuantiti, keterangan, dicatat_oleh)
values ('2026-10-03', pg_temp.kat(), 50000, 2, 'alur2', pg_temp.prof('user@contoh.com'));
insert into public.approval_requests (jenis, expense_id, pemohon_id, alasan, perubahan, data_sebelum)
select 'update', id, pg_temp.prof('user@contoh.com'), 'salah ketik nominal',
       jsonb_build_object('nominal', 75000, 'kuantiti', 2, 'tanggal', '2026-10-03',
                          'category_id', pg_temp.kat(), 'keterangan', 'alur2'),
       jsonb_build_object('nominal', 50000)
from public.expenses where keterangan = 'alur2';
select 'sebelum: total=' || total from public.expenses where keterangan = 'alur2';

reset role;
set local role authenticated;
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
update public.expenses e
set nominal = (r.perubahan->>'nominal')::numeric,
    kuantiti = (r.perubahan->>'kuantiti')::numeric
from public.approval_requests r
where r.expense_id = e.id and r.alasan = 'salah ketik nominal';
update public.approval_requests set status = 'approved' where alasan = 'salah ketik nominal';
select 'sesudah: total=' || total from public.expenses where keterangan = 'alur2';
rollback;

\echo ''
\echo '=== ALUR 3: permintaan HAPUS, lalu disetujui (soft delete) ==='
begin;
set local role authenticated;
set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
insert into public.expenses (tanggal, category_id, nominal, kuantiti, keterangan, dicatat_oleh)
values ('2026-10-03', pg_temp.kat(), 30000, 1, 'alur3', pg_temp.prof('user@contoh.com'));
insert into public.approval_requests (jenis, expense_id, pemohon_id, alasan)
select 'delete', id, pg_temp.prof('user@contoh.com'), 'dobel input'
from public.expenses where keterangan = 'alur3';

reset role;
set local role authenticated;
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
update public.expenses set dihapus_pada = now(), dihapus_oleh = pg_temp.prof('spv@contoh.com')
where keterangan = 'alur3';
update public.approval_requests set status = 'approved' where alasan = 'dobel input';
select 'terhapus=' || (dihapus_pada is not null)::text ||
       ' masih ada barisnya=' || (count(*) > 0)::text
from public.expenses where keterangan = 'alur3' group by dihapus_pada;
rollback;

\echo ''
\echo '=== ALUR 4: pencatatan > batas, lalu DITOLAK ==='
begin;
set local role authenticated;
set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
insert into public.expenses (tanggal, category_id, nominal, kuantiti, keterangan, dicatat_oleh)
values ('2026-10-03', pg_temp.kat(), 800000, 1, 'alur4', pg_temp.prof('user@contoh.com'));
insert into public.approval_requests (jenis, expense_id, pemohon_id, alasan)
select 'create', id, pg_temp.prof('user@contoh.com'), 'Total melebihi batas'
from public.expenses where keterangan = 'alur4';

reset role;
set local role authenticated;
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
update public.expenses set status = 'ditolak' where keterangan = 'alur4';
update public.approval_requests set status = 'rejected', catatan_peninjau = 'tidak ada struk'
where alasan = 'Total melebihi batas';
select 'status transaksi=' || status from public.expenses where keterangan = 'alur4';
rollback;

\echo ''
\echo '=== Total yang dihitung hanya status aktif ==='
begin;
set local role authenticated;
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
insert into public.expenses (tanggal, category_id, nominal, kuantiti, keterangan, status, dicatat_oleh)
values ('2026-10-03', pg_temp.kat(), 100000, 1, 'hitung-aktif',  'aktif',   pg_temp.prof('spv@contoh.com')),
       ('2026-10-03', pg_temp.kat(), 900000, 1, 'hitung-pending','pending', pg_temp.prof('spv@contoh.com')),
       ('2026-10-03', pg_temp.kat(), 500000, 1, 'hitung-tolak',  'ditolak', pg_temp.prof('spv@contoh.com'));
select 'total aktif=' || coalesce(sum(total), 0)
from public.expenses
where status = 'aktif' and dihapus_pada is null and keterangan like 'hitung-%';
rollback;
