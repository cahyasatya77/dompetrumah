/** Nilai yang dipakai bersama di server dan klien. */

/**
 * Batas total transaksi yang wajib disetujui supervisor.
 * Harus sama dengan fungsi public.batas_approval() di database —
 * database tetap jadi penentu akhir, nilai ini hanya untuk tampilan.
 */
export const BATAS_APPROVAL = 500_000;

/** Bucket Supabase Storage untuk lampiran struk. */
export const BUCKET_STRUK = "struk";

/** Ukuran maksimal satu lampiran, sesuai batas bucket. */
export const MAKS_UKURAN_LAMPIRAN = 5 * 1024 * 1024;

export const MIME_LAMPIRAN = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

/** Berapa lama tautan lampiran berlaku (detik). */
export const MASA_BERLAKU_TAUTAN = 60 * 60;
