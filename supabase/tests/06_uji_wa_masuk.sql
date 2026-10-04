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
\echo '=== Nomor WhatsApp harus unik antar pengguna ==='
begin;
update public.profiles set no_wa = '628111111111' where email = 'spv@contoh.com';
select pg_temp.coba('nomor sama untuk orang lain',
  $$update public.profiles set no_wa = '628111111111' where email = 'user@contoh.com'$$);
select pg_temp.coba('nomor berbeda           ',
  $$update public.profiles set no_wa = '628222222222' where email = 'user@contoh.com'$$);
select pg_temp.coba('dua profil tanpa nomor  ',
  $$update public.profiles set no_wa = null where email in ('admin@contoh.com','mati@contoh.com')$$);
rollback;

\echo ''
\echo '=== Log pesan masuk hanya terbaca admin ==='
begin;
insert into public.wa_inbound_messages (nomor, isi, status)
values ('628111111111', '#catat|hari ini|Bensin|20000|1', 'diproses');

set local role authenticated;
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select pg_temp.coba('spv baca pesan masuk  ', 'select * from public.wa_inbound_messages');
reset role;

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select pg_temp.coba('admin baca pesan masuk', 'select * from public.wa_inbound_messages');
reset role;

set local role authenticated;
set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
select pg_temp.coba('user menulis pesan masuk',
  $$insert into public.wa_inbound_messages (nomor, isi, status)
    values ('628999999999', 'palsu', 'diproses')$$);
rollback;

\echo ''
\echo '=== Status pesan masuk hanya menerima nilai yang dikenal ==='
begin;
select pg_temp.coba('status ngawur         ',
  $$insert into public.wa_inbound_messages (nomor, isi, status)
    values ('628111111111', 'x', 'entahlah')$$);
rollback;
