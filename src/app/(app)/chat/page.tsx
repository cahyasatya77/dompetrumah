import type { Metadata } from "next";

import { ChatKlien } from "@/app/(app)/chat/chat-klien";
import { JudulHalaman } from "@/components/judul-halaman";
import { aiAktif } from "@/lib/ai";
import { wajibProfil } from "@/lib/auth";

export const metadata: Metadata = { title: "Tanya AI · DompetRumah" };

export default async function HalamanChat() {
  await wajibProfil();

  return (
    <>
      <JudulHalaman
        judul="Tanya AI"
        deskripsi="Bertanya soal pengeluaran keluarga dengan bahasa sehari-hari."
      />
      <ChatKlien aktif={aiAktif()} />
    </>
  );
}
