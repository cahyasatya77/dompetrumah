import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { supabaseAnonKey, supabaseUrl } from "@/lib/env";

/**
 * Klien Supabase untuk Server Component, Server Action, dan Route Handler.
 * Memakai anon key sehingga Row Level Security tetap berlaku.
 */
export async function buatSupabaseServer() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Dipanggil dari Server Component: cookie tidak bisa ditulis.
          // Aman diabaikan karena proxy.ts sudah menyegarkan sesi.
        }
      },
    },
  });
}
