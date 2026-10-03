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

\echo ''
\echo '=== Sebagai ADMIN (harus boleh semua) ==='
begin;
set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select pg_temp.coba('select profiles ',  'select * from public.profiles');
select pg_temp.coba('insert kategori ',  $$insert into public.categories (nama) values ('Tes Admin')$$);
select pg_temp.coba('delete kategori ',  $$delete from public.categories where nama = 'Belanja Mingguan'$$);
select pg_temp.coba('insert profil   ',  $$insert into public.profiles (email,nama,role) values ('baru@contoh.com','Baru','user')$$);
select pg_temp.coba('select audit    ',  'select * from public.audit_logs');
select pg_temp.coba('insert audit    ',  $$insert into public.audit_logs (aksi,tabel) values ('create','categories')$$);
rollback;

\echo ''
\echo '=== Sebagai SUPERVISOR (kategori boleh, profil & audit tidak) ==='
begin;
set local role authenticated;
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select pg_temp.coba('select kategori ',  'select * from public.categories');
select pg_temp.coba('insert kategori ',  $$insert into public.categories (nama) values ('Tes Spv')$$);
select pg_temp.coba('update kategori ',  $$update public.categories set aktif = false where nama = 'Parkir'$$);
select pg_temp.coba('insert profil   ',  $$insert into public.profiles (email,nama,role) values ('x@contoh.com','X','user')$$);
select pg_temp.coba('naikkan role diri', $$update public.profiles set role = 'admin' where email = 'spv@contoh.com'$$);
select pg_temp.coba('select audit    ',  'select * from public.audit_logs');
rollback;

\echo ''
\echo '=== Sebagai USER biasa (baca saja) ==='
begin;
set local role authenticated;
set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
select pg_temp.coba('select kategori ',  'select * from public.categories');
select pg_temp.coba('insert kategori ',  $$insert into public.categories (nama) values ('Tes User')$$);
select pg_temp.coba('naikkan role diri', $$update public.profiles set role = 'admin' where email = 'user@contoh.com'$$);
select pg_temp.coba('select audit    ',  'select * from public.audit_logs');
select pg_temp.coba('insert audit    ',  $$insert into public.audit_logs (aksi,tabel) values ('login','auth')$$);
rollback;

\echo ''
\echo '=== Sebagai user NONAKTIF (harus tertutup) ==='
begin;
set local role authenticated;
set local request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';
select pg_temp.coba('select kategori ',  'select * from public.categories');
select pg_temp.coba('select profiles ',  'select * from public.profiles');
select pg_temp.coba('insert audit    ',  $$insert into public.audit_logs (aksi,tabel) values ('login','auth')$$);
rollback;

\echo ''
\echo '=== Tanpa login / anon ==='
begin;
set local role anon;
select pg_temp.coba('select kategori ',  'select * from public.categories');
select pg_temp.coba('select profiles ',  'select * from public.profiles');
rollback;

\echo ''
\echo '=== Audit log permanen (sebagai pemilik tabel) ==='
select pg_temp.coba('update audit    ',  $$update public.audit_logs set aksi = 'palsu'$$);
select pg_temp.coba('delete audit    ',  $$delete from public.audit_logs$$);
