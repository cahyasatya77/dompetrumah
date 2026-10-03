import type { Metadata } from "next";

import { PenggunaKlien } from "@/app/(app)/pengguna/pengguna-klien";
import { JudulHalaman } from "@/components/judul-halaman";
import { wajibRole } from "@/lib/auth";
import { buatSupabaseServer } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export const metadata: Metadata = { title: "Master Pengguna · DompetRumah" };

export default async function HalamanPengguna() {
  const profil = await wajibRole("admin");
  const supabase = await buatSupabaseServer();

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("aktif", { ascending: false })
    .order("nama", { ascending: true })
    .returns<Profile[]>();

  return (
    <>
      <JudulHalaman
        judul="Master Pengguna"
        deskripsi="Hanya email Google yang terdaftar dan aktif di sini yang bisa masuk."
      />

      {error ? (
        <p className="rounded-[var(--radius-app)] bg-destructive/12 px-3 py-2 text-sm text-destructive">
          Gagal memuat pengguna: {error.message}
        </p>
      ) : (
        <PenggunaKlien pengguna={data ?? []} idSaya={profil.id} />
      )}
    </>
  );
}
