import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { FilterTransaksi } from "@/app/(app)/pengeluaran/filter-transaksi";
import { JudulHalaman } from "@/components/judul-halaman";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { wajibProfil } from "@/lib/auth";
import { buatSupabaseServer } from "@/lib/supabase/server";
import type { Category, ExpenseLengkap, Profile } from "@/lib/types";
import { formatRupiah, formatTanggal } from "@/lib/utils";

export const metadata: Metadata = { title: "Pengeluaran · DompetRumah" };

const PILIH =
  "*, categories(nama), units(nama), pencatat:profiles!expenses_dicatat_oleh_fkey(nama, email)";

export default async function HalamanPengeluaran({
  searchParams,
}: {
  searchParams: Promise<{ bulan?: string; kategori?: string; user?: string }>;
}) {
  await wajibProfil();
  const { bulan, kategori: idKategori, user: idUser } = await searchParams;
  const supabase = await buatSupabaseServer();

  let kueri = supabase
    .from("expenses")
    .select(PILIH)
    .is("dihapus_pada", null)
    .order("tanggal", { ascending: false })
    .order("dibuat_pada", { ascending: false })
    .limit(200);

  if (bulan && /^\d{4}-\d{2}$/.test(bulan)) {
    const [t, b] = bulan.split("-").map(Number);
    const awal = `${bulan}-01`;
    const akhirDate = new Date(Date.UTC(t, b, 1));
    const akhir = akhirDate.toISOString().slice(0, 10);
    kueri = kueri.gte("tanggal", awal).lt("tanggal", akhir);
  }
  if (idKategori) kueri = kueri.eq("category_id", idKategori);
  if (idUser) kueri = kueri.eq("dicatat_oleh", idUser);

  const [{ data, error }, { data: kategori }, { data: pengguna }, { data: semuaTanggal }] =
    await Promise.all([
      kueri.returns<ExpenseLengkap[]>(),
      supabase.from("categories").select("*").order("nama").returns<Category[]>(),
      supabase
        .from("profiles")
        .select("id, nama")
        .order("nama")
        .returns<Pick<Profile, "id" | "nama">[]>(),
      supabase
        .from("expenses")
        .select("tanggal")
        .is("dihapus_pada", null)
        .order("tanggal", { ascending: false })
        .limit(500)
        .returns<{ tanggal: string }[]>(),
    ]);

  const transaksi = data ?? [];
  const totalAktif = transaksi
    .filter((t) => t.status === "aktif")
    .reduce((n, t) => n + Number(t.total), 0);
  const jumlahPending = transaksi.filter((t) => t.status === "pending").length;

  const bulanTersedia = [
    ...new Set((semuaTanggal ?? []).map((r) => r.tanggal.slice(0, 7))),
  ];

  return (
    <>
      <JudulHalaman
        judul="Pengeluaran"
        deskripsi="Semua pencatatan anggota keluarga."
        aksi={
          <Link href="/pengeluaran/baru">
            <Button>
              <Plus className="h-4 w-4" aria-hidden /> Catat
            </Button>
          </Link>
        }
      />

      <div className="space-y-4">
        <FilterTransaksi
          kategori={kategori ?? []}
          pengguna={pengguna ?? []}
          bulanTersedia={bulanTersedia}
        />

        <Card>
          <CardContent className="flex flex-wrap items-baseline justify-between gap-3 pt-4">
            <div>
              <p className="text-sm text-muted-foreground">
                Total tercatat ({transaksi.filter((t) => t.status === "aktif").length} transaksi)
              </p>
              <p className="text-2xl font-semibold tabular-nums">
                {formatRupiah(totalAktif)}
              </p>
            </div>
            {jumlahPending > 0 && (
              <Badge nada="peringatan">
                {jumlahPending} menunggu persetujuan
              </Badge>
            )}
          </CardContent>
        </Card>

        {error ? (
          <p className="rounded-[var(--radius-app)] bg-destructive/12 px-3 py-2 text-sm text-destructive">
            Gagal memuat transaksi: {error.message}
          </p>
        ) : transaksi.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-sm text-muted-foreground">
                Belum ada transaksi untuk filter ini.
              </p>
              <Link href="/pengeluaran/baru" className="mt-3 inline-block">
                <Button varian="outline">Catat pengeluaran pertama</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="px-0 pb-0 sm:px-0">
              <ul className="divide-y divide-border">
                {transaksi.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/pengeluaran/${t.id}`}
                      className="flex items-start justify-between gap-3 px-4 py-3 transition hover:bg-muted sm:px-5"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">
                            {t.categories?.nama ?? "Tanpa kategori"}
                          </span>
                          {t.status === "pending" && (
                            <Badge nada="peringatan">Pending</Badge>
                          )}
                          {t.status === "ditolak" && (
                            <Badge nada="bahaya">Ditolak</Badge>
                          )}
                        </div>
                        {t.keterangan && (
                          <p className="mt-0.5 truncate text-sm text-muted-foreground">
                            {t.keterangan}
                          </p>
                        )}
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatTanggal(t.tanggal)} · {t.pencatat?.nama ?? "—"}
                          {t.units?.nama
                            ? ` · ${t.kuantiti} ${t.units.nama} × ${formatRupiah(Number(t.nominal))}`
                            : ""}
                        </p>
                      </div>
                      <span
                        className={
                          "shrink-0 font-semibold tabular-nums " +
                          (t.status === "aktif" ? "" : "text-muted-foreground line-through")
                        }
                      >
                        {formatRupiah(Number(t.total))}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
