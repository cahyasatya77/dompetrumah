import { NextResponse, type NextRequest } from "next/server";

import { kirimNotifikasi } from "@/lib/notifikasi";
import { buatSupabaseAdmin } from "@/lib/supabase/admin";

/** Jalan agak lama karena mengirim email satu per satu. */
export const maxDuration = 60;

type Anggota = { id: string; nama: string };

/** Tanggal hari ini menurut waktu Jakarta, "YYYY-MM-DD". */
function tanggalWib(): string {
  return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/**
 * Reminder harian 21.00 WIB.
 *
 * Dipanggil Vercel Cron (lihat vercel.json). Mencari anggota aktif yang
 * belum mencatat pengeluaran apa pun hari ini, lalu mengirimi mereka
 * notifikasi in-app, email, dan WhatsApp.
 *
 * Endpoint ini memakai service role, jadi harus dilindungi CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  const rahasia = process.env.CRON_SECRET;
  if (!rahasia) {
    return NextResponse.json(
      { pesan: "CRON_SECRET belum diisi" },
      { status: 500 },
    );
  }

  // Vercel Cron mengirim header Authorization: Bearer <CRON_SECRET>.
  const dibawa =
    request.headers.get("authorization") ??
    `Bearer ${request.nextUrl.searchParams.get("kunci") ?? ""}`;

  if (dibawa !== `Bearer ${rahasia}`) {
    return NextResponse.json({ pesan: "Tidak diizinkan" }, { status: 401 });
  }

  const admin = buatSupabaseAdmin();
  const hariIni = tanggalWib();

  const [{ data: anggota }, { data: sudah }] = await Promise.all([
    admin
      .from("profiles")
      .select("id, nama")
      .eq("aktif", true)
      .returns<Anggota[]>(),
    admin
      .from("expenses")
      .select("dicatat_oleh")
      .eq("tanggal", hariIni)
      .is("dihapus_pada", null)
      .returns<{ dicatat_oleh: string }[]>(),
  ]);

  const sudahMencatat = new Set((sudah ?? []).map((e) => e.dicatat_oleh));
  const belum = (anggota ?? []).filter((a) => !sudahMencatat.has(a.id));

  if (belum.length === 0) {
    return NextResponse.json({
      tanggal: hariIni,
      diingatkan: 0,
      pesan: "Semua anggota sudah mencatat hari ini",
    });
  }

  // Satu notifikasi per orang supaya sapaannya personal dan unique index
  // reminder harian bekerja per penerima.
  for (const a of belum) {
    await kirimNotifikasi({
      penerimaIds: [a.id],
      jenis: "reminder_harian",
      judul: "Belum ada catatan pengeluaran hari ini",
      pesan: `Halo ${a.nama}, hari ini belum ada pengeluaran yang Anda catat. Kalau memang tidak ada pengeluaran, abaikan saja pesan ini.`,
      tautan: "/pengeluaran/baru",
      klien: admin,
      tungguKirim: true,
    });
  }

  return NextResponse.json({
    tanggal: hariIni,
    diingatkan: belum.length,
    nama: belum.map((a) => a.nama),
  });
}
