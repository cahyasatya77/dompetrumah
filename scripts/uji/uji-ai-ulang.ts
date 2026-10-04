/**
 * Uji perilaku percobaan ulang pada modul AI.
 *
 *   npm run uji:ai-ulang
 *
 * fetch global diganti tiruan, jadi tidak ada panggilan sungguhan ke Google.
 */
export {}; // menjadikan berkas ini modul, supaya await di tingkat atas sah

// Diset sebelum modul AI diimpor, karena modul itu membacanya saat dipanggil.
process.env.GEMINI_API_KEY = "kunci-uji";
process.env.GEMINI_MODEL = "model-uji";

const { jawab } = await import("@/lib/ai");

let gagal = 0;
let jumlahPanggilan = 0;

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

function cekMemuat(label: string, teks: string, potongan: string) {
  if (teks.includes(potongan)) {
    console.log("  OK    " + label);
  } else {
    gagal++;
    console.log(`  GAGAL ${label}\n        dapat: ${JSON.stringify(teks)}`);
  }
}

/** Mengganti fetch dengan urutan jawaban yang sudah ditentukan. */
function pasangFetch(urutan: { status: number; body?: unknown }[]) {
  jumlahPanggilan = 0;
  let ke = 0;

  globalThis.fetch = (async () => {
    const r = urutan[Math.min(ke, urutan.length - 1)];
    ke++;
    jumlahPanggilan++;

    const isi = JSON.stringify(
      r.body ?? {
        candidates: [{ content: { parts: [{ text: "jawaban uji" }] } }],
      },
    );

    return new Response(isi, {
      status: r.status,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;
}

const aslinya = globalThis.fetch;
const mulai = Date.now();

console.log("\n== Sukses pada percobaan pertama ==");
pasangFetch([{ status: 200 }]);
const a = await jawab("sistem", [{ peran: "pengguna", isi: "halo" }]);
cek("mengembalikan jawaban", a.ok && a.teks, "jawaban uji");
cek("hanya sekali memanggil", jumlahPanggilan, 1);

console.log("\n== 503 dua kali lalu berhasil ==");
pasangFetch([{ status: 503 }, { status: 503 }, { status: 200 }]);
const b = await jawab("sistem", [{ peran: "pengguna", isi: "halo" }]);
cek("akhirnya berhasil", b.ok && b.teks, "jawaban uji");
cek("memanggil tiga kali", jumlahPanggilan, 3);

console.log("\n== 503 terus menerus ==");
pasangFetch([{ status: 503 }]);
const c = await jawab("sistem", [{ peran: "pengguna", isi: "halo" }]);
cek("menyerah dengan ok=false", c.ok, false);
cek("berhenti setelah tiga percobaan", jumlahPanggilan, 3);
if (!c.ok) {
  cekMemuat("menjelaskan ini dari sisi Google", c.pesan, "sisi Google");
}

console.log("\n== 400 tidak diulang ==");
pasangFetch([{ status: 400, body: { error: { message: "API key not valid" } } }]);
const d = await jawab("sistem", [{ peran: "pengguna", isi: "halo" }]);
cek("langsung gagal", d.ok, false);
cek("hanya sekali memanggil", jumlahPanggilan, 1);

console.log("\n== Kuota habis tidak diulang ==");
pasangFetch([
  { status: 429, body: { error: { message: "Quota exceeded for quota metric" } } },
]);
const e = await jawab("sistem", [{ peran: "pengguna", isi: "halo" }]);
cek("langsung gagal", e.ok, false);
cek("hanya sekali memanggil", jumlahPanggilan, 1);
if (!e.ok) cekMemuat("menyebut kuota", e.pesan, "Kuota");

console.log("\n== Jawaban kosong ==");
pasangFetch([{ status: 200, body: { candidates: [] } }]);
const f = await jawab("sistem", [{ peran: "pengguna", isi: "halo" }]);
cek("dianggap gagal", f.ok, false);

globalThis.fetch = aslinya;

console.log(`\nLama uji: ${((Date.now() - mulai) / 1000).toFixed(1)} detik`);
console.log(gagal === 0 ? "SEMUA LULUS" : `${gagal} UJI GAGAL`);
process.exit(gagal === 0 ? 0 : 1);
