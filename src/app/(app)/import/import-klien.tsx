"use client";

import { Eye, Upload } from "lucide-react";
import { useActionState, useState } from "react";

import {
  jalankanImport,
  pratinjauImport,
  type BarisPratinjau,
  type JenisImport,
} from "@/app/(app)/import/actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Hint, Input, Label, Select, Textarea } from "@/components/ui/field";
import { Pesan, TombolSubmit } from "@/components/ui/pesan";

const CONTOH: Record<JenisImport, { kolom: string; contoh: string }> = {
  kategori: {
    kolom: "nama, deskripsi",
    contoh: "nama,deskripsi\nBelanja Mingguan,Sayur dan lauk\nParkir,",
  },
  pengguna: {
    kolom: "email, nama, role, no_wa",
    contoh:
      "email,nama,role,no_wa\nayah@gmail.com,Ayah,admin,081234567890\nibu@gmail.com,Ibu,supervisor,",
  },
  saldo: {
    kolom: "periode, saldo_awal, catatan",
    contoh: "periode,saldo_awal,catatan\n2026-10,5000000,Termasuk THR\n2026-11,4500000,",
  },
};

const NADA: Record<
  BarisPratinjau["status"],
  "sukses" | "primary" | "netral" | "bahaya"
> = {
  baru: "sukses",
  diperbarui: "primary",
  lewati: "netral",
  galat: "bahaya",
};

export function ImportKlien() {
  const [jenis, setJenis] = useState<JenisImport>("kategori");
  const [pratinjau, lihat] = useActionState(pratinjauImport, null);
  const [hasilSimpan, simpan] = useActionState(jalankanImport, null);

  const baris = pratinjau?.baris ?? [];
  const bisaSimpan = baris.filter(
    (b) => b.status === "baru" || b.status === "diperbarui",
  ).length;
  const bermasalah = baris.filter((b) => b.status === "galat").length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Sumber data</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={lihat} className="space-y-3">
            <div>
              <Label htmlFor="jenis">Data yang diimpor</Label>
              <Select
                id="jenis"
                name="jenis"
                value={jenis}
                onChange={(e) => setJenis(e.target.value as JenisImport)}
              >
                <option value="kategori">Master kategori</option>
                <option value="pengguna">Master pengguna</option>
                <option value="saldo">Saldo awal bulanan</option>
              </Select>
              <Hint>Kolom yang dibaca: {CONTOH[jenis].kolom}</Hint>
            </div>

            <div>
              <Label htmlFor="tautan">Tautan Google Sheets</Label>
              <Input
                id="tautan"
                name="tautan"
                type="url"
                placeholder="https://docs.google.com/spreadsheets/d/..."
              />
              <Hint>
                Di Google Sheets: File → Share → Publish to web → pilih sheet →
                CSV. Baris pertama harus berisi nama kolom.
              </Hint>
            </div>

            <div>
              <Label htmlFor="csv">Atau tempel teks CSV</Label>
              <Textarea
                id="csv"
                name="csv"
                rows={4}
                className="font-mono text-xs"
                placeholder={CONTOH[jenis].contoh}
              />
              <Hint>Kalau diisi, tautan di atas diabaikan.</Hint>
            </div>

            <Pesan hasil={pratinjau?.ok === false ? pratinjau : null} />

            <TombolSubmit labelProses="Membaca…">
              <Eye className="h-4 w-4" aria-hidden /> Lihat pratinjau
            </TombolSubmit>
          </form>
        </CardContent>
      </Card>

      {pratinjau?.ok && baris.length > 0 && (
        <Card>
          <CardHeader className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Pratinjau {baris.length} baris</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Badge nada="sukses">{bisaSimpan} akan disimpan</Badge>
              {bermasalah > 0 && (
                <Badge nada="bahaya">{bermasalah} bermasalah</Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="px-0 sm:px-0">
            <div className="overflow-x-auto border-y border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="px-4 py-2 font-medium sm:px-5">Baris</th>
                    {(pratinjau.kolom ?? []).map((k) => (
                      <th key={k} className="px-4 py-2 font-medium">
                        {k}
                      </th>
                    ))}
                    <th className="px-4 py-2 font-medium sm:px-5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {baris.map((b) => (
                    <tr key={b.nomor} className="border-t border-border">
                      <td className="px-4 py-2 text-muted-foreground tabular-nums sm:px-5">
                        {b.nomor}
                      </td>
                      {(pratinjau.kolom ?? []).map((k) => (
                        <td key={k} className="px-4 py-2">
                          {b.nilai[k] === null || b.nilai[k] === ""
                            ? "—"
                            : String(b.nilai[k])}
                        </td>
                      ))}
                      <td className="px-4 py-2 sm:px-5">
                        <Badge nada={NADA[b.status]}>{b.status}</Badge>
                        {b.pesan && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {b.pesan}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <form action={simpan} className="space-y-3 px-4 pt-4 sm:px-5">
              <input type="hidden" name="jenis" value={pratinjau.jenis} />
              <input type="hidden" name="baris" value={JSON.stringify(baris)} />
              <Pesan hasil={hasilSimpan} />
              <TombolSubmit disabled={bisaSimpan === 0} labelProses="Menyimpan…">
                <Upload className="h-4 w-4" aria-hidden /> Simpan {bisaSimpan} baris
              </TombolSubmit>
              {bermasalah > 0 && (
                <Hint>
                  Baris bermasalah dan yang sudah ada tidak ikut disimpan.
                </Hint>
              )}
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
