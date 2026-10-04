/**
 * Memeriksa kunci Gemini dan menampilkan model yang tersedia untuk kunci itu.
 *
 *   node scripts/uji-ai.mjs
 *
 * Nama model berubah dari waktu ke waktu, dan model yang tersedia berbeda
 * antar akun. Skrip ini menanyakannya langsung ke Google, lalu mencoba
 * memanggil model yang sedang diset di .env.local.
 */
import fs from "node:fs";
import path from "node:path";

const berkasEnv = path.join(process.cwd(), ".env.local");

if (!fs.existsSync(berkasEnv)) {
  console.error("Tidak menemukan .env.local. Jalankan dari folder proyek.");
  process.exit(1);
}

const env = Object.fromEntries(
  fs
    .readFileSync(berkasEnv, "utf8")
    .split(/\r?\n/)
    .filter((b) => /^[A-Z_]+=/.test(b))
    .map((b) => [b.slice(0, b.indexOf("=")), b.slice(b.indexOf("=") + 1).trim()]),
);

const kunci = env.GEMINI_API_KEY;
const modelSekarang = env.GEMINI_MODEL || "gemini-2.0-flash";

if (!kunci) {
  console.error("GEMINI_API_KEY masih kosong di .env.local.");
  console.error("Ambil kunci gratis di https://aistudio.google.com/apikey");
  process.exit(1);
}

const DASAR = "https://generativelanguage.googleapis.com/v1beta";

console.log(`Model yang sedang diset: ${modelSekarang}\n`);
process.stdout.write("Menanyakan daftar model ke Google… ");

let daftar;
try {
  const res = await fetch(`${DASAR}/models?pageSize=100`, {
    headers: { "x-goog-api-key": kunci },
  });

  if (!res.ok) {
    console.log("gagal.\n");
    const teks = await res.text().catch(() => "");

    if (res.status === 400 || res.status === 403) {
      console.error(
        "Google menolak kunci ini. Kemungkinan penyebabnya:\n" +
          "  - kunci salah ketik atau sudah dihapus\n" +
          "  - Generative Language API belum aktif di project Google Cloud-nya\n" +
          "Buat kunci baru lewat https://aistudio.google.com/apikey\n",
      );
    } else {
      console.error(`HTTP ${res.status}`);
    }
    if (teks) console.error(teks.slice(0, 400));
    process.exit(1);
  }

  const data = await res.json();
  daftar = (data.models ?? []).filter((m) =>
    (m.supportedGenerationMethods ?? []).includes("generateContent"),
  );
  console.log(`ada ${daftar.length} model.\n`);
} catch (e) {
  console.log("gagal.");
  console.error(e.message);
  process.exit(1);
}

// Nama datang sebagai "models/xxx"; yang dipakai di .env.local hanya "xxx".
const nama = daftar.map((m) => m.name.replace(/^models\//, ""));

const disarankan = nama
  .filter((n) => n.includes("flash") && !n.includes("thinking") && !n.includes("image"))
  .sort();

console.log("Model yang bisa dipakai untuk chat (disarankan yang 'flash' — paling murah dan cepat):");
for (const n of disarankan.length > 0 ? disarankan : nama) {
  console.log(`  ${n}${n === modelSekarang ? "   <- sedang dipakai" : ""}`);
}

if (!nama.includes(modelSekarang)) {
  console.log(
    `\nModel "${modelSekarang}" TIDAK ada di daftar kunci Anda.\n` +
      `Ubah GEMINI_MODEL di .env.local menjadi salah satu di atas, ` +
      `misalnya:\n  GEMINI_MODEL=${disarankan[0] ?? nama[0]}`,
  );
  process.exit(1);
}

process.stdout.write(`\nMencoba memanggil ${modelSekarang}… `);

// Server Gemini kerap menjawab 503 saat sedang penuh. Itu bukan salah
// konfigurasi, jadi dicoba beberapa kali sebelum menyerah — sama seperti
// yang dilakukan aplikasi.
const BOLEH_ULANG = new Set([429, 500, 502, 503, 504]);
const MAKS = 3;

let berhasil = false;

for (let percobaan = 1; percobaan <= MAKS; percobaan++) {
  try {
    const res = await fetch(`${DASAR}/models/${modelSekarang}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": kunci },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: "Balas dengan satu kata: siap" }] },
        ],
        generationConfig: { maxOutputTokens: 20 },
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const jawaban = data.candidates?.[0]?.content?.parts
        ?.map((p) => p.text ?? "")
        .join("")
        .trim();

      console.log("berhasil.");
      console.log(`Jawaban model: ${jawaban || "(kosong)"}`);
      console.log("\nChat AI siap dipakai.");
      berhasil = true;
      break;
    }

    const teks = await res.text().catch(() => "");
    const kuotaHabis = res.status === 429 && /quota|exceeded/i.test(teks);

    if (!BOLEH_ULANG.has(res.status) || kuotaHabis) {
      console.log("gagal.");
      if (kuotaHabis) {
        console.error("Kuota gratis hari ini sudah habis. Coba lagi besok.");
      } else {
        console.error(`HTTP ${res.status}\n${teks.slice(0, 400)}`);
      }
      process.exit(1);
    }

    if (percobaan < MAKS) {
      process.stdout.write(`sibuk (HTTP ${res.status}), mengulang… `);
      await new Promise((r) => setTimeout(r, 1000 * 2 ** (percobaan - 1)));
    } else {
      console.log("gagal.");
      console.error(
        `Server Gemini tetap sibuk (HTTP ${res.status}) setelah ${MAKS} percobaan.\n` +
          "Ini dari sisi Google, bukan konfigurasi Anda. Kunci dan nama model\n" +
          "sudah benar — coba lagi beberapa menit lagi.",
      );
      process.exit(1);
    }
  } catch (e) {
    if (percobaan === MAKS) {
      console.log("gagal.");
      console.error(e.message);
      process.exit(1);
    }
    await new Promise((r) => setTimeout(r, 1000 * percobaan));
  }
}

if (!berhasil) process.exit(1);
