import { createClient } from "@supabase/supabase-js";

import { supabaseServiceRoleKey, supabaseUrl } from "@/lib/env";

/**
 * Klien Supabase dengan service role: MELEWATI Row Level Security.
 *
 * Hanya boleh dipakai di server, dan hanya untuk hal yang memang tidak bisa
 * lewat RLS, yaitu: memeriksa daftar email yang diizinkan saat login
 * (profil belum tertaut ke auth.users sehingga policy belum bisa dipakai).
 */
export function buatSupabaseAdmin() {
  return createClient(supabaseUrl(), supabaseServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
