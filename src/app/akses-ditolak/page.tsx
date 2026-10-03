import { ShieldAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export const metadata: Metadata = { title: "Akses ditolak · DompetRumah" };

const PESAN: Record<string, { judul: string; isi: string }> = {
  "tidak-terdaftar": {
    judul: "Email belum terdaftar",
    isi: "Akun Google ini belum didaftarkan di DompetRumah. Minta admin keluarga menambahkan email Anda di menu Master Pengguna.",
  },
  nonaktif: {
    judul: "Akun dinonaktifkan",
    isi: "Akun Anda ada, tetapi statusnya nonaktif. Hubungi admin untuk mengaktifkan kembali.",
  },
  oauth: {
    judul: "Login gagal",
    isi: "Proses login dengan Google tidak selesai. Silakan coba lagi.",
  },
};

export default async function HalamanAksesDitolak({
  searchParams,
}: {
  searchParams: Promise<{ alasan?: string; email?: string }>;
}) {
  const { alasan, email } = await searchParams;
  const pesan = PESAN[alasan ?? ""] ?? PESAN["tidak-terdaftar"];

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-[var(--radius-app)] bg-destructive/15 text-destructive">
            <ShieldAlert className="h-5 w-5" aria-hidden />
          </span>
          <h1 className="text-base font-semibold tracking-tight">{pesan.judul}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{pesan.isi}</p>
          {email && (
            <p className="mt-3 rounded-[var(--radius-app)] bg-muted px-3 py-2 text-xs break-all text-muted-foreground">
              {email}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <Link href="/login">
            <Button className="w-full" varian="outline">
              Kembali ke halaman masuk
            </Button>
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
