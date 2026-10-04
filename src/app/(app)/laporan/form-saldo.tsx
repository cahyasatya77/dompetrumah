"use client";

import { Wallet } from "lucide-react";
import { useActionState, useState } from "react";

import { simpanSaldoAwal } from "@/app/(app)/laporan/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Hint, Input, Label } from "@/components/ui/field";
import { Pesan, TombolSubmit } from "@/components/ui/pesan";
import { labelBulan } from "@/lib/periode";
import type { OpeningBalance } from "@/lib/types";

/** Form isi saldo awal bulan terpilih, hanya untuk supervisor & admin. */
export function FormSaldo({
  periode,
  saldo,
}: {
  periode: string;
  saldo: OpeningBalance | null;
}) {
  const [buka, setBuka] = useState(false);
  const [hasil, jalankan] = useActionState(
    async (state: Parameters<typeof simpanSaldoAwal>[0], fd: FormData) => {
      const r = await simpanSaldoAwal(state, fd);
      if (r.ok) setBuka(false);
      return r;
    },
    null,
  );

  if (!buka) {
    return (
      <Button varian="outline" ukuran="sm" onClick={() => setBuka(true)}>
        <Wallet className="h-4 w-4" aria-hidden />
        {saldo ? "Ubah saldo awal" : "Isi saldo awal"}
      </Button>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Saldo awal {labelBulan(periode)}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={jalankan} className="space-y-3">
          <input type="hidden" name="periode" value={periode} />
          <div>
            <Label htmlFor="saldo_awal">Anggaran bulan ini (Rp)</Label>
            <Input
              id="saldo_awal"
              name="saldo_awal"
              type="number"
              min="0"
              step="any"
              required
              inputMode="decimal"
              defaultValue={saldo?.saldo_awal ?? ""}
              placeholder="5000000"
            />
            <Hint>Sisa dihitung dari angka ini dikurangi total pengeluaran.</Hint>
          </div>
          <div>
            <Label htmlFor="catatan-saldo">Catatan (opsional)</Label>
            <Input
              id="catatan-saldo"
              name="catatan"
              maxLength={200}
              defaultValue={saldo?.catatan ?? ""}
              placeholder="Mis. termasuk THR"
            />
          </div>
          <Pesan hasil={hasil} />
          <div className="flex gap-2">
            <TombolSubmit ukuran="sm">Simpan</TombolSubmit>
            <Button varian="outline" ukuran="sm" onClick={() => setBuka(false)}>
              Batal
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
