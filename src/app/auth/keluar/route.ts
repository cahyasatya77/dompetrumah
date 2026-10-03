import { NextResponse, type NextRequest } from "next/server";

import { buatSupabaseServer } from "@/lib/supabase/server";

/** Keluar dari aplikasi. Dipanggil lewat form POST agar aman dari CSRF link. */
export async function POST(request: NextRequest) {
  const supabase = await buatSupabaseServer();
  await supabase.auth.signOut();
  return NextResponse.redirect(`${request.nextUrl.origin}/login`, {
    status: 303,
  });
}
