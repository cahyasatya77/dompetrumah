"use client";

import { useState } from "react";

import { formatRupiah } from "@/lib/utils";

export type BarisKategori = {
  kategori: string;
  total: number;
  jumlah_transaksi: number;
};

/**
 * Perbandingan pengeluaran antar kategori, diurutkan dari terbesar.
 *
 * Batang mendatar, bukan pie: nama kategori panjang dan jumlahnya belasan,
 * sehingga mata jauh lebih mudah membandingkan panjang batang daripada
 * sudut juring. Satu warna saja karena yang dibandingkan besaran, bukan
 * identitas — warna berbeda per kategori tidak menambah informasi.
 */
export function BarKategori({
  data,
  maksBaris = 8,
}: {
  data: BarisKategori[];
  maksBaris?: number;
}) {
  const [aktif, setAktif] = useState<string | null>(null);

  const urut = [...data].sort((a, b) => b.total - a.total);
  const tampil = urut.slice(0, maksBaris);
  const sisa = urut.slice(maksBaris);
  const lainnya = sisa.reduce((n, r) => n + r.total, 0);

  const baris = [
    ...tampil,
    ...(sisa.length > 0
      ? [
          {
            kategori: `${sisa.length} kategori lainnya`,
            total: lainnya,
            jumlah_transaksi: sisa.reduce((n, r) => n + r.jumlah_transaksi, 0),
          },
        ]
      : []),
  ];

  const maks = Math.max(...baris.map((b) => b.total), 1);
  const semua = urut.reduce((n, r) => n + r.total, 0);

  if (baris.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Belum ada pengeluaran pada bulan ini.
      </p>
    );
  }

  return (
    <ul
      className="space-y-3"
      role="img"
      aria-label={`Pengeluaran per kategori, ${baris.length} kategori, terbesar ${baris[0].kategori} ${formatRupiah(baris[0].total)}`}
    >
      {baris.map((b) => {
        const persen = semua > 0 ? (b.total / semua) * 100 : 0;
        const lebar = (b.total / maks) * 100;
        const disorot = aktif === b.kategori;

        return (
          <li
            key={b.kategori}
            onMouseEnter={() => setAktif(b.kategori)}
            onMouseLeave={() => setAktif(null)}
            onFocus={() => setAktif(b.kategori)}
            onBlur={() => setAktif(null)}
            tabIndex={0}
            className="group rounded-[var(--radius-app)] outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate">{b.kategori}</span>
              <span className="shrink-0 font-medium tabular-nums">
                {formatRupiah(b.total)}
              </span>
            </div>

            <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width,opacity] duration-300"
                style={{ width: `${lebar}%`, opacity: disorot ? 1 : 0.85 }}
              />
            </div>

            <p
              className={
                "mt-1 text-xs text-muted-foreground transition-opacity " +
                (disorot ? "opacity-100" : "opacity-0")
              }
              aria-hidden={!disorot}
            >
              {persen.toFixed(1).replace(".", ",")}% dari total ·{" "}
              {b.jumlah_transaksi} transaksi
            </p>
          </li>
        );
      })}
    </ul>
  );
}
