/**
 * Lapisan AI di balik satu antarmuka.
 *
 * Saat ini hanya Gemini yang terpasang. Menambah Claude atau model lain
 * cukup menulis satu fungsi dengan bentuk `Penjawab` lalu mendaftarkannya
 * di `jawab()` — halaman chat tidak perlu diubah.
 */

export type Pesan = {
  peran: "pengguna" | "asisten";
  isi: string;
};

export type HasilJawab =
  | { ok: true; teks: string }
  | { ok: false; pesan: string };

type Penjawab = (
  sistem: string,
  riwayat: Pesan[],
) => Promise<HasilJawab>;

export function aiAktif(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

export function namaModel(): string {
  return process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
}

export async function jawab(
  sistem: string,
  riwayat: Pesan[],
): Promise<HasilJawab> {
  if (!aiAktif()) {
    return {
      ok: false,
      pesan:
        "Chat AI belum tersambung. Isi GEMINI_API_KEY di .env.local, lalu jalankan ulang aplikasi.",
    };
  }
  return gemini(sistem, riwayat);
}

/**
 * Status yang pantas dicoba ulang: server Gemini sedang penuh atau
 * sedang bermasalah sesaat. Bukan salah permintaan kita, jadi mengulang
 * dengan jeda biasanya berhasil.
 */
const BOLEH_ULANG = new Set([429, 500, 502, 503, 504]);
const MAKS_PERCOBAAN = 3;

function jeda(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Pemanggilan Gemini lewat REST, tanpa SDK tambahan. */
const gemini: Penjawab = async (sistem, riwayat) => {
  const kunci = process.env.GEMINI_API_KEY as string;
  const model = namaModel();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const badan = JSON.stringify({
    systemInstruction: { parts: [{ text: sistem }] },
    contents: riwayat.map((p) => ({
      role: p.peran === "pengguna" ? "user" : "model",
      parts: [{ text: p.isi }],
    })),
    generationConfig: {
      temperature: 0.2, // pertanyaan soal angka, bukan karangan
      maxOutputTokens: 800,
    },
  });

  let statusTerakhir = 0;
  let isiTerakhir = "";

  for (let percobaan = 1; percobaan <= MAKS_PERCOBAAN; percobaan++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": kunci,
        },
        body: badan,
        signal: AbortSignal.timeout(30_000),
        cache: "no-store",
      });

      if (res.ok) {
        const data = (await res.json()) as {
          candidates?: { content?: { parts?: { text?: string }[] } }[];
        };

        const teks = data.candidates?.[0]?.content?.parts
          ?.map((p) => p.text ?? "")
          .join("")
          .trim();

        if (!teks) {
          return {
            ok: false,
            pesan: "Model tidak mengembalikan jawaban. Coba ulangi pertanyaannya.",
          };
        }

        return { ok: true, teks };
      }

      statusTerakhir = res.status;
      isiTerakhir = await res.text().catch(() => "");

      // Kuota harian habis tidak akan pulih dengan mengulang.
      const kuotaHabis =
        res.status === 429 && /quota|exceeded/i.test(isiTerakhir);

      if (!BOLEH_ULANG.has(res.status) || kuotaHabis) break;

      if (percobaan < MAKS_PERCOBAAN) {
        const tunggu = 1000 * 2 ** (percobaan - 1); // 1 detik, lalu 2 detik
        console.warn(
          `[ai] HTTP ${res.status}, mencoba ulang dalam ${tunggu}ms (${percobaan}/${MAKS_PERCOBAAN})`,
        );
        await jeda(tunggu);
      }
    } catch (e) {
      const galat = e instanceof Error ? e.message : String(e);
      console.error("[ai] gagal:", galat);

      if (percobaan === MAKS_PERCOBAAN) {
        return { ok: false, pesan: `Gagal menghubungi layanan AI: ${galat}` };
      }
      await jeda(1000 * percobaan);
    }
  }

  return {
    ok: false,
    pesan: await pesanGalat(statusTerakhir, isiTerakhir, kunci),
  };
};

async function pesanGalat(
  status: number,
  isi: string,
  kunci: string,
): Promise<string> {
  if (status === 400 && isi.includes("API key")) {
    return "GEMINI_API_KEY ditolak. Periksa kembali kuncinya di aistudio.google.com.";
  }
  if (status === 403) {
    return "Kunci Gemini ditolak. Pastikan Generative Language API sudah aktif untuk kunci tersebut.";
  }
  if (status === 429) {
    return "Kuota gratis Gemini hari ini sudah habis. Coba lagi besok, atau naikkan kuota di Google AI Studio.";
  }
  if (status === 503 || status === 500 || status === 502 || status === 504) {
    return (
      `Server Gemini sedang penuh (HTTP ${status}). Sudah dicoba ${MAKS_PERCOBAAN} kali ` +
      "dan tetap sibuk — ini dari sisi Google, bukan konfigurasi Anda. " +
      "Coba lagi sebentar lagi, atau pakai model yang lebih ringan di GEMINI_MODEL."
    );
  }
  if (status === 404) {
    // Nama model berubah dari waktu ke waktu dan berbeda antar akun, jadi
    // daftarnya ditanyakan langsung alih-alih menyuruh pengguna menebak.
    const tersedia = await daftarModel(kunci);
    if (tersedia.length > 0) {
      return (
        `Model "${namaModel()}" tidak tersedia untuk kunci Anda. ` +
        `Ubah GEMINI_MODEL di .env.local menjadi salah satu dari: ${tersedia.slice(0, 5).join(", ")}.`
      );
    }
    return `Model "${namaModel()}" tidak ditemukan. Jalankan "npm run uji:ai" untuk melihat model yang tersedia.`;
  }
  return `Layanan AI menolak permintaan (HTTP ${status}).`;
}

/** Nama model yang mendukung percakapan, menurut kunci yang dipakai. */
async function daftarModel(kunci: string): Promise<string[]> {
  try {
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models?pageSize=100",
      {
        headers: { "x-goog-api-key": kunci },
        signal: AbortSignal.timeout(10_000),
        cache: "no-store",
      },
    );
    if (!res.ok) return [];

    const data = (await res.json()) as {
      models?: { name: string; supportedGenerationMethods?: string[] }[];
    };

    return (data.models ?? [])
      .filter((m) => (m.supportedGenerationMethods ?? []).includes("generateContent"))
      .map((m) => m.name.replace(/^models\//, ""))
      .filter((n) => n.includes("flash"))
      .sort();
  } catch {
    return [];
  }
}
