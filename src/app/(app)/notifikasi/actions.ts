"use server";

import { revalidatePath } from "next/cache";

import { wajibProfil } from "@/lib/auth";
import { buatSupabaseServer } from "@/lib/supabase/server";
import type { HasilAksi } from "@/lib/types";

/** Menandai semua notifikasi milik pengguna sebagai sudah dibaca. */
export async function tandaiSemuaDibaca(): Promise<HasilAksi> {
  const profil = await wajibProfil();
  const supabase = await buatSupabaseServer();

  const { error } = await supabase
    .from("notifications")
    .update({ dibaca_pada: new Date().toISOString() })
    .eq("penerima_id", profil.id)
    .is("dibaca_pada", null);

  if (error) return { ok: false, pesan: `Gagal menandai: ${error.message}` };

  revalidatePath("/notifikasi");
  revalidatePath("/dashboard");
  return { ok: true };
}
