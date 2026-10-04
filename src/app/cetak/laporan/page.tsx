import type { Metadata } from "next";

import { TombolCetak } from "@/app/cetak/laporan/tombol-cetak";
import { wajibProfil } from "@/lib/auth";
import { ambilLaporan } from "@/lib/laporan";
import { labelBulan, periodeValid } from "@/lib/periode";
import { formatRupiah, formatTanggal } from "@/lib/utils";

export const metadata: Metadata = { title: "Cetak Laporan · DompetRumah" };

/**
 * Tampilan laporan khusus cetak: tanpa sidebar, tanpa warna latar, hitam di
 * atas putih. Browser mengubahnya jadi PDF lewat dialog Print > Save as PDF.
 */
export default async function HalamanCetak({
  searchParams,
}: {
  searchParams: Promise<{ bulan?: string }>;
}) {
  const profil = await wajibProfil();
  const { bulan } = await searchParams;
  const periode = periodeValid(bulan);
  const laporan = await ambilLaporan(periode);
  const adaSaldo = laporan.saldoAwal > 0;

  return (
    <div className="min-h-dvh bg-white">
      {/* Margin kertas; Tailwind tidak bisa menulis aturan @page. */}
      <style>{"@page { margin: 16mm; size: A4; }"}</style>

      <main className="mx-auto max-w-3xl px-6 py-8 text-black print:px-0 print:py-0">
      <div className="mb-6 print:hidden">
        <TombolCetak />
        <p className="mt-2 text-sm text-neutral-600">
          Di dialog cetak, pilih tujuan <strong>Save as PDF</strong> untuk
          menyimpan sebagai berkas.
        </p>
      </div>

      <header className="mb-6 border-b border-neutral-300 pb-4">
        <h1 className="text-xl font-bold">Laporan Pengeluaran Rumah Tangga</h1>
        <p className="mt-1 text-sm text-neutral-600">
          DompetRumah · {labelBulan(periode)}
        </p>
        <p className="mt-0.5 text-xs text-neutral-500">
          Dicetak oleh {profil.nama} pada {formatTanggal(new Date())}
        </p>
      </header>

      <section className="mb-6">
        <table className="w-full text-sm">
          <tbody>
            <tr>
              <td className="py-1 text-neutral-600">Saldo awal</td>
              <td className="py-1 text-right font-medium tabular-nums">
                {adaSaldo ? formatRupiah(laporan.saldoAwal) : "—"}
              </td>
            </tr>
            <tr>
              <td className="py-1 text-neutral-600">Total pengeluaran</td>
              <td className="py-1 text-right font-medium tabular-nums">
                {formatRupiah(laporan.total)}
              </td>
            </tr>
            <tr className="border-t border-neutral-300">
              <td className="py-1 font-semibold">Sisa saldo</td>
              <td className="py-1 text-right font-bold tabular-nums">
                {adaSaldo ? formatRupiah(laporan.sisa) : "—"}
              </td>
            </tr>
          </tbody>
        </table>
        {laporan.catatanSaldo && (
          <p className="mt-2 text-xs text-neutral-600">
            Catatan saldo: {laporan.catatanSaldo}
          </p>
        )}
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-base font-semibold">Rekap per kategori</h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-y border-neutral-400 text-left">
              <th className="py-1.5 font-semibold">Kategori</th>
              <th className="py-1.5 text-right font-semibold">Transaksi</th>
              <th className="py-1.5 text-right font-semibold">Total</th>
              <th className="py-1.5 text-right font-semibold">%</th>
            </tr>
          </thead>
          <tbody>
            {laporan.kategori.map((k) => (
              <tr key={k.category_id} className="border-b border-neutral-200">
                <td className="py-1.5">{k.kategori}</td>
                <td className="py-1.5 text-right tabular-nums">
                  {k.jumlah_transaksi}
                </td>
                <td className="py-1.5 text-right tabular-nums">
                  {formatRupiah(Number(k.total))}
                </td>
                <td className="py-1.5 text-right tabular-nums">
                  {laporan.total > 0
                    ? ((Number(k.total) / laporan.total) * 100)
                        .toFixed(1)
                        .replace(".", ",")
                    : "0"}
                  %
                </td>
              </tr>
            ))}
            {laporan.kategori.length === 0 && (
              <tr>
                <td colSpan={4} className="py-4 text-center text-neutral-500">
                  Tidak ada pengeluaran pada bulan ini.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t border-neutral-400 font-semibold">
              <td className="py-1.5">Total</td>
              <td className="py-1.5 text-right tabular-nums">
                {laporan.jumlahTransaksi}
              </td>
              <td className="py-1.5 text-right tabular-nums">
                {formatRupiah(laporan.total)}
              </td>
              <td className="py-1.5 text-right">100%</td>
            </tr>
          </tfoot>
        </table>
      </section>

      <section className="break-before-page">
        <h2 className="mb-2 text-base font-semibold">Rincian transaksi</h2>
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-y border-neutral-400 text-left">
              <th className="py-1.5 font-semibold">Tanggal</th>
              <th className="py-1.5 font-semibold">Kategori</th>
              <th className="py-1.5 font-semibold">Keterangan</th>
              <th className="py-1.5 text-right font-semibold">Qty</th>
              <th className="py-1.5 text-right font-semibold">Total</th>
              <th className="py-1.5 font-semibold">Pencatat</th>
            </tr>
          </thead>
          <tbody>
            {laporan.transaksi.map((t) => (
              <tr
                key={t.id}
                className="border-b border-neutral-200 break-inside-avoid"
              >
                <td className="py-1.5 whitespace-nowrap">
                  {formatTanggal(t.tanggal)}
                </td>
                <td className="py-1.5">{t.categories?.nama ?? "—"}</td>
                <td className="py-1.5">{t.keterangan ?? ""}</td>
                <td className="py-1.5 text-right tabular-nums whitespace-nowrap">
                  {t.kuantiti}
                  {t.units?.nama ? ` ${t.units.nama}` : ""}
                </td>
                <td className="py-1.5 text-right tabular-nums whitespace-nowrap">
                  {formatRupiah(Number(t.total))}
                </td>
                <td className="py-1.5">{t.pencatat?.nama ?? "—"}</td>
              </tr>
            ))}
            {laporan.transaksi.length === 0 && (
              <tr>
                <td colSpan={6} className="py-4 text-center text-neutral-500">
                  Tidak ada transaksi.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <footer className="mt-8 border-t border-neutral-300 pt-3 text-xs text-neutral-500">
        Angka pada laporan ini hanya mencakup transaksi berstatus tercatat.
        Transaksi yang masih menunggu persetujuan dan yang ditolak tidak
        dihitung.
      </footer>
      </main>
    </div>
  );
}
