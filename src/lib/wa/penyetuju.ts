import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Daftar id supervisor dan admin aktif, dibaca dengan klien yang diberikan.
 *
 * Berbeda dari `idPenyetuju()` di lib/notifikasi.ts yang memakai sesi
 * pengguna: webhook WhatsApp berjalan tanpa sesi, jadi perlu klien sendiri.
 */
export async function idPenyetujuAdmin(
  klien: SupabaseClient,
): Promise<string[]> {
  const { data } = await klien
    .from("profiles")
    .select("id")
    .in("role", ["supervisor", "admin"])
    .eq("aktif", true)
    .returns<{ id: string }[]>();

  return (data ?? []).map((p) => p.id);
}
