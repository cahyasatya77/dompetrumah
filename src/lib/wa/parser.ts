import { BATAS_APPROVAL } from "@/lib/konstanta";
import { formatRupiah } from "@/lib/utils";

/**
 * Format pesan yang diterima:
 *
 *   #catat|2026-10-03|Bensin|20000|2|liter|isi bensin motor
 *
 * Urutan: perintah | tanggal | kategori | nominal | kuantiti | satuan | keterangan
 * Kolom satuan dan keterangan boleh dikosongkan.
 * Kata "hari ini" atau tanggal kosong berarti tanggal hari ini.
 */

export type HasilUrai =
  | { ok: true; data: DataCatat }
  | { ok: false; pesan: string };

export type DataCatat = {
  tanggal: string;
  kategori: string;
  nominal: number;
  kuantiti: number;
  satuan: string | null;
  keterangan: string | null;
};

const PERINTAH = "#catat";

export const CONTOH_FORMAT =
  "#catat|2026-10-03|Bensin|20000|2|liter|isi bensin motor";

export const BANTUAN = [
  "Format pencatatan:",
  `${PERINTAH}|tanggal|kategori|harga satuan|kuantiti|satuan|keterangan`,
  "",
  "Contoh:",
  CONTOH_FORMAT,
  "",
  "Satuan dan keterangan boleh dikosongkan:",
  "#catat|hari ini|Snack|15000|1||",
].join("\n");

/** Apakah pesan ini memang ditujukan untuk aplikasi? */
export function pesanUntukKami(isi: string): boolean {
  return isi.trim().toLowerCase().startsWith(PERINTAH);
}

/** Tanggal hari ini menurut waktu Jakarta. */
export function tanggalWib(): string {
  return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function uraiPesan(isi: string): HasilUrai {
  const bersih = isi.trim();

  if (!pesanUntukKami(bersih)) {
    return { ok: false, pesan: `Perintah tidak dikenal.\n\n${BANTUAN}` };
  }

  const bagian = bersih.split("|").map((b) => b.trim());

  if (bagian.length < 5) {
    return {
      ok: false,
      pesan: `Formatnya kurang lengkap. Minimal sampai kolom kuantiti.\n\n${BANTUAN}`,
    };
  }

  // --- tanggal ---
  const tanggalMentah = bagian[1].toLowerCase();
  let tanggal: string;

  if (!tanggalMentah || tanggalMentah === "hari ini" || tanggalMentah === "hariini") {
    tanggal = tanggalWib();
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(tanggalMentah)) {
    tanggal = tanggalMentah;
  } else if (/^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(tanggalMentah)) {
    // Bentuk 3/10/2026 atau 03-10-2026 (hari/bulan/tahun)
    const [h, b, t] = tanggalMentah.split(/[/-]/);
    tanggal = `${t}-${b.padStart(2, "0")}-${h.padStart(2, "0")}`;
  } else {
    return {
      ok: false,
      pesan: `Tanggal "${bagian[1]}" tidak dikenal. Pakai 2026-10-03, 3/10/2026, atau tulis "hari ini".`,
    };
  }

  const waktu = Date.parse(`${tanggal}T00:00:00Z`);
  if (Number.isNaN(waktu)) {
    return { ok: false, pesan: `Tanggal "${bagian[1]}" tidak sah.` };
  }

  // Tanggal di masa depan hampir pasti salah ketik.
  if (tanggal > tanggalWib()) {
    return {
      ok: false,
      pesan: `Tanggal ${tanggal} ada di masa depan. Periksa lagi penulisannya.`,
    };
  }

  // --- kategori ---
  const kategori = bagian[2];
  if (!kategori) {
    return { ok: false, pesan: `Kategori masih kosong.\n\n${BANTUAN}` };
  }

  // --- nominal & kuantiti ---
  const nominal = angka(bagian[3]);
  if (nominal === null || nominal < 0) {
    return {
      ok: false,
      pesan: `Harga satuan "${bagian[3]}" bukan angka yang sah. Tulis tanpa titik, contoh: 20000`,
    };
  }

  const kuantiti = angka(bagian[4]);
  if (kuantiti === null || kuantiti <= 0) {
    return {
      ok: false,
      pesan: `Kuantiti "${bagian[4]}" harus angka lebih dari 0.`,
    };
  }

  return {
    ok: true,
    data: {
      tanggal,
      kategori,
      nominal,
      kuantiti,
      satuan: bagian[5] || null,
      keterangan: bagian[6] || null,
    },
  };
}

/** "20.000" atau "20000" atau "1,5" -> angka; null bila bukan angka. */
function angka(s: string): number | null {
  const bersih = s.replace(/[^0-9,.-]/g, "");
  if (bersih === "") return null;
  const normal = bersih.replace(/\./g, "").replace(",", ".");
  const n = Number(normal);
  return Number.isFinite(n) ? n : null;
}

/** Balasan konfirmasi setelah transaksi tersimpan. */
export function balasanSukses(p: {
  kategori: string;
  total: number;
  tanggal: string;
  pending: boolean;
}): string {
  const baris = [
    p.pending ? "⏳ Tercatat, menunggu persetujuan" : "✅ Tercatat",
    `${p.kategori} · ${formatRupiah(p.total)}`,
    `Tanggal ${p.tanggal}`,
  ];

  if (p.pending) {
    baris.push(
      "",
      `Totalnya di atas ${formatRupiah(BATAS_APPROVAL)}, jadi supervisor perlu menyetujui dulu sebelum masuk hitungan.`,
    );
  }

  return baris.join("\n");
}
