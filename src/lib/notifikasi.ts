import type { SupabaseClient } from "@supabase/supabase-js";
import { after } from "next/server";

import { siteUrl } from "@/lib/env";
import { kirimEmail } from "@/lib/kirim/email";
import { kirimWa } from "@/lib/kirim/whatsapp";
import { buatSupabaseServer } from "@/lib/supabase/server";

export type JenisNotifikasi =
  | "request_baru"
  | "request_disetujui"
  | "request_ditolak"
  | "reminder_harian";

type ParamNotifikasi = {
  penerimaIds: string[];
  jenis: JenisNotifikasi;
  judul: string;
  pesan?: string | null;
  tautan?: string | null;
  /**
   * Klien khusus, dipakai oleh cron yang berjalan tanpa sesi pengguna.
   * Bila kosong, memakai klien sesi biasa sehingga RLS tetap berlaku.
   */
  klien?: SupabaseClient;
  /** Lewati pengiriman email & WhatsApp; hanya simpan notifikasi in-app. */
  hanyaInApp?: boolean;
  /**
   * Tunggu pengiriman selesai sebelum fungsi ini kembali.
   * Dipakai cron: tidak ada pengguna yang menunggu, dan hasilnya perlu
   * tercermin pada respons endpoint.
   */
  tungguKirim?: boolean;
};

type Penerima = {
  id: string;
  nama: string;
  email: string;
  no_wa: string | null;
};

/**
 * Menyimpan notifikasi in-app lalu — setelah respons dikirim ke pengguna —
 * meneruskannya lewat email dan WhatsApp.
 *
 * Pengiriman dijalankan dengan `after()` supaya pengguna tidak menunggu
 * koneksi SMTP; kegagalannya dicatat di tabel notification_deliveries,
 * tidak pernah membatalkan aksi utama.
 */
export async function kirimNotifikasi(p: ParamNotifikasi): Promise<void> {
  const penerima = [...new Set(p.penerimaIds)].filter(Boolean);
  if (penerima.length === 0) return;

  const supabase = p.klien ?? (await buatSupabaseServer());

  try {
    const { data: baris, error } = await supabase
      .from("notifications")
      .insert(
        penerima.map((id) => ({
          penerima_id: id,
          jenis: p.jenis,
          judul: p.judul,
          pesan: p.pesan ?? null,
          tautan: p.tautan ?? null,
        })),
      )
      .select("id, penerima_id")
      .returns<{ id: string; penerima_id: string }[]>();

    if (error) {
      // Reminder ganda ditolak unique index; itu memang yang kita inginkan.
      if (error.code === "23505") return;
      console.error("[notifikasi] gagal:", error.message);
      return;
    }

    if (p.hanyaInApp) return;

    const petaNotif = new Map(
      (baris ?? []).map((b) => [b.penerima_id, b.id]),
    );

    if (p.tungguKirim) {
      await teruskan(supabase, penerima, petaNotif, p);
      return;
    }

    after(async () => {
      await teruskan(supabase, penerima, petaNotif, p);
    });
  } catch (e) {
    console.error("[notifikasi] gagal:", e);
  }
}

/** Mengirim email + WhatsApp ke setiap penerima dan mencatat hasilnya. */
async function teruskan(
  supabase: SupabaseClient,
  penerimaIds: string[],
  petaNotif: Map<string, string>,
  p: ParamNotifikasi,
): Promise<void> {
  const { data: orang } = await supabase
    .from("profiles")
    .select("id, nama, email, no_wa")
    .in("id", penerimaIds)
    .eq("aktif", true)
    .returns<Penerima[]>();

  if (!orang || orang.length === 0) return;

  const tautanPenuh = p.tautan ? `${siteUrl()}${p.tautan}` : siteUrl();
  const isi = [p.pesan, `Buka aplikasi: ${tautanPenuh}`]
    .filter(Boolean)
    .join("\n\n");

  const catatan: Record<string, unknown>[] = [];

  for (const o of orang) {
    const hasilEmail = await kirimEmail({
      ke: o.email,
      subjek: `[DompetRumah] ${p.judul}`,
      teks: `Halo ${o.nama},\n\n${isi}`,
    });
    catatan.push({
      notification_id: petaNotif.get(o.id) ?? null,
      penerima_id: o.id,
      kanal: "email",
      tujuan: o.email,
      status: hasilEmail.status,
      galat: hasilEmail.galat ?? null,
    });

    const hasilWa = await kirimWa({
      nomor: o.no_wa,
      pesan: `*DompetRumah*\n${p.judul}\n\n${isi}`,
    });
    catatan.push({
      notification_id: petaNotif.get(o.id) ?? null,
      penerima_id: o.id,
      kanal: "whatsapp",
      tujuan: o.no_wa,
      status: hasilWa.status,
      galat: hasilWa.galat ?? null,
    });
  }

  const { error } = await supabase
    .from("notification_deliveries")
    .insert(catatan);
  if (error) console.error("[notifikasi] gagal mencatat pengiriman:", error.message);
}

/** Mengambil id profil semua supervisor dan admin yang aktif. */
export async function idPenyetuju(): Promise<string[]> {
  const supabase = await buatSupabaseServer();
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .in("role", ["supervisor", "admin"])
    .eq("aktif", true)
    .returns<{ id: string }[]>();

  return (data ?? []).map((p) => p.id);
}
