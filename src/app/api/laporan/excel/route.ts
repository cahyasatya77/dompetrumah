import ExcelJS from "exceljs";
import { NextResponse, type NextRequest } from "next/server";

import { ambilProfil } from "@/lib/auth";
import { ambilLaporan } from "@/lib/laporan";
import { labelBulan, periodeValid } from "@/lib/periode";

/**
 * Export laporan bulanan ke .xlsx.
 * Dua sheet: Ringkasan (per kategori) dan Rincian (per transaksi).
 */
export async function GET(request: NextRequest) {
  const profil = await ambilProfil();
  if (!profil || !profil.aktif) {
    return NextResponse.json({ pesan: "Tidak diizinkan" }, { status: 401 });
  }

  const periode = periodeValid(
    request.nextUrl.searchParams.get("bulan") ?? undefined,
  );
  const laporan = await ambilLaporan(periode);
  const nama = labelBulan(periode);

  const wb = new ExcelJS.Workbook();
  wb.creator = "DompetRumah";
  wb.created = new Date();

  const RUPIAH = '"Rp"#,##0;[Red]-"Rp"#,##0';
  const hijau = "FF127C6B";

  // --- Sheet 1: Ringkasan ---
  const s1 = wb.addWorksheet("Ringkasan");
  s1.columns = [
    { key: "a", width: 28 },
    { key: "b", width: 14 },
    { key: "c", width: 18 },
    { key: "d", width: 10 },
  ];

  s1.addRow(["Laporan Pengeluaran DompetRumah"]);
  s1.getRow(1).font = { bold: true, size: 14 };
  s1.addRow([nama]);
  s1.getRow(2).font = { color: { argb: "FF6B7280" } };
  s1.addRow([]);

  s1.addRow(["Saldo awal", "", laporan.saldoAwal]);
  s1.addRow(["Total pengeluaran", "", laporan.total]);
  s1.addRow(["Sisa saldo", "", laporan.sisa]);
  s1.addRow(["Jumlah transaksi", "", laporan.jumlahTransaksi]);
  for (let r = 4; r <= 6; r++) {
    s1.getRow(r).getCell(1).font = { bold: true };
    s1.getRow(r).getCell(3).numFmt = RUPIAH;
  }
  s1.getRow(7).getCell(1).font = { bold: true };
  s1.addRow([]);

  const barisJudul = s1.rowCount + 1;
  s1.addRow(["Kategori", "Transaksi", "Total", "%"]);
  const judul1 = s1.getRow(barisJudul);
  judul1.font = { bold: true, color: { argb: "FFFFFFFF" } };
  judul1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: hijau } };
  judul1.alignment = { vertical: "middle" };

  for (const k of laporan.kategori) {
    const total = Number(k.total);
    const baris = s1.addRow([
      k.kategori,
      Number(k.jumlah_transaksi),
      total,
      laporan.total > 0 ? total / laporan.total : 0,
    ]);
    baris.getCell(3).numFmt = RUPIAH;
    baris.getCell(4).numFmt = "0.0%";
  }

  const barisTotal = s1.addRow([
    "Total",
    laporan.jumlahTransaksi,
    laporan.total,
    laporan.total > 0 ? 1 : 0,
  ]);
  barisTotal.font = { bold: true };
  barisTotal.getCell(3).numFmt = RUPIAH;
  barisTotal.getCell(4).numFmt = "0.0%";

  // --- Sheet 2: Rincian transaksi ---
  const s2 = wb.addWorksheet("Rincian");
  s2.columns = [
    { header: "Tanggal", key: "tanggal", width: 12 },
    { header: "Kategori", key: "kategori", width: 24 },
    { header: "Keterangan", key: "keterangan", width: 34 },
    { header: "Harga satuan", key: "nominal", width: 16 },
    { header: "Kuantiti", key: "kuantiti", width: 10 },
    { header: "Satuan", key: "satuan", width: 10 },
    { header: "Total", key: "total", width: 16 },
    { header: "Dicatat oleh", key: "pencatat", width: 20 },
  ];

  const judul2 = s2.getRow(1);
  judul2.font = { bold: true, color: { argb: "FFFFFFFF" } };
  judul2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: hijau } };

  for (const t of laporan.transaksi) {
    const baris = s2.addRow({
      tanggal: t.tanggal,
      kategori: t.categories?.nama ?? "",
      keterangan: t.keterangan ?? "",
      nominal: Number(t.nominal),
      kuantiti: Number(t.kuantiti),
      satuan: t.units?.nama ?? "",
      total: Number(t.total),
      pencatat: t.pencatat?.nama ?? "",
    });
    baris.getCell("nominal").numFmt = RUPIAH;
    baris.getCell("total").numFmt = RUPIAH;
  }

  if (laporan.transaksi.length > 0) {
    const akhir = s2.addRow({ satuan: "Total", total: laporan.total });
    akhir.font = { bold: true };
    akhir.getCell("total").numFmt = RUPIAH;
    s2.autoFilter = { from: "A1", to: `H${s2.rowCount - 1}` };
  }

  s2.views = [{ state: "frozen", ySplit: 1 }];

  const buffer = await wb.xlsx.writeBuffer();
  const namaFile = `Laporan-DompetRumah-${periode}.xlsx`;

  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${namaFile}"`,
      "Cache-Control": "no-store",
    },
  });
}
