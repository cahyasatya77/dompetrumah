import { ambilLaporan } from "@/lib/laporan";
import { bulanIni, labelBulan, mundurBulan } from "@/lib/periode";
import { buatSupabaseServer } from "@/lib/supabase/server";
import type { Profile, RekapKategori } from "@/lib/types";
import { formatRupiah, formatTanggal } from "@/lib/utils";

/**
 * Menyusun ringkasan data untuk diberikan ke model.
 *
 * Model tidak pernah menyentuh database. Yang dikirim hanya angka yang sudah
 * dihitung aplikasi dengan klien sesi pengguna, sehingga Row Level Security
 * tetap menentukan apa yang boleh terlihat.
 */
export async function susunKonteks(profil: Profile): Promise<string> {
  const periode = bulanIni();
  const supabase = await buatSupabaseServer();

  const [laporan, bulanLalu, { data: kategoriLalu }] = await Promise.all([
    ambilLaporan(periode),
    ambilLaporan(mundurBulan(periode, 1), 1),
    supabase
      .from("v_rekap_kategori")
      .select("*")
      .eq("periode", `${mundurBulan(periode, 1)}-01`)
      .returns<RekapKategori[]>(),
  ]);

  const bagian: string[] = [];

  bagian.push(
    `Tanggal hari ini: ${formatTanggal(new Date())} (zona waktu Asia/Jakarta).`,
    `Pengguna yang bertanya: ${profil.nama}, peran ${profil.role}.`,
  );

  bagian.push(
    `\n## Bulan berjalan (${labelBulan(periode)})`,
    laporan.saldoAwal > 0
      ? `Saldo awal: ${formatRupiah(laporan.saldoAwal)}`
      : "Saldo awal: belum diisi",
    `Total pengeluaran: ${formatRupiah(laporan.total)} dari ${laporan.jumlahTransaksi} transaksi`,
    laporan.saldoAwal > 0 ? `Sisa saldo: ${formatRupiah(laporan.sisa)}` : "",
  );

  bagian.push("\n### Pengeluaran per kategori bulan ini");
  bagian.push(
    laporan.kategori.length === 0
      ? "Belum ada pengeluaran."
      : laporan.kategori
          .map(
            (k) =>
              `- ${k.kategori}: ${formatRupiah(Number(k.total))} (${k.jumlah_transaksi} transaksi)`,
          )
          .join("\n"),
  );

  bagian.push(`\n## Bulan lalu (${labelBulan(mundurBulan(periode, 1))})`);
  bagian.push(
    `Total pengeluaran: ${formatRupiah(bulanLalu.total)} dari ${bulanLalu.jumlahTransaksi} transaksi`,
  );
  bagian.push(
    (kategoriLalu ?? []).length === 0
      ? "Tidak ada pengeluaran."
      : (kategoriLalu ?? [])
          .sort((a, b) => Number(b.total) - Number(a.total))
          .map((k) => `- ${k.kategori}: ${formatRupiah(Number(k.total))}`)
          .join("\n"),
  );

  bagian.push("\n## Total enam bulan terakhir");
  bagian.push(
    laporan.tren
      .map((t) => `- ${labelBulan(t.periode)}: ${formatRupiah(t.total)}`)
      .join("\n"),
  );

  bagian.push("\n## Transaksi bulan ini (maksimal 60 terakhir)");
  bagian.push(
    laporan.transaksi.length === 0
      ? "Belum ada transaksi."
      : laporan.transaksi
          .slice(-60)
          .map(
            (t) =>
              `- ${t.tanggal} | ${t.categories?.nama ?? "-"} | ${formatRupiah(Number(t.total))} | ${t.keterangan ?? "-"} | dicatat ${t.pencatat?.nama ?? "-"}`,
          )
          .join("\n"),
  );

  return bagian.filter(Boolean).join("\n");
}

/** Aturan main untuk model. */
export const INSTRUKSI_SISTEM = `Kamu asisten keuangan rumah tangga di aplikasi DompetRumah.

Tugasmu menjawab pertanyaan tentang data pengeluaran keluarga yang diberikan di bawah ini.

Aturan:
- Jawab dalam bahasa Indonesia yang santai tapi jelas, maksimal 4 kalimat kecuali diminta rinci.
- Pakai HANYA angka dari data yang diberikan. Jangan mengarang, menebak, atau menghitung dari ingatan.
- Kalau data yang dibutuhkan tidak ada di konteks, katakan terus terang bahwa datanya tidak tersedia dan sebutkan periode apa yang kamu punya. Jangan dikira-kira.
- Tulis nominal dalam format Rupiah, contoh: Rp1.250.000.
- Kalau diminta saran penghematan, dasarkan pada kategori yang angkanya memang besar di data, bukan saran umum.
- Jangan pernah menyebut dirimu model bahasa, dan jangan membahas cara kerja aplikasi ini.
- Kalau pertanyaannya di luar soal pengeluaran keluarga, arahkan kembali dengan ramah.

Data pengeluaran:
`;
