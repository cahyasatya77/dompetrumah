import { FolderTree, Users, Wallet } from "lucide-react";
import type { Metadata } from "next";

import { JudulHalaman } from "@/components/judul-halaman";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { punyaRole, wajibProfil } from "@/lib/auth";
import { buatSupabaseServer } from "@/lib/supabase/server";
import { LABEL_ROLE } from "@/lib/types";
import { formatWaktu } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard · DompetRumah" };

export default async function HalamanDashboard() {
  const profil = await wajibProfil();
  const supabase = await buatSupabaseServer();

  const [{ count: jumlahKategori }, { count: jumlahPengguna }] = await Promise.all([
    supabase
      .from("categories")
      .select("id", { count: "exact", head: true })
      .eq("aktif", true),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("aktif", true),
  ]);

  return (
    <>
      <JudulHalaman
        judul={`Halo, ${profil.nama.split(" ")[0]}`}
        deskripsi="Ringkasan DompetRumah. Pencatatan pengeluaran menyusul di Fase 2."
        aksi={<Badge nada="primary">{LABEL_ROLE[profil.role]}</Badge>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KartuStat
          ikon={<FolderTree className="h-5 w-5" aria-hidden />}
          label="Kategori aktif"
          nilai={String(jumlahKategori ?? 0)}
        />
        {punyaRole(profil.role, "admin") && (
          <KartuStat
            ikon={<Users className="h-5 w-5" aria-hidden />}
            label="Pengguna aktif"
            nilai={String(jumlahPengguna ?? 0)}
          />
        )}
        <KartuStat
          ikon={<Wallet className="h-5 w-5" aria-hidden />}
          label="Pengeluaran bulan ini"
          nilai="—"
          catatan="Tersedia di Fase 2"
        />
      </div>

      <Card className="mt-5">
        <CardHeader>
          <CardTitle>Akun Anda</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <Baris label="Nama" nilai={profil.nama} />
            <Baris label="Email" nilai={profil.email} />
            <Baris label="Role" nilai={LABEL_ROLE[profil.role]} />
            <Baris
              label="Login terakhir"
              nilai={
                profil.login_terakhir ? formatWaktu(profil.login_terakhir) : "—"
              }
            />
          </dl>
        </CardContent>
      </Card>
    </>
  );
}

function KartuStat({
  ikon,
  label,
  nilai,
  catatan,
}: {
  ikon: React.ReactNode;
  label: string;
  nilai: string;
  catatan?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-app)] bg-accent text-accent-foreground">
          {ikon}
        </span>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tracking-tight tabular-nums">
            {nilai}
          </p>
          {catatan && (
            <p className="text-xs text-muted-foreground">{catatan}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Baris({ label, nilai }: { label: string; nilai: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium break-words">{nilai}</dd>
    </div>
  );
}
