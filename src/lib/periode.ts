/**
 * Bantu olah periode bulanan.
 * Semua memakai string "YYYY-MM" agar tidak terpengaruh zona waktu browser.
 */

/** Bulan berjalan menurut waktu Jakarta, misalnya "2026-10". */
export function bulanIni(): string {
  const wib = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return wib.toISOString().slice(0, 7);
}

/** "2026-10" -> "2026-10-01" */
export function awalBulan(ym: string): string {
  return `${ym}-01`;
}

/** "2026-10" -> "2026-11-01" (batas atas eksklusif) */
export function awalBulanBerikutnya(ym: string): string {
  const [t, b] = ym.split("-").map(Number);
  return b === 12
    ? `${t + 1}-01-01`
    : `${t}-${String(b + 1).padStart(2, "0")}-01`;
}

/** "2026-10" -> "Oktober 2026" */
export function labelBulan(ym: string): string {
  const [t, b] = ym.split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(t, b - 1, 1)));
}

/** "2026-10" -> "Okt 26", untuk label sumbu yang sempit. */
export function labelBulanPendek(ym: string): string {
  const [t, b] = ym.split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", {
    month: "short",
    year: "2-digit",
  }).format(new Date(Date.UTC(t, b - 1, 1)));
}

/** Mundur n bulan: ("2026-10", 2) -> "2026-08" */
export function mundurBulan(ym: string, n: number): string {
  const [t, b] = ym.split("-").map(Number);
  const total = t * 12 + (b - 1) - n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

/** Deret n bulan terakhir, termasuk bulan ini, urut lama ke baru. */
export function deretBulan(sampai: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => mundurBulan(sampai, n - 1 - i));
}

/** Memastikan nilai dari URL benar-benar "YYYY-MM". */
export function periodeValid(ym: string | undefined): string {
  return ym && /^\d{4}-(0[1-9]|1[0-2])$/.test(ym) ? ym : bulanIni();
}
