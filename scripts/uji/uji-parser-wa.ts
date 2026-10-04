/**
 * Uji parser pesan WhatsApp.
 *
 *   npm run uji:wa
 */
import {
  balasanSukses,
  pesanUntukKami,
  tanggalWib,
  uraiPesan,
} from "@/lib/wa/parser";

let gagal = 0;

function cek(label: string, dapat: unknown, harap: unknown) {
  const a = JSON.stringify(dapat);
  const b = JSON.stringify(harap);
  if (a === b) {
    console.log("  OK    " + label);
  } else {
    gagal++;
    console.log(`  GAGAL ${label}\n        dapat: ${a}\n        harap: ${b}`);
  }
}

function cekTolak(label: string, isi: string, potongan: string) {
  const h = uraiPesan(isi);
  if (!h.ok && h.pesan.includes(potongan)) {
    console.log("  OK    " + label);
  } else {
    gagal++;
    console.log(`  GAGAL ${label} -> ${JSON.stringify(h)}`);
  }
}

const hariIni = tanggalWib();

console.log("\n== Mengenali perintah ==");
cek("perintah benar", pesanUntukKami("#catat|a"), true);
cek("huruf besar", pesanUntukKami("#CATAT|a"), true);
cek("ada spasi di depan", pesanUntukKami("  #catat|a"), true);
cek("obrolan biasa diabaikan", pesanUntukKami("halo, sudah makan?"), false);
cek("perintah lain diabaikan", pesanUntukKami("#laporan"), false);

console.log("\n== Pesan yang benar ==");
const a = uraiPesan("#catat|2026-10-03|Bensin|20000|2|liter|isi bensin motor");
cek("lengkap", a.ok && a.data, {
  tanggal: "2026-10-03",
  kategori: "Bensin",
  nominal: 20000,
  kuantiti: 2,
  satuan: "liter",
  keterangan: "isi bensin motor",
});

const b = uraiPesan("#catat|hari ini|Snack|15000|1||");
cek("hari ini + kolom kosong", b.ok && b.data, {
  tanggal: hariIni,
  kategori: "Snack",
  nominal: 15000,
  kuantiti: 1,
  satuan: null,
  keterangan: null,
});

const c = uraiPesan("#catat||Parkir|5000|1");
cek("tanggal kosong = hari ini", c.ok && c.data.tanggal, hariIni);

const d = uraiPesan("#catat|3/10/2026|Parkir|5.000|1");
cek(
  "tanggal d/m/Y dan nominal bertitik",
  d.ok && [d.data.tanggal, d.data.nominal],
  ["2026-10-03", 5000],
);

const e = uraiPesan("#catat|2026-10-03|Daging Seafood|125000|1,5|kg|ikan");
cek("kuantiti desimal berkoma", e.ok && e.data.kuantiti, 1.5);

const f = uraiPesan("  #CATAT | 2026-10-03 | Snack | 10000 | 2 | pcs | roti  ");
cek(
  "spasi berlebih dan huruf besar",
  f.ok && [f.data.kategori, f.data.kuantiti, f.data.keterangan],
  ["Snack", 2, "roti"],
);

console.log("\n== Pesan yang harus ditolak ==");
cekTolak("bukan perintah kami", "halo", "Perintah tidak dikenal");
cekTolak("kolom kurang", "#catat|2026-10-03|Bensin", "kurang lengkap");
cekTolak("tanggal ngawur", "#catat|kemarin dulu|Bensin|1000|1", "tidak dikenal");
cekTolak("tanggal masa depan", "#catat|2099-01-01|Bensin|1000|1", "masa depan");
cekTolak("kategori kosong", "#catat|hari ini||1000|1", "Kategori masih kosong");
cekTolak("nominal berupa huruf", "#catat|hari ini|Bensin|abc|1", "bukan angka");
cekTolak("kuantiti nol", "#catat|hari ini|Bensin|1000|0", "lebih dari 0");
cekTolak("kuantiti negatif", "#catat|hari ini|Bensin|1000|-2", "lebih dari 0");

console.log("\n== Balasan ==");
const s1 = balasanSukses({
  kategori: "Bensin",
  total: 40000,
  tanggal: "2026-10-03",
  pending: false,
});
cek("balasan biasa memuat total", s1.includes("Rp40.000"), true);

const s2 = balasanSukses({
  kategori: "Wisata",
  total: 900000,
  tanggal: "2026-10-03",
  pending: true,
});
cek("balasan pending menjelaskan batas", s2.includes("Rp500.000"), true);

console.log(gagal === 0 ? "\nSEMUA LULUS" : `\n${gagal} UJI GAGAL`);
process.exit(gagal === 0 ? 0 : 1);
