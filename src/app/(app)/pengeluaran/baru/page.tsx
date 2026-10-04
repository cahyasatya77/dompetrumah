import type { Metadata } from "next";

import { tambahPengeluaran } from "@/app/(app)/pengeluaran/actions";
import { KartuFormPengeluaran } from "@/app/(app)/pengeluaran/form-pengeluaran";
import { JudulHalaman } from "@/components/judul-halaman";
import { wajibProfil } from "@/lib/auth";
import { BATAS_APPROVAL } from "@/lib/konstanta";
import { buatSupabaseServer } from "@/lib/supabase/server";
import type { Category, Unit } from "@/lib/types";
import { formatRupiah } from "@/lib/utils";

export const metadata: Metadata = { title: "Catat Pengeluaran · DompetRumah" };

export default async function HalamanCatat() {
  const profil = await wajibProfil();
  const supabase = await buatSupabaseServer();

  const [{ data: kategori }, { data: satuan }] = await Promise.all([
    supabase
      .from("categories")
      .select("*")
      .eq("aktif", true)
      .order("nama")
      .returns<Category[]>(),
    supabase
      .from("units")
      .select("*")
      .eq("aktif", true)
      .order("nama")
      .returns<Unit[]>(),
  ]);

  return (
    <>
      <JudulHalaman
        judul="Catat Pengeluaran"
        deskripsi={
          profil.role === "user"
            ? `Di atas ${formatRupiah(BATAS_APPROVAL)} akan menunggu persetujuan supervisor.`
            : "Tersimpan langsung tanpa persetujuan."
        }
      />

      <KartuFormPengeluaran
        judul="Rincian transaksi"
        kategori={kategori ?? []}
        satuan={satuan ?? []}
        profilId={profil.id}
        aksi={tambahPengeluaran}
        labelTombol="Simpan pengeluaran"
      />
    </>
  );
}
