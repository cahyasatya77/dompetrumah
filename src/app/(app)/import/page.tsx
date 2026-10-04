import type { Metadata } from "next";

import { ImportKlien } from "@/app/(app)/import/import-klien";
import { JudulHalaman } from "@/components/judul-halaman";
import { wajibRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Import Data · DompetRumah" };

export default async function HalamanImport() {
  await wajibRole("admin");

  return (
    <>
      <JudulHalaman
        judul="Import Data"
        deskripsi="Isi master kategori, pengguna, atau saldo awal sekaligus dari Google Sheets."
      />
      <ImportKlien />
    </>
  );
}
