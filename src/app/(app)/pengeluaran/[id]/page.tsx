import { ArrowLeft, FileText, ImageIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AksiTransaksi } from "@/app/(app)/pengeluaran/[id]/aksi-transaksi";
import { JudulHalaman } from "@/components/judul-halaman";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { punyaRole, wajibProfil } from "@/lib/auth";
import { BUCKET_STRUK, MASA_BERLAKU_TAUTAN } from "@/lib/konstanta";
import { buatSupabaseServer } from "@/lib/supabase/server";
import type {
  ApprovalRequestLengkap,
  Attachment,
  Category,
  ExpenseLengkap,
  Unit,
} from "@/lib/types";
import { LABEL_JENIS_REQUEST, LABEL_STATUS } from "@/lib/types";
import { formatRupiah, formatTanggal, formatWaktu } from "@/lib/utils";

export const metadata: Metadata = { title: "Detail Transaksi · DompetRumah" };

export default async function HalamanDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profil = await wajibProfil();
  const supabase = await buatSupabaseServer();

  const { data: transaksi } = await supabase
    .from("expenses")
    .select(
      "*, categories(nama), units(nama), pencatat:profiles!expenses_dicatat_oleh_fkey(nama, email)",
    )
    .eq("id", id)
    .maybeSingle<ExpenseLengkap>();

  if (!transaksi) notFound();

  const [{ data: lampiran }, { data: riwayat }, { data: kategori }, { data: satuan }] =
    await Promise.all([
      supabase
        .from("expense_attachments")
        .select("*")
        .eq("expense_id", id)
        .order("dibuat_pada")
        .returns<Attachment[]>(),
      supabase
        .from("approval_requests")
        .select(
          "*, pemohon:profiles!approval_requests_pemohon_id_fkey(nama, email), peninjau:profiles!approval_requests_peninjau_id_fkey(nama)",
        )
        .eq("expense_id", id)
        .order("dibuat_pada", { ascending: false })
        .returns<ApprovalRequestLengkap[]>(),
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

  // Tautan lampiran dibuat sesaat dan kedaluwarsa sendiri.
  const berkas = lampiran ?? [];
  let tautan: Record<string, string> = {};
  if (berkas.length > 0) {
    const { data: signed } = await supabase.storage
      .from(BUCKET_STRUK)
      .createSignedUrls(
        berkas.map((b) => b.path),
        MASA_BERLAKU_TAUTAN,
      );
    tautan = Object.fromEntries(
      (signed ?? [])
        .filter((s): s is typeof s & { path: string; signedUrl: string } =>
          Boolean(s.path && s.signedUrl),
        )
        .map((s) => [s.path, s.signedUrl]),
    );
  }

  const adaPending = (riwayat ?? []).some((r) => r.status === "pending");

  return (
    <>
      <Link
        href="/pengeluaran"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Kembali ke daftar
      </Link>

      <JudulHalaman
        judul={transaksi.categories?.nama ?? "Transaksi"}
        deskripsi={formatTanggal(transaksi.tanggal)}
        aksi={
          transaksi.dihapus_pada ? (
            <Badge nada="bahaya">Dihapus</Badge>
          ) : transaksi.status === "pending" ? (
            <Badge nada="peringatan">{LABEL_STATUS.pending}</Badge>
          ) : transaksi.status === "ditolak" ? (
            <Badge nada="bahaya">{LABEL_STATUS.ditolak}</Badge>
          ) : (
            <Badge nada="sukses">{LABEL_STATUS.aktif}</Badge>
          )
        }
      />

      <div className="space-y-4">
        <Card>
          <CardContent className="pt-4">
            <dl className="grid gap-4 sm:grid-cols-2">
              <Baris label="Harga satuan" nilai={formatRupiah(Number(transaksi.nominal))} />
              <Baris
                label="Kuantiti"
                nilai={`${transaksi.kuantiti}${transaksi.units?.nama ? ` ${transaksi.units.nama}` : ""}`}
              />
              <Baris
                label="Total"
                nilai={formatRupiah(Number(transaksi.total))}
                tebal
              />
              <Baris label="Dicatat oleh" nilai={transaksi.pencatat?.nama ?? "—"} />
              <Baris
                label="Waktu pencatatan"
                nilai={formatWaktu(transaksi.dibuat_pada)}
              />
              {transaksi.keterangan && (
                <div className="sm:col-span-2">
                  <dt className="text-xs text-muted-foreground">Keterangan</dt>
                  <dd className="mt-0.5">{transaksi.keterangan}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lampiran struk</CardTitle>
          </CardHeader>
          <CardContent>
            {berkas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tidak ada lampiran.</p>
            ) : (
              <ul className="space-y-2">
                {berkas.map((b) => (
                  <li key={b.id}>
                    <a
                      href={tautan[b.path] ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 rounded-[var(--radius-app)] border border-border px-3 py-2 text-sm transition hover:bg-muted"
                    >
                      {b.mime === "application/pdf" ? (
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                      ) : (
                        <ImageIcon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                      )}
                      <span className="min-w-0 flex-1 truncate">{b.nama_file}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">Buka</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <AksiTransaksi
          transaksi={transaksi}
          kategori={kategori ?? []}
          satuan={satuan ?? []}
          profilId={profil.id}
          langsung={punyaRole(profil.role, "supervisor")}
          adaPending={adaPending}
        />

        {(riwayat ?? []).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Riwayat persetujuan</CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0 sm:px-0">
              <ul className="divide-y divide-border border-t border-border">
                {(riwayat ?? []).map((r) => (
                  <li key={r.id} className="px-4 py-3 sm:px-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">
                        {LABEL_JENIS_REQUEST[r.jenis]}
                      </span>
                      <Badge
                        nada={
                          r.status === "approved"
                            ? "sukses"
                            : r.status === "rejected"
                              ? "bahaya"
                              : "peringatan"
                        }
                      >
                        {r.status === "approved"
                          ? "Disetujui"
                          : r.status === "rejected"
                            ? "Ditolak"
                            : "Menunggu"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatWaktu(r.dibuat_pada)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Diajukan {r.pemohon?.nama ?? "—"}
                      {r.alasan ? ` · ${r.alasan}` : ""}
                    </p>
                    {r.catatan_peninjau && (
                      <p className="mt-1 text-sm">
                        Catatan {r.peninjau?.nama ?? "peninjau"}: {r.catatan_peninjau}
                      </p>
                    )}
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

function Baris({
  label,
  nilai,
  tebal,
}: {
  label: string;
  nilai: string;
  tebal?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={
          "mt-0.5 tabular-nums " + (tebal ? "text-lg font-semibold" : "font-medium")
        }
      >
        {nilai}
      </dd>
    </div>
  );
}
