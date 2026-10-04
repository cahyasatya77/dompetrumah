import {
  awalBulan,
  awalBulanBerikutnya,
  deretBulan,
  mundurBulan,
} from "@/lib/periode";
import { buatSupabaseServer } from "@/lib/supabase/server";
import type {
  ExpenseLengkap,
  OpeningBalance,
  RekapBulanan,
  RekapKategori,
} from "@/lib/types";

export type TitikTren = {
  periode: string;
  total: number;
  jumlah_transaksi: number;
};

export type DataLaporan = {
  periode: string;
  saldoAwal: number;
  catatanSaldo: string | null;
  total: number;
  jumlahTransaksi: number;
  sisa: number;
  kategori: RekapKategori[];
  transaksi: ExpenseLengkap[];
  tren: TitikTren[];
};

const PILIH_TRANSAKSI =
  "*, categories(nama), units(nama), pencatat:profiles!expenses_dicatat_oleh_fkey(nama, email)";

/**
 * Mengumpulkan seluruh angka laporan satu bulan.
 * Dipakai bersama oleh halaman laporan, halaman cetak, dan export Excel
 * supaya ketiganya mustahil menampilkan angka yang berbeda.
 */
export async function ambilLaporan(
  periode: string,
  bulanTren = 6,
): Promise<DataLaporan> {
  const supabase = await buatSupabaseServer();
  const awal = awalBulan(periode);
  const akhir = awalBulanBerikutnya(periode);
  const awalTren = awalBulan(mundurBulan(periode, bulanTren - 1));

  const [{ data: saldo }, { data: kategori }, { data: transaksi }, { data: rekap }] =
    await Promise.all([
      supabase
        .from("opening_balances")
        .select("*")
        .eq("periode", awal)
        .maybeSingle<OpeningBalance>(),
      supabase
        .from("v_rekap_kategori")
        .select("*")
        .eq("periode", awal)
        .returns<RekapKategori[]>(),
      supabase
        .from("expenses")
        .select(PILIH_TRANSAKSI)
        .eq("status", "aktif")
        .is("dihapus_pada", null)
        .gte("tanggal", awal)
        .lt("tanggal", akhir)
        .order("tanggal")
        .returns<ExpenseLengkap[]>(),
      supabase
        .from("v_rekap_bulanan")
        .select("*")
        .gte("periode", awalTren)
        .lt("periode", akhir)
        .returns<RekapBulanan[]>(),
    ]);

  const baris = kategori ?? [];
  const total = baris.reduce((n, r) => n + Number(r.total), 0);
  const jumlahTransaksi = baris.reduce(
    (n, r) => n + Number(r.jumlah_transaksi),
    0,
  );
  const saldoAwal = Number(saldo?.saldo_awal ?? 0);

  // Bulan tanpa transaksi tetap muncul di grafik sebagai nol.
  const peta = new Map(
    (rekap ?? []).map((r) => [
      String(r.periode).slice(0, 7),
      { total: Number(r.total), jumlah: Number(r.jumlah_transaksi) },
    ]),
  );
  const tren: TitikTren[] = deretBulan(periode, bulanTren).map((ym) => ({
    periode: ym,
    total: peta.get(ym)?.total ?? 0,
    jumlah_transaksi: peta.get(ym)?.jumlah ?? 0,
  }));

  return {
    periode,
    saldoAwal,
    catatanSaldo: saldo?.catatan ?? null,
    total,
    jumlahTransaksi,
    sisa: saldoAwal - total,
    kategori: baris.sort((a, b) => Number(b.total) - Number(a.total)),
    transaksi: transaksi ?? [],
    tren,
  };
}

/** Daftar bulan yang punya data, plus bulan berjalan, untuk pemilih bulan. */
export async function daftarPeriode(bulanSekarang: string): Promise<string[]> {
  const supabase = await buatSupabaseServer();
  const { data } = await supabase
    .from("v_rekap_bulanan")
    .select("periode")
    .order("periode", { ascending: false })
    .limit(36)
    .returns<{ periode: string }[]>();

  const set = new Set<string>([bulanSekarang]);
  for (const r of data ?? []) set.add(String(r.periode).slice(0, 7));

  return [...set].sort().reverse();
}
