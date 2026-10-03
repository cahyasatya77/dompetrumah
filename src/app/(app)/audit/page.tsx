import type { Metadata } from "next";

import { JudulHalaman } from "@/components/judul-halaman";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { wajibRole } from "@/lib/auth";
import { buatSupabaseServer } from "@/lib/supabase/server";
import type { AuditLog } from "@/lib/types";
import { formatWaktu } from "@/lib/utils";

export const metadata: Metadata = { title: "Audit Log · DompetRumah" };

const LABEL_AKSI: Record<string, { teks: string; nada: "netral" | "primary" | "sukses" | "peringatan" | "bahaya" }> = {
  create: { teks: "Tambah", nada: "sukses" },
  update: { teks: "Ubah", nada: "primary" },
  delete: { teks: "Hapus", nada: "bahaya" },
  login: { teks: "Login", nada: "netral" },
  activate: { teks: "Aktifkan", nada: "sukses" },
  deactivate: { teks: "Nonaktifkan", nada: "peringatan" },
  role_change: { teks: "Ganti role", nada: "peringatan" },
  import: { teks: "Import", nada: "primary" },
};

export default async function HalamanAudit() {
  await wajibRole("admin");
  const supabase = await buatSupabaseServer();

  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .order("dibuat_pada", { ascending: false })
    .limit(100)
    .returns<AuditLog[]>();

  const log = data ?? [];

  return (
    <>
      <JudulHalaman
        judul="Audit Log"
        deskripsi="100 aktivitas terakhir. Catatan ini permanen dan tidak bisa diubah."
      />

      {error ? (
        <p className="rounded-[var(--radius-app)] bg-destructive/12 px-3 py-2 text-sm text-destructive">
          Gagal memuat audit log: {error.message}
        </p>
      ) : log.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Belum ada aktivitas tercatat.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="px-0 pb-0 sm:px-0">
            <ul className="divide-y divide-border">
              {log.map((l) => {
                const aksi = LABEL_AKSI[l.aksi] ?? { teks: l.aksi, nada: "netral" as const };
                return (
                  <li key={l.id} className="px-4 py-3 sm:px-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge nada={aksi.nada}>{aksi.teks}</Badge>
                      <span className="text-sm font-medium">{l.tabel}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatWaktu(l.dibuat_pada)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {l.aktor_email ?? "sistem"}
                      {l.catatan ? ` · ${l.catatan}` : ""}
                    </p>
                    {(l.data_sebelum !== null || l.data_sesudah !== null) && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                          Lihat detail perubahan
                        </summary>
                        <pre className="mt-2 overflow-x-auto rounded-[var(--radius-app)] bg-muted p-3 text-xs">
                          {JSON.stringify(
                            { sebelum: l.data_sebelum, sesudah: l.data_sesudah },
                            null,
                            2,
                          )}
                        </pre>
                      </details>
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
