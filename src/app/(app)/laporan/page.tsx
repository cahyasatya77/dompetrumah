import { Download, Printer } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { FormSaldo } from "@/app/(app)/laporan/form-saldo";
import { PilihBulan } from "@/app/(app)/laporan/pilih-bulan";
import { BarKategori } from "@/components/chart/bar-kategori";
import { KolomBulanan } from "@/components/chart/kolom-bulanan";
import { JudulHalaman } from "@/components/judul-halaman";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { punyaRole, wajibProfil } from "@/lib/auth";
import { ambilLaporan, daftarPeriode } from "@/lib/laporan";
import { bulanIni, labelBulan, periodeValid } from "@/lib/periode";
import { buatSupabaseServer } from "@/lib/supabase/server";
import type { OpeningBalance } from "@/lib/types";
import { formatRupiah } from "@/lib/utils";

export const metadata: Metadata = { title: "Laporan · DompetRumah" };

export default async function HalamanLaporan({
  searchParams,
}: {
  searchParams: Promise<{ bulan?: string }>;
}) {
  const profil = await wajibProfil();
  const { bulan } = await searchParams;
  const periode = periodeValid(bulan);

  const [laporan, pilihan] = await Promise.all([
    ambilLaporan(periode),
    daftarPeriode(bulanIni()),
  ]);

  const supabase = await buatSupabaseServer();
  const { data: saldo } = await supabase
    .from("opening_balances")
    .select("*")
    .eq("periode", `${periode}-01`)
    .maybeSingle<OpeningBalance>();

  const bisaIsiSaldo = punyaRole(profil.role, "supervisor");
  const adaSaldo = laporan.saldoAwal > 0;
  const terpakai = adaSaldo ? (laporan.total / laporan.saldoAwal) * 100 : 0;

  return (
    <>
      <JudulHalaman
        judul="Laporan Bulanan"
        deskripsi="Ringkasan pengeluaran dan sisa anggaran."
        aksi={<PilihBulan nilai={periode} pilihan={pilihan} />}
      />

      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          <Link href={`/cetak/laporan?bulan=${periode}`} target="_blank">
            <Button varian="outline" ukuran="sm">
              <Printer className="h-4 w-4" aria-hidden /> Cetak / simpan PDF
            </Button>
          </Link>
          <a href={`/api/laporan/excel?bulan=${periode}`}>
            <Button varian="outline" ukuran="sm">
              <Download className="h-4 w-4" aria-hidden /> Export Excel
            </Button>
          </a>
          {bisaIsiSaldo && <FormSaldo periode={periode} saldo={saldo ?? null} />}
        </div>

        {/* Angka utama */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Saldo awal</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {adaSaldo ? formatRupiah(laporan.saldoAwal) : "—"}
              </p>
              {!adaSaldo && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {bisaIsiSaldo
                    ? "Belum diisi untuk bulan ini."
                    : "Belum diisi supervisor."}
                </p>
              )}
              {laporan.catatanSaldo && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {laporan.catatanSaldo}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Total pengeluaran</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {formatRupiah(laporan.total)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {laporan.jumlahTransaksi} transaksi
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Sisa saldo</p>
              <p
                className={
                  "mt-1 text-2xl font-semibold tabular-nums " +
                  (adaSaldo && laporan.sisa < 0 ? "text-destructive" : "")
                }
              >
                {adaSaldo ? formatRupiah(laporan.sisa) : "—"}
              </p>
              {adaSaldo && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {laporan.sisa < 0
                    ? `Lewat anggaran ${formatRupiah(Math.abs(laporan.sisa))}`
                    : `${terpakai.toFixed(0)}% anggaran terpakai`}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Anggaran terpakai */}
        {adaSaldo && (
          <Card>
            <CardContent className="pt-4">
              <div className="mb-2 flex items-baseline justify-between text-sm">
                <span className="text-muted-foreground">Anggaran terpakai</span>
                <span className="font-medium tabular-nums">
                  {terpakai.toFixed(0)}%
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={
                    "h-full rounded-full transition-[width] duration-500 " +
                    (terpakai > 100 ? "bg-destructive" : "bg-primary")
                  }
                  style={{ width: `${Math.min(terpakai, 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Pengeluaran per kategori</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {labelBulan(periode)}, terbesar di atas.
              </p>
            </CardHeader>
            <CardContent>
              <BarKategori
                data={laporan.kategori.map((k) => ({
                  kategori: k.kategori,
                  total: Number(k.total),
                  jumlah_transaksi: Number(k.jumlah_transaksi),
                }))}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tren 6 bulan terakhir</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Total pengeluaran per bulan.
              </p>
            </CardHeader>
            <CardContent>
              <KolomBulanan data={laporan.tren} />
            </CardContent>
          </Card>
        </div>

        {/* Tabel rincian: sekaligus versi teks dari grafik di atas */}
        <Card>
          <CardHeader>
            <CardTitle>Rincian per kategori</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0 sm:px-0">
            {laporan.kategori.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground sm:px-5">
                Tidak ada pengeluaran pada {labelBulan(periode)}.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-y border-border text-left text-xs text-muted-foreground">
                      <th className="px-4 py-2 font-medium sm:px-5">Kategori</th>
                      <th className="px-4 py-2 text-right font-medium">Transaksi</th>
                      <th className="px-4 py-2 text-right font-medium">Total</th>
                      <th className="px-4 py-2 text-right font-medium sm:px-5">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {laporan.kategori.map((k) => (
                      <tr key={k.category_id} className="border-b border-border">
                        <td className="px-4 py-2 sm:px-5">{k.kategori}</td>
                        <td className="px-4 py-2 text-right tabular-nums">
                          {k.jumlah_transaksi}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums">
                          {formatRupiah(Number(k.total))}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums sm:px-5">
                          {laporan.total > 0
                            ? ((Number(k.total) / laporan.total) * 100)
                                .toFixed(1)
                                .replace(".", ",")
                            : "0"}
                          %
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-semibold">
                      <td className="px-4 py-2 sm:px-5">Total</td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {laporan.jumlahTransaksi}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {formatRupiah(laporan.total)}
                      </td>
                      <td className="px-4 py-2 text-right sm:px-5">100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
