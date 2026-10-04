"use server";

import { wajibProfil } from "@/lib/auth";
import { jawab, type Pesan } from "@/lib/ai";
import { INSTRUKSI_SISTEM, susunKonteks } from "@/lib/ai/konteks";

export type HasilChat = {
  ok: boolean;
  teks?: string;
  pesan?: string;
};

/** Batas percakapan yang ikut dikirim, supaya pemakaian token terkendali. */
const MAKS_RIWAYAT = 8;

export async function tanyaAi(
  _state: HasilChat | null,
  formData: FormData,
): Promise<HasilChat> {
  const profil = await wajibProfil();

  const pertanyaan = String(formData.get("pertanyaan") ?? "").trim();
  if (!pertanyaan) return { ok: false, pesan: "Pertanyaan masih kosong." };
  if (pertanyaan.length > 500) {
    return { ok: false, pesan: "Pertanyaan terlalu panjang, maksimal 500 karakter." };
  }

  let riwayat: Pesan[] = [];
  try {
    const mentah = JSON.parse(String(formData.get("riwayat") ?? "[]")) as Pesan[];
    riwayat = mentah
      .filter(
        (p) =>
          (p.peran === "pengguna" || p.peran === "asisten") &&
          typeof p.isi === "string",
      )
      .slice(-MAKS_RIWAYAT);
  } catch {
    riwayat = [];
  }

  const konteks = await susunKonteks(profil);
  const hasil = await jawab(INSTRUKSI_SISTEM + konteks, [
    ...riwayat,
    { peran: "pengguna", isi: pertanyaan },
  ]);

  if (!hasil.ok) return { ok: false, pesan: hasil.pesan };
  return { ok: true, teks: hasil.teks };
}
