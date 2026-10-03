import type { Metadata } from "next";

import { KategoriKlien } from "@/app/(app)/kategori/kategori-klien";
import { JudulHalaman } from "@/components/judul-halaman";
import { punyaRole, wajibRole } from "@/lib/auth";
import { buatSupabaseServer } from "@/lib/supabase/server";
import type { Category } from "@/lib/types";

export const metadata: Metadata = { title: "Master Kategori · DompetRumah" };

export default async function HalamanKategori() {
  const profil = await wajibRole("supervisor");
  const supabase = await buatSupabaseServer();

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("aktif", { ascending: false })
    .order("nama", { ascending: true })
    .returns<Category[]>();

  return (
    <>
      <JudulHalaman
        judul="Master Kategori"
        deskripsi="Kelompok pengeluaran yang dipakai saat mencatat transaksi."
      />

      {error ? (
        <p className="rounded-[var(--radius-app)] bg-destructive/12 px-3 py-2 text-sm text-destructive">
          Gagal memuat kategori: {error.message}
        </p>
      ) : (
        <KategoriKlien
          kategori={data ?? []}
          bisaHapus={punyaRole(profil.role, "admin")}
        />
      )}
    </>
  );
}
