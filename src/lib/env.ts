/**
 * Pembacaan variabel lingkungan.
 * Sengaja dibaca lewat fungsi (bukan konstanta di level modul) agar
 * `next build` tidak gagal saat .env belum diisi.
 */

function wajib(nama: string, nilai: string | undefined): string {
  if (!nilai) {
    throw new Error(
      `Variabel lingkungan ${nama} belum diisi. Salin .env.example menjadi .env.local lalu isi nilainya.`,
    );
  }
  return nilai;
}

export function supabaseUrl(): string {
  return wajib("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function supabaseAnonKey(): string {
  return wajib(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function supabaseServiceRoleKey(): string {
  return wajib(
    "SUPABASE_SERVICE_ROLE_KEY",
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

/** URL dasar aplikasi, dipakai untuk redirect OAuth. */
export function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  ).replace(/\/$/, "");
}
