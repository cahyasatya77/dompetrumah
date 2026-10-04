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
\echo '=== Siapa boleh mengisi saldo awal ==='
begin;
set local role authenticated;
set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
select pg_temp.coba('user isi saldo   ',
  $$insert into public.opening_balances (periode, saldo_awal) values ('2026-10-01', 5000000)$$);
reset role;
set local role authenticated;
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select pg_temp.coba('spv isi saldo    ',
  $$insert into public.opening_balances (periode, saldo_awal) values ('2026-10-01', 5000000)$$);
select pg_temp.coba('user baca saldo  ', 'select * from public.opening_balances');
rollback;

\echo ''
\echo '=== Periode dibulatkan ke awal bulan ==='
begin;
set local role authenticated;
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
insert into public.opening_balances (periode, saldo_awal) values ('2026-10-17', 4000000);
select 'periode tersimpan=' || periode from public.opening_balances;
select pg_temp.coba('saldo kedua bulan sama',
  $$insert into public.opening_balances (periode, saldo_awal) values ('2026-10-02', 9000000)$$);
rollback;

\echo ''
\echo '=== View rekap: hanya menghitung transaksi aktif ==='
begin;
set local role authenticated;
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
insert into public.expenses (tanggal, category_id, nominal, kuantiti, keterangan, status, dicatat_oleh)
values ('2026-10-05', pg_temp.kat(), 100000, 1, 'r-aktif',   'aktif',   pg_temp.prof('spv@contoh.com')),
       ('2026-10-06', pg_temp.kat(), 900000, 1, 'r-pending', 'pending', pg_temp.prof('spv@contoh.com')),
       ('2026-10-07', pg_temp.kat(), 500000, 1, 'r-tolak',   'ditolak', pg_temp.prof('spv@contoh.com')),
       ('2026-09-05', pg_temp.kat(), 250000, 1, 'r-sept',    'aktif',   pg_temp.prof('spv@contoh.com'));
update public.expenses set dihapus_pada = now() where keterangan = 'r-aktif' and false;
select 'periode=' || periode || ' total=' || total || ' jumlah=' || jumlah_transaksi
from public.v_rekap_bulanan order by periode;
rollback;

\echo ''
\echo '=== View rekap: transaksi terhapus tidak ikut ==='
begin;
set local role authenticated;
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
insert into public.expenses (tanggal, category_id, nominal, kuantiti, keterangan, dicatat_oleh)
values ('2026-11-05', pg_temp.kat(), 300000, 1, 'r-hapus', pg_temp.prof('spv@contoh.com'));
select 'sebelum dihapus total=' || total from public.v_rekap_bulanan where periode = '2026-11-01';
update public.expenses set dihapus_pada = now() where keterangan = 'r-hapus';
select 'sesudah dihapus baris=' || count(*) from public.v_rekap_bulanan where periode = '2026-11-01';
rollback;

\echo ''
\echo '=== View rekap kategori ==='
begin;
set local role authenticated;
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
insert into public.expenses (tanggal, category_id, nominal, kuantiti, dicatat_oleh)
select '2026-10-05', id, 50000, 2, pg_temp.prof('spv@contoh.com')
from public.categories where nama in ('Bensin', 'Snack');
select kategori || '=' || total from public.v_rekap_kategori
where periode = '2026-10-01' order by kategori;
rollback;

\echo ''
\echo '=== View menghormati RLS: user nonaktif tidak melihat apa pun ==='
begin;
set local role authenticated;
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
insert into public.expenses (tanggal, category_id, nominal, kuantiti, dicatat_oleh)
values ('2026-10-05', pg_temp.kat(), 123000, 1, pg_temp.prof('spv@contoh.com'));
reset role;
set local role authenticated;
set local request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';
select pg_temp.coba('mati baca rekap  ', 'select * from public.v_rekap_bulanan');
reset role;
set local role anon;
select pg_temp.coba('anon baca rekap  ', 'select * from public.v_rekap_bulanan');
rollback;
