"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { Label, Select } from "@/components/ui/field";
import type { Category, Profile } from "@/lib/types";

/** Filter bulan, kategori, dan pencatat. Berubah = langsung muat ulang. */
export function FilterTransaksi({
  kategori,
  pengguna,
  bulanTersedia,
}: {
  kategori: Category[];
  pengguna: Pick<Profile, "id" | "nama">[];
  bulanTersedia: string[];
}) {
  const router = useRouter();
  const params = useSearchParams();

  function ubah(kunci: string, nilai: string) {
    const baru = new URLSearchParams(params.toString());
    if (nilai) baru.set(kunci, nilai);
    else baru.delete(kunci);
    router.push(`/pengeluaran?${baru.toString()}`);
  }

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div>
        <Label htmlFor="f-bulan">Bulan</Label>
        <Select
          id="f-bulan"
          value={params.get("bulan") ?? ""}
          onChange={(e) => ubah("bulan", e.target.value)}
        >
          <option value="">Semua bulan</option>
          {bulanTersedia.map((b) => (
            <option key={b} value={b}>
              {namaBulan(b)}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label htmlFor="f-kategori">Kategori</Label>
        <Select
          id="f-kategori"
          value={params.get("kategori") ?? ""}
          onChange={(e) => ubah("kategori", e.target.value)}
        >
          <option value="">Semua kategori</option>
          {kategori.map((k) => (
            <option key={k.id} value={k.id}>
              {k.nama}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label htmlFor="f-user">Dicatat oleh</Label>
        <Select
          id="f-user"
          value={params.get("user") ?? ""}
          onChange={(e) => ubah("user", e.target.value)}
        >
          <option value="">Semua anggota</option>
          {pengguna.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nama}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}

/** "2026-10" -> "Oktober 2026" */
function namaBulan(ym: string): string {
  const [tahun, bulan] = ym.split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(new Date(tahun, bulan - 1, 1));
}
