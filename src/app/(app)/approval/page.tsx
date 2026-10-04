import type { Metadata } from "next";

import { KartuRequest } from "@/app/(app)/approval/approval-klien";
import { JudulHalaman } from "@/components/judul-halaman";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { wajibRole } from "@/lib/auth";
import { buatSupabaseServer } from "@/lib/supabase/server";
import type { ApprovalRequestLengkap, Category } from "@/lib/types";
import { LABEL_JENIS_REQUEST } from "@/lib/types";
import { formatWaktu } from "@/lib/utils";

export const metadata: Metadata = { title: "Approval · DompetRumah" };

const PILIH =
  "*, pemohon:profiles!approval_requests_pemohon_id_fkey(nama, email), " +
  "peninjau:profiles!approval_requests_peninjau_id_fkey(nama), " +
  "expenses(*, categories(nama), units(nama), pencatat:profiles!expenses_dicatat_oleh_fkey(nama, email))";

export default async function HalamanApproval() {
  await wajibRole("supervisor");
  const supabase = await buatSupabaseServer();

  const [{ data: pending, error }, { data: selesai }, { data: kategori }] =
    await Promise.all([
      supabase
        .from("approval_requests")
        .select(PILIH)
        .eq("status", "pending")
        .order("dibuat_pada", { ascending: true })
        .returns<ApprovalRequestLengkap[]>(),
      supabase
        .from("approval_requests")
        .select(PILIH)
        .neq("status", "pending")
        .order("ditinjau_pada", { ascending: false })
        .limit(20)
        .returns<ApprovalRequestLengkap[]>(),
      supabase.from("categories").select("*").returns<Category[]>(),
    ]);

  const namaKategori = Object.fromEntries(
    (kategori ?? []).map((k) => [k.id, k.nama]),
  );
  const antre = pending ?? [];

  return (
    <>
      <JudulHalaman
        judul="Approval"
        deskripsi="Permintaan yang menunggu keputusan Anda."
        aksi={
          antre.length > 0 ? (
            <Badge nada="peringatan">{antre.length} menunggu</Badge>
          ) : undefined
        }
      />

      {error ? (
        <p className="rounded-[var(--radius-app)] bg-destructive/12 px-3 py-2 text-sm text-destructive">
          Gagal memuat permintaan: {error.message}
        </p>
      ) : antre.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Tidak ada permintaan yang menunggu. Semua beres.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {antre.map((r) => (
            <KartuRequest key={r.id} req={r} namaKategori={namaKategori} />
          ))}
        </div>
      )}

      {(selesai ?? []).length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Riwayat keputusan</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0 sm:px-0">
            <ul className="divide-y divide-border border-t border-border">
              {(selesai ?? []).map((r) => (
                <li key={r.id} className="px-4 py-3 sm:px-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">
                      {LABEL_JENIS_REQUEST[r.jenis]}
                    </span>
                    <Badge nada={r.status === "approved" ? "sukses" : "bahaya"}>
                      {r.status === "approved" ? "Disetujui" : "Ditolak"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {r.ditinjau_pada ? formatWaktu(r.ditinjau_pada) : ""}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {r.pemohon?.nama ?? "—"} → {r.peninjau?.nama ?? "—"}
                    {r.catatan_peninjau ? ` · ${r.catatan_peninjau}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </>
  );
}
