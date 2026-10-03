import * as React from "react";

/** Judul halaman + deskripsi singkat + area aksi di kanan. */
export function JudulHalaman({
  judul,
  deskripsi,
  aksi,
}: {
  judul: string;
  deskripsi?: string;
  aksi?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{judul}</h1>
        {deskripsi && (
          <p className="mt-1 text-sm text-muted-foreground">{deskripsi}</p>
        )}
      </div>
      {aksi}
    </div>
  );
}
