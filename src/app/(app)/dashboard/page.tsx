import { ClipboardCheck, Plus, ReceiptText, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { JudulHalaman } from "@/components/judul-halaman";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { punyaRole, wajibProfil } from "@/lib/auth";
import { buatSupabaseServer } from "@/lib/supabase/server";
import type { ExpenseLengkap } from "@/lib/types";
import { LABEL_ROLE } from "@/lib/types";
import { formatRupiah, formatTanggal } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard · DompetRumah" };

/** Batas awal dan akhir bulan berjalan dalam zona Asia/Jakarta. */
function rentangBulanIni() {
  const sekarang = new Date();
  const wib = new Date(sekarang.getTime() + 7 * 60 * 60 * 1000);
  const tahun = wib.getUTCFullYear();
  const bulan = wib.getUTCMonth();
  const awal = new Date(Date.UTC(tahun, bulan, 1)).toISOString().slice(0, 10);
  const akhir = new Date(Date.UTC(tahun, bulan + 1, 1)).toISOString().slice(0, 10);
  const label = new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(tahun, bulan, 1)));
  return { awal, akhir, label };
}

export default async function HalamanDashboard() {
  const profil = await wajibProfil();
  const supabase = await buatSupabaseServer();
  const { awal, akhir, label } = rentangBulanIni();

  const [{ data: bulanIni }, { data: terbaru }, { count: pending }] =
    await Promise.all([
      supabase
        .from("expenses")
        .select("total")
        .eq("status", "aktif")
        .is("dihapus_pada", null)
        .gte("tanggal", awal)
        .lt("tanggal", akhir)
        .returns<{ total: number }[]>(),
      supabase
        .from("expenses")
        .select("*, categories(nama), units(nama), pencatat:profiles!expenses_dicatat_oleh_fkey(nama, email)")
        .is("dihapus_pada", null)
        .order("tanggal", { ascending: false })
        .order("dibuat_pada", { ascending: false })
        .limit(5)
        .returns<ExpenseLengkap[]>(),
      supabase
        .from("approval_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
    ]);

  const total = (bulanIni ?? []).reduce((n, r) => n + Number(r.total), 0);
  const jumlahPending = pending ?? 0;

  return (
    <>
      <JudulHalaman
        judul={`Halo, ${profil.nama.split(" ")[0]}`}
        deskripsi={`Ringkasan pengeluaran ${label}.`}
        aksi={<Badge nada="primary">{LABEL_ROLE[profil.role]}</Badge>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KartuStat
          ikon={<Wallet className="h-5 w-5" aria-hidden />}
          label={`Pengeluaran ${label}`}
          nilai={formatRupiah(total)}
        />
        <KartuStat
          ikon={<ReceiptText className="h-5 w-5" aria-hidden />}
          label="Transaksi bulan ini"
          nilai={String((bulanIni ?? []).length)}
        />
        {punyaRole(profil.role, "supervisor") && (
          <Link href="/approval" className="block">
            <KartuStat
              ikon={<ClipboardCheck className="h-5 w-5" aria-hidden />}
              label="Menunggu persetujuan"
              nilai={String(jumlahPending)}
              catatan={jumlahPending > 0 ? "Perlu ditinjau" : "Semua beres"}
            />
          </Link>
        )}
      </div>

      <Card className="mt-5">
        <CardHeader className="flex items-center justify-between gap-3">
          <CardTitle>Transaksi terbaru</CardTitle>
          <Link href="/pengeluaran/baru">
            <Button ukuran="sm">
              <Plus className="h-4 w-4" aria-hidden /> Catat
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="px-0 pb-0 sm:px-0">
          {(terbaru ?? []).length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground sm:px-5">
              Belum ada transaksi. Mulai dengan mencatat pengeluaran pertama.
            </p>
          ) : (
            <ul className="divide-y divide-border border-t border-border">
              {(terbaru ?? []).map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/pengeluaran/${t.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-muted sm:px-5"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">
                          {t.categories?.nama ?? "Tanpa kategori"}
                        </span>
                        {t.status === "pending" && (
                          <Badge nada="peringatan">Pending</Badge>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatTanggal(t.tanggal)} · {t.pencatat?.nama ?? "—"}
                      </p>
                    </div>
                    <span className="shrink-0 font-semibold tabular-nums">
                      {formatRupiah(Number(t.total))}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
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
    <Card className="h-full">
      <CardContent className="flex items-center gap-4 pt-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-app)] bg-accent text-accent-foreground">
          {ikon}
        </span>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tracking-tight tabular-nums">
            {nilai}
          </p>
          {catatan && <p className="text-xs text-muted-foreground">{catatan}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
