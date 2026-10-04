"use client";

import { useState } from "react";

import { labelBulanPendek } from "@/lib/periode";
import { formatRupiah } from "@/lib/utils";

export type TitikBulan = {
  /** "2026-10" */
  periode: string;
  total: number;
  jumlah_transaksi: number;
};

/** Sisakan ruang di atas kolom tertinggi untuk labelnya. */
const TINGGI_MAKS = 88;

/**
 * Total pengeluaran beberapa bulan terakhir.
 * Satu seri, satu warna — tidak perlu legenda; judul kartunya sudah menamai
 * apa yang digambar. Nilai hanya dilabeli pada kolom tertinggi dan kolom yang
 * sedang disorot, supaya angka tidak memenuhi grafik.
 */
export function KolomBulanan({ data }: { data: TitikBulan[] }) {
  const [aktif, setAktif] = useState<string | null>(null);

  const maks = Math.max(...data.map((d) => d.total), 1);
  const tertinggi = data.reduce(
    (a, b) => (b.total > a.total ? b : a),
    data[0] ?? { periode: "", total: 0, jumlah_transaksi: 0 },
  );
  const adaIsi = data.some((d) => d.total > 0);

  if (!adaIsi) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Belum ada data untuk digambarkan.
      </p>
    );
  }

  const disorotData = data.find((d) => d.periode === aktif);

  return (
    <div
      role="img"
      aria-label={`Total pengeluaran ${data.length} bulan terakhir, tertinggi ${labelBulanPendek(tertinggi.periode)} sebesar ${formatRupiah(tertinggi.total)}`}
    >
      <div className="flex h-44 items-stretch gap-2">
        {data.map((d) => {
          // Persen dihitung terhadap tinggi penuh kolom, bukan tinggi isi,
          // sehingga posisi label bisa dipatok tepat di atas batangnya.
          const tinggi =
            d.total > 0 ? Math.max((d.total / maks) * TINGGI_MAKS, 2) : 0;
          const disorot = aktif === d.periode;
          const berlabel = disorot || d.periode === tertinggi.periode;

          return (
            <div
              key={d.periode}
              tabIndex={0}
              onMouseEnter={() => setAktif(d.periode)}
              onMouseLeave={() => setAktif(null)}
              onFocus={() => setAktif(d.periode)}
              onBlur={() => setAktif(null)}
              className="relative min-w-0 flex-1 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div
                className="absolute inset-x-0 bottom-0 rounded-t-[4px] bg-primary transition-[height,opacity] duration-300"
                style={{
                  height: `${tinggi}%`,
                  opacity: aktif === null || disorot ? 1 : 0.5,
                }}
              />
              {berlabel && (
                <span
                  className="absolute inset-x-0 text-center text-[10px] font-medium tabular-nums"
                  style={{ bottom: `calc(${tinggi}% + 4px)` }}
                >
                  {ringkasRupiah(d.total)}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex gap-2 border-t border-border pt-2">
        {data.map((d) => (
          <span
            key={d.periode}
            className={
              "min-w-0 flex-1 truncate text-center text-[11px] transition-colors " +
              (aktif === d.periode ? "text-foreground" : "text-muted-foreground")
            }
          >
            {labelBulanPendek(d.periode)}
          </span>
        ))}
      </div>

      <p className="mt-2 h-4 text-center text-xs text-muted-foreground">
        {disorotData
          ? `${labelBulanPendek(disorotData.periode)}: ${formatRupiah(disorotData.total)} · ${disorotData.jumlah_transaksi} transaksi`
          : ""}
      </p>
    </div>
  );
}

/** 1250000 -> "1,3jt", 450000 -> "450rb" */
function ringkasRupiah(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".", ",")}jt`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}rb`;
  return String(n);
}
