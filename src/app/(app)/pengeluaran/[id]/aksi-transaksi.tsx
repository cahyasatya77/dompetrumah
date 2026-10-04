"use client";

import { Pencil, Trash2, X } from "lucide-react";
import { useActionState, useState } from "react";

import {
  ajukanHapus,
  ajukanUbah,
  hapusPengeluaran,
  ubahPengeluaran,
} from "@/app/(app)/pengeluaran/actions";
import { FormPengeluaran } from "@/app/(app)/pengeluaran/form-pengeluaran";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Hint, Label, Textarea } from "@/components/ui/field";
import { Pesan, TombolSubmit } from "@/components/ui/pesan";
import type { Category, Expense, Unit } from "@/lib/types";

type Props = {
  transaksi: Expense;
  kategori: Category[];
  satuan: Unit[];
  profilId: string;
  /** Supervisor & admin mengubah langsung; user mengajukan permintaan. */
  langsung: boolean;
  /** Masih ada permintaan yang menggantung untuk transaksi ini. */
  adaPending: boolean;
};

export function AksiTransaksi({
  transaksi,
  kategori,
  satuan,
  profilId,
  langsung,
  adaPending,
}: Props) {
  const [mode, setMode] = useState<"idle" | "ubah" | "hapus">("idle");

  if (transaksi.dihapus_pada) return null;

  if (adaPending) {
    return (
      <Card>
        <CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">
            Transaksi ini sedang menunggu keputusan supervisor. Permintaan baru
            bisa diajukan setelah yang ini selesai.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (mode === "idle") {
    return (
      <div className="flex flex-wrap gap-2">
        <Button varian="outline" onClick={() => setMode("ubah")}>
          <Pencil className="h-4 w-4" aria-hidden />
          {langsung ? "Ubah" : "Ajukan perubahan"}
        </Button>
        <Button
          varian="outline"
          onClick={() => setMode("hapus")}
          className="text-destructive"
        >
          <Trash2 className="h-4 w-4" aria-hidden />
          {langsung ? "Hapus" : "Ajukan penghapusan"}
        </Button>
      </div>
    );
  }

  if (mode === "ubah") {
    return (
      <Card>
        <CardHeader className="flex items-center justify-between gap-3">
          <CardTitle>
            {langsung ? "Ubah transaksi" : "Ajukan perubahan transaksi"}
          </CardTitle>
          <Button varian="ghost" ukuran="icon" onClick={() => setMode("idle")} aria-label="Tutup">
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </CardHeader>
        <CardContent>
          <FormPengeluaran
            kategori={kategori}
            satuan={satuan}
            profilId={profilId}
            aksi={langsung ? ubahPengeluaran : ajukanUbah}
            awal={transaksi}
            perluAlasan={!langsung}
            pakaiLampiran={false}
            labelTombol={langsung ? "Simpan perubahan" : "Kirim permintaan"}
            onSelesai={() => setMode("idle")}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <FormHapus
      transaksi={transaksi}
      langsung={langsung}
      onBatal={() => setMode("idle")}
    />
  );
}

function FormHapus({
  transaksi,
  langsung,
  onBatal,
}: {
  transaksi: Expense;
  langsung: boolean;
  onBatal: () => void;
}) {
  const [hasil, jalankan] = useActionState(
    langsung ? hapusPengeluaran : ajukanHapus,
    null,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-destructive">
          {langsung ? "Hapus transaksi" : "Ajukan penghapusan"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={jalankan} className="space-y-3">
          <input type="hidden" name="id" value={transaksi.id} />

          {langsung ? (
            <p className="text-sm text-muted-foreground">
              Transaksi disembunyikan dari daftar dan laporan, tetapi datanya tetap
              tersimpan dan tercatat di audit log.
            </p>
          ) : (
            <div>
              <Label htmlFor="alasan-hapus">Alasan penghapusan</Label>
              <Textarea
                id="alasan-hapus"
                name="alasan"
                required
                minLength={5}
                maxLength={300}
                placeholder="Contoh: dobel dengan transaksi tanggal 2 Okt"
              />
              <Hint>Supervisor membaca alasan ini sebelum memutuskan.</Hint>
            </div>
          )}

          <Pesan hasil={hasil} />

          <div className="flex gap-2">
            <TombolSubmit varian="destructive" labelProses="Memproses…">
              {langsung ? "Ya, hapus" : "Kirim permintaan"}
            </TombolSubmit>
            <Button varian="outline" onClick={onBatal}>
              Batal
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
