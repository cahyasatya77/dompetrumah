import { Wallet } from "lucide-react";
import type { Metadata } from "next";

import { TombolGoogle } from "@/app/login/tombol-google";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export const metadata: Metadata = { title: "Masuk · DompetRumah" };

export default async function HalamanLogin({
  searchParams,
}: {
  searchParams: Promise<{ lanjut?: string }>;
}) {
  const { lanjut } = await searchParams;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-[var(--radius-app)] bg-primary text-primary-foreground">
            <Wallet className="h-6 w-6" aria-hidden />
          </span>
          <h1 className="text-xl font-semibold tracking-tight">DompetRumah</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pencatatan pengeluaran rumah tangga
          </p>
        </div>

        <Card>
          <CardHeader>
            <h2 className="text-sm font-medium">Masuk ke akun Anda</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Gunakan akun Google yang sudah didaftarkan admin.
            </p>
          </CardHeader>
          <CardContent>
            <TombolGoogle lanjut={lanjut} />
          </CardContent>
        </Card>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          Belum punya akses? Hubungi admin keluarga untuk mendaftarkan email
          Google Anda.
        </p>
      </div>
    </main>
  );
}
