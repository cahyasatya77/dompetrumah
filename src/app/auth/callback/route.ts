import { NextResponse, type NextRequest } from "next/server";

import { buatSupabaseAdmin } from "@/lib/supabase/admin";
import { buatSupabaseServer } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/**
 * Callback OAuth Google.
 *
 * Alur:
 * 1. Tukar `code` menjadi sesi Supabase.
 * 2. Cek email pengguna di tabel profiles memakai service role
 *    (profil belum tertaut ke auth.users sehingga RLS belum bisa dipakai).
 * 3. Email tidak terdaftar atau nonaktif -> keluarkan sesi dan tolak.
 * 4. Email terdaftar -> tautkan user_id, catat login, masuk ke dashboard.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const lanjut = searchParams.get("lanjut");
  const errorOauth = searchParams.get("error_description") ?? searchParams.get("error");

  if (errorOauth) {
    return NextResponse.redirect(`${origin}/akses-ditolak?alasan=oauth`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const supabase = await buatSupabaseServer();
  const { error: errorTukar } = await supabase.auth.exchangeCodeForSession(code);

  if (errorTukar) {
    return NextResponse.redirect(`${origin}/akses-ditolak?alasan=oauth`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/akses-ditolak?alasan=oauth`);
  }

  const email = user.email.toLowerCase();
  const admin = buatSupabaseAdmin();

  const { data: profil } = await admin
    .from("profiles")
    .select("*")
    .ilike("email", email)
    .maybeSingle<Profile>();

  if (!profil) {
    await supabase.auth.signOut();
    return NextResponse.redirect(
      `${origin}/akses-ditolak?alasan=tidak-terdaftar&email=${encodeURIComponent(email)}`,
    );
  }

  if (!profil.aktif) {
    await supabase.auth.signOut();
    return NextResponse.redirect(
      `${origin}/akses-ditolak?alasan=nonaktif&email=${encodeURIComponent(email)}`,
    );
  }

  // Lepas tautan user_id ini dari profil lain (jaga-jaga akun Supabase dibuat ulang).
  await admin
    .from("profiles")
    .update({ user_id: null })
    .eq("user_id", user.id)
    .neq("id", profil.id);

  const namaGoogle =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    null;

  await admin
    .from("profiles")
    .update({
      user_id: user.id,
      avatar_url: (user.user_metadata?.avatar_url as string | undefined) ?? null,
      login_terakhir: new Date().toISOString(),
      // Nama diisi dari Google hanya bila admin belum mengisinya.
      ...(profil.nama ? {} : { nama: namaGoogle ?? email }),
    })
    .eq("id", profil.id);

  await admin.from("audit_logs").insert({
    aktor_profile_id: profil.id,
    aktor_email: profil.email,
    aksi: "login",
    tabel: "auth",
    record_id: profil.id,
    catatan: "Login via Google",
  });

  const tujuan =
    lanjut && lanjut.startsWith("/") && !lanjut.startsWith("//")
      ? lanjut
      : "/dashboard";

  return NextResponse.redirect(`${origin}${tujuan}`);
}
