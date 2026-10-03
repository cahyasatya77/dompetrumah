import { redirect } from "next/navigation";

import { punyaRole } from "@/lib/auth-shared";
import { buatSupabaseServer } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/lib/types";

export { punyaRole };

/** Mengambil profil pengguna yang sedang login, atau null bila belum login. */
export async function ambilProfil(): Promise<Profile | null> {
  const supabase = await buatSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  return (data as Profile | null) ?? null;
}

/**
 * Memastikan pengguna sudah login, terdaftar, dan aktif.
 * Bila tidak, dialihkan ke halaman login atau akses ditolak.
 */
export async function wajibProfil(): Promise<Profile> {
  const profil = await ambilProfil();

  if (!profil) redirect("/akses-ditolak?alasan=tidak-terdaftar");
  if (!profil.aktif) redirect("/akses-ditolak?alasan=nonaktif");

  return profil;
}

/** Memastikan pengguna punya role minimal tertentu. */
export async function wajibRole(minimal: UserRole): Promise<Profile> {
  const profil = await wajibProfil();

  if (!punyaRole(profil.role, minimal)) {
    redirect("/dashboard?pesan=akses-ditolak");
  }

  return profil;
}
