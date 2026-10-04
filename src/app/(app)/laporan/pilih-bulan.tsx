"use client";

import { useRouter } from "next/navigation";

import { Select } from "@/components/ui/field";
import { labelBulan } from "@/lib/periode";

/** Pemilih bulan untuk halaman laporan. */
export function PilihBulan({
  nilai,
  pilihan,
}: {
  nilai: string;
  pilihan: string[];
}) {
  const router = useRouter();

  return (
    <Select
      aria-label="Pilih bulan laporan"
      value={nilai}
      onChange={(e) => router.push(`/laporan?bulan=${e.target.value}`)}
      className="w-auto min-w-44"
    >
      {pilihan.map((p) => (
        <option key={p} value={p}>
          {labelBulan(p)}
        </option>
      ))}
    </Select>
  );
}
