"use client";

import { createBrowserClient } from "@supabase/ssr";

import { supabaseAnonKey, supabaseUrl } from "@/lib/env";

/** Klien Supabase untuk Client Component (dipakai pada tombol login Google). */
export function buatSupabaseBrowser() {
  return createBrowserClient(supabaseUrl(), supabaseAnonKey());
}
