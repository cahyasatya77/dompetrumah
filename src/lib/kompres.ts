"use client";

import { MAKS_UKURAN_LAMPIRAN } from "@/lib/konstanta";

const SISI_MAKS = 1600; // px, cukup untuk membaca struk
const MUTU = 0.82;

/**
 * Mengecilkan foto struk sebelum diunggah. PDF dibiarkan apa adanya.
 * Mengembalikan file asli bila kompresi gagal atau justru memperbesar.
 */
export async function kompresGambar(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const skala = Math.min(1, SISI_MAKS / Math.max(bitmap.width, bitmap.height));
    const lebar = Math.round(bitmap.width * skala);
    const tinggi = Math.round(bitmap.height * skala);

    const kanvas = document.createElement("canvas");
    kanvas.width = lebar;
    kanvas.height = tinggi;

    const ctx = kanvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, lebar, tinggi);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      kanvas.toBlob(resolve, "image/jpeg", MUTU),
    );
    if (!blob || blob.size >= file.size) return file;

    const nama = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], nama, { type: "image/jpeg" });
  } catch {
    return file;
  }
}

/** Pesan kesalahan bila file tidak memenuhi syarat, atau null bila lolos. */
export function periksaFile(file: File): string | null {
  const diizinkan = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  if (!diizinkan.includes(file.type)) {
    return `${file.name}: hanya menerima JPG, PNG, WEBP, atau PDF`;
  }
  if (file.size > MAKS_UKURAN_LAMPIRAN) {
    return `${file.name}: ukuran melebihi 5 MB`;
  }
  return null;
}

/** 1536000 -> "1,5 MB" */
export function formatUkuran(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}
