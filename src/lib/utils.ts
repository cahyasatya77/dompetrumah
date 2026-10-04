import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Menggabungkan class Tailwind dengan aman. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format Rupiah: 1250000 -> "Rp1.250.000"
 *
 * Sengaja tidak memakai Intl.NumberFormat dengan style "currency": data
 * locale Node dan browser bisa berbeda, sehingga ada lingkungan yang
 * menyisipkan spasi tak-putus setelah "Rp". Selisih sekecil itu membuat
 * React mengeluh soal ketidakcocokan hidrasi dan membuat angka di layar
 * berbeda dengan angka di pesan WhatsApp. Dihitung sendiri, hasilnya
 * sama di mana pun.
 */
export function formatRupiah(nilai: number): string {
  const bulat = Math.round(Math.abs(nilai));
  const digit = bulat.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${nilai < 0 ? "-" : ""}Rp${digit}`;
}

/** Format tanggal Indonesia: "3 Okt 2026" */
export function formatTanggal(tanggal: string | Date): string {
  const d = typeof tanggal === "string" ? new Date(tanggal) : tanggal;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(d);
}

/** Format tanggal + jam WIB: "3 Okt 2026, 21.00" */
export function formatWaktu(tanggal: string | Date): string {
  const d = typeof tanggal === "string" ? new Date(tanggal) : tanggal;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(d);
}

/** Inisial untuk avatar: "Budi Santoso" -> "BS" */
export function inisial(nama: string): string {
  return nama
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((k) => k[0]?.toUpperCase() ?? "")
    .join("");
}
