import type { HasilKirim } from "@/lib/kirim/email";
import { normalkanNomorWa } from "@/lib/validations";

/**
 * Pengiriman WhatsApp di balik satu antarmuka, supaya provider bisa diganti
 * tanpa menyentuh kode pemanggil.
 *
 * - fonnte : gateway lokal, dipakai saat prototype
 * - log    : default bila token belum diisi — pesan hanya dicatat ke konsol
 *
 * Saat produksi, tambahkan driver WhatsApp Cloud API resmi di sini dan ubah
 * WA_PROVIDER; selain file ini tidak ada yang perlu diubah.
 */
export type ProviderWa = "fonnte" | "log";

export function providerWa(): ProviderWa {
  const p = (process.env.WA_PROVIDER ?? "").toLowerCase();
  if (p === "fonnte" && process.env.FONNTE_TOKEN) return "fonnte";
  return "log";
}

export function waAktif(): boolean {
  return providerWa() !== "log";
}

/** Mengirim satu pesan WhatsApp. Tidak pernah melempar error. */
export async function kirimWa(opsi: {
  nomor: string | null;
  pesan: string;
}): Promise<HasilKirim> {
  if (!opsi.nomor) {
    return { status: "dilewati", galat: "Nomor WhatsApp belum diisi di profil" };
  }

  const tujuan = normalkanNomorWa(opsi.nomor);

  if (providerWa() === "log") {
    console.info(`[wa] dilewati (provider belum aktif) -> ${tujuan}: ${opsi.pesan}`);
    return { status: "dilewati", galat: "WA_PROVIDER / FONNTE_TOKEN belum diisi" };
  }

  return kirimLewatFonnte(tujuan, opsi.pesan);
}

async function kirimLewatFonnte(
  tujuan: string,
  pesan: string,
): Promise<HasilKirim> {
  try {
    const kendali = AbortSignal.timeout(15_000);
    const res = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        Authorization: process.env.FONNTE_TOKEN as string,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ target: tujuan, message: pesan, countryCode: "62" }),
      signal: kendali,
    });

    const isi = (await res.json().catch(() => null)) as
      | { status?: boolean; reason?: string }
      | null;

    if (!res.ok || isi?.status === false) {
      const galat = isi?.reason ?? `HTTP ${res.status}`;
      console.error(`[wa] gagal -> ${tujuan}: ${galat}`);
      return { status: "gagal", galat };
    }

    return { status: "terkirim" };
  } catch (e) {
    const galat = e instanceof Error ? e.message : String(e);
    console.error(`[wa] gagal -> ${tujuan}: ${galat}`);
    return { status: "gagal", galat };
  }
}
