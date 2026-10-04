import { BellOff } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { tandaiSemuaDibaca } from "@/app/(app)/notifikasi/actions";
import { JudulHalaman } from "@/components/judul-halaman";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { wajibProfil } from "@/lib/auth";
import { buatSupabaseServer } from "@/lib/supabase/server";
import type { Notifikasi } from "@/lib/types";
import { cn, formatWaktu } from "@/lib/utils";

export const metadata: Metadata = { title: "Notifikasi · DompetRumah" };

export default async function HalamanNotifikasi() {
  const profil = await wajibProfil();
  const supabase = await buatSupabaseServer();

  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("penerima_id", profil.id)
    .order("dibuat_pada", { ascending: false })
    .limit(50)
    .returns<Notifikasi[]>();

  const notif = data ?? [];
  const belumDibaca = notif.filter((n) => !n.dibaca_pada).length;

  return (
    <>
      <JudulHalaman
        judul="Notifikasi"
        deskripsi={
          belumDibaca > 0 ? `${belumDibaca} belum dibaca` : "Semua sudah dibaca"
        }
        aksi={
          belumDibaca > 0 ? (
            <form
              action={async () => {
                "use server";
                await tandaiSemuaDibaca();
              }}
            >
              <Button type="submit" varian="outline" ukuran="sm">
                Tandai semua dibaca
              </Button>
            </form>
          ) : undefined
        }
      />

      {notif.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <BellOff className="mx-auto mb-3 h-6 w-6 text-muted-foreground" aria-hidden />
            <p className="text-sm text-muted-foreground">Belum ada notifikasi.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="px-0 pb-0 sm:px-0">
            <ul className="divide-y divide-border">
              {notif.map((n) => {
                const isi = (
                  <div className="flex gap-3 px-4 py-3 sm:px-5">
                    <span
                      className={cn(
                        "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                        n.dibaca_pada ? "bg-transparent" : "bg-primary",
                      )}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-sm",
                          n.dibaca_pada ? "text-muted-foreground" : "font-medium",
                        )}
                      >
                        {n.judul}
                      </p>
                      {n.pesan && (
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {n.pesan}
                        </p>
                      )}
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatWaktu(n.dibuat_pada)}
                      </p>
                    </div>
                  </div>
                );

                return (
                  <li key={n.id}>
                    {n.tautan ? (
                      <Link href={n.tautan} className="block transition hover:bg-muted">
                        {isi}
                      </Link>
                    ) : (
                      isi
                    )}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </>
  );
}
