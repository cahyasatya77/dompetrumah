"use client";

import { Check, X } from "lucide-react";
import { useActionState, useState } from "react";

import { setujuiRequest, tolakRequest } from "@/app/(app)/approval/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/field";
import { Pesan, TombolSubmit } from "@/components/ui/pesan";
import type { ApprovalRequestLengkap } from "@/lib/types";
import { LABEL_JENIS_REQUEST } from "@/lib/types";
import { formatRupiah, formatTanggal, formatWaktu } from "@/lib/utils";

export function KartuRequest({
  req,
  namaKategori,
}: {
  req: ApprovalRequestLengkap;
  /** Peta id kategori -> nama, untuk menerjemahkan usulan perubahan. */
  namaKategori: Record<string, string>;
}) {
  const [hasilSetuju, setuju] = useActionState(setujuiRequest, null);
  const [hasilTolak, tolak] = useActionState(tolakRequest, null);
  const [mode, setMode] = useState<"idle" | "setuju" | "tolak">("idle");

  const t = req.expenses;
  const perubahan = req.perubahan as Record<string, unknown> | null;
  const sebelum = req.data_sebelum as Record<string, unknown> | null;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>{LABEL_JENIS_REQUEST[req.jenis]}</CardTitle>
          <Badge nada="peringatan">Menunggu</Badge>
          <span className="text-xs text-muted-foreground">
            {formatWaktu(req.dibuat_pada)}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Diajukan {req.pemohon?.nama ?? "—"}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {t && (
          <div className="rounded-[var(--radius-app)] bg-muted px-4 py-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-medium">
                {t.categories?.nama ?? "Tanpa kategori"}
              </span>
              <span className="text-lg font-semibold tabular-nums">
                {formatRupiah(Number(t.total))}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {formatTanggal(t.tanggal)} · {t.kuantiti}
              {t.units?.nama ? ` ${t.units.nama}` : ""} ×{" "}
              {formatRupiah(Number(t.nominal))}
            </p>
            {t.keterangan && (
              <p className="mt-1 text-sm text-muted-foreground">{t.keterangan}</p>
            )}
          </div>
        )}

        {req.alasan && (
          <div>
            <p className="text-xs text-muted-foreground">Alasan pemohon</p>
            <p className="mt-0.5 text-sm">{req.alasan}</p>
          </div>
        )}

        {req.jenis === "update" && perubahan && (
          <div>
            <p className="mb-2 text-xs text-muted-foreground">Usulan perubahan</p>
            <ul className="space-y-1 text-sm">
              {bandingkan(sebelum, perubahan, namaKategori).map((b) => (
                <li key={b.kunci} className="flex flex-wrap items-baseline gap-2">
                  <span className="text-muted-foreground">{b.label}:</span>
                  <span className="text-muted-foreground line-through">{b.lama}</span>
                  <span aria-hidden>→</span>
                  <span className="font-medium">{b.baru}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {mode === "idle" ? (
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setMode("setuju")}>
              <Check className="h-4 w-4" aria-hidden /> Setujui
            </Button>
            <Button varian="outline" className="text-destructive" onClick={() => setMode("tolak")}>
              <X className="h-4 w-4" aria-hidden /> Tolak
            </Button>
          </div>
        ) : (
          <form
            action={mode === "setuju" ? setuju : tolak}
            className="space-y-3 rounded-[var(--radius-app)] border border-border p-3"
          >
            <input type="hidden" name="id" value={req.id} />
            <div>
              <Label htmlFor={`catatan-${req.id}`}>Catatan (opsional)</Label>
              <Input
                id={`catatan-${req.id}`}
                name="catatan"
                maxLength={300}
                placeholder={
                  mode === "setuju" ? "Mis. sudah dicek strukenya" : "Mis. nominal tidak sesuai struk"
                }
              />
            </div>
            <div className="flex gap-2">
              <TombolSubmit
                varian={mode === "setuju" ? "primary" : "destructive"}
                ukuran="sm"
                labelProses="Memproses…"
              >
                {mode === "setuju" ? "Konfirmasi setuju" : "Konfirmasi tolak"}
              </TombolSubmit>
              <Button varian="outline" ukuran="sm" onClick={() => setMode("idle")}>
                Batal
              </Button>
            </div>
          </form>
        )}

        <Pesan hasil={hasilSetuju?.ok === false ? hasilSetuju : null} />
        <Pesan hasil={hasilTolak?.ok === false ? hasilTolak : null} />
      </CardContent>
    </Card>
  );
}

const LABEL_FIELD: Record<string, string> = {
  tanggal: "Tanggal",
  category_id: "Kategori",
  keterangan: "Keterangan",
  nominal: "Harga satuan",
  kuantiti: "Kuantiti",
  unit_id: "Satuan",
};

/** Menyusun daftar field yang berubah, sudah diterjemahkan untuk dibaca. */
function bandingkan(
  sebelum: Record<string, unknown> | null,
  sesudah: Record<string, unknown>,
  namaKategori: Record<string, string>,
) {
  return Object.keys(LABEL_FIELD)
    .filter((k) => String(sebelum?.[k] ?? "") !== String(sesudah[k] ?? ""))
    .map((k) => ({
      kunci: k,
      label: LABEL_FIELD[k],
      lama: tampil(k, sebelum?.[k], namaKategori),
      baru: tampil(k, sesudah[k], namaKategori),
    }));
}

function tampil(
  kunci: string,
  nilai: unknown,
  namaKategori: Record<string, string>,
): string {
  if (nilai === null || nilai === undefined || nilai === "") return "—";
  if (kunci === "category_id") return namaKategori[String(nilai)] ?? "kategori lain";
  if (kunci === "nominal") return formatRupiah(Number(nilai));
  if (kunci === "tanggal") return formatTanggal(String(nilai));
  return String(nilai);
}
