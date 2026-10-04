import { NextResponse, type NextRequest } from "next/server";

import { kirimWa } from "@/lib/kirim/whatsapp";
import { idPenyetujuAdmin } from "@/lib/wa/penyetuju";
import {
  BANTUAN,
  balasanSukses,
  pesanUntukKami,
  uraiPesan,
} from "@/lib/wa/parser";
import { buatSupabaseAdmin } from "@/lib/supabase/admin";
import { kirimNotifikasi } from "@/lib/notifikasi";
import { normalkanNomorWa } from "@/lib/validations";
import type { Expense, Profile } from "@/lib/types";
import { formatRupiah } from "@/lib/utils";

export const maxDuration = 30;

type Masuk = { nomor: string; isi: string };

/**
 * Menerima pesan WhatsApp dari gateway.
 *
 * Bentuk payload tiap gateway berbeda, jadi pembacaannya dibuat longgar:
 * yang dicari hanya nomor pengirim dan isi pesannya.
 */
function bacaPayload(body: Record<string, unknown>): Masuk | null {
  const nomor =
    body.sender ?? body.from ?? body.pengirim ?? body.phone ?? body.wa;
  const isi = body.message ?? body.text ?? body.pesan ?? body.body;

  if (typeof nomor !== "string" || typeof isi !== "string") return null;
  if (!nomor.trim() || !isi.trim()) return null;

  return { nomor: normalkanNomorWa(nomor), isi };
}

export async function POST(request: NextRequest) {
  const rahasia = process.env.WA_WEBHOOK_SECRET;
  if (!rahasia) {
    return NextResponse.json(
      { pesan: "WA_WEBHOOK_SECRET belum diisi" },
      { status: 500 },
    );
  }

  // Gateway biasanya bisa menambah header atau query saat memanggil webhook.
  const dibawa =
    request.headers.get("x-webhook-secret") ??
    request.nextUrl.searchParams.get("kunci") ??
    "";

  if (dibawa !== rahasia) {
    return NextResponse.json({ pesan: "Tidak diizinkan" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ pesan: "Body bukan JSON" }, { status: 400 });
  }

  const masuk = bacaPayload(body);
  if (!masuk) {
    return NextResponse.json(
      { pesan: "Tidak menemukan nomor pengirim atau isi pesan" },
      { status: 400 },
    );
  }

  const admin = buatSupabaseAdmin();

  /** Menyimpan jejak lalu membalas pengirim. */
  async function selesai(
    status: "diproses" | "ditolak" | "diabaikan",
    balasan: string | null,
    tambahan: Record<string, unknown> = {},
  ) {
    await admin.from("wa_inbound_messages").insert({
      nomor: masuk!.nomor,
      isi: masuk!.isi,
      status,
      balasan,
      mentah: body,
      ...tambahan,
    });

    if (balasan) {
      await kirimWa({ nomor: masuk!.nomor, pesan: balasan });
    }

    return NextResponse.json({ status, balasan });
  }

  // Pesan biasa (bukan perintah) tidak dibalas supaya tidak mengganggu obrolan.
  if (!pesanUntukKami(masuk.isi)) {
    return selesai("diabaikan", null);
  }

  // --- Nomor harus terdaftar ---
  const { data: profil } = await admin
    .from("profiles")
    .select("*")
    .eq("no_wa", masuk.nomor)
    .eq("aktif", true)
    .maybeSingle<Profile>();

  if (!profil) {
    return selesai(
      "ditolak",
      "Nomor ini belum terdaftar di DompetRumah, atau akunnya nonaktif. Minta admin menambahkan nomor WhatsApp Anda di profil pengguna.",
    );
  }

  // --- Format pesan ---
  const urai = uraiPesan(masuk.isi);
  if (!urai.ok) {
    return selesai("ditolak", urai.pesan, { profile_id: profil.id });
  }

  // --- Kategori harus ada ---
  const { data: kategori } = await admin
    .from("categories")
    .select("id, nama")
    .ilike("nama", urai.data.kategori)
    .eq("aktif", true)
    .maybeSingle<{ id: string; nama: string }>();

  if (!kategori) {
    const { data: daftar } = await admin
      .from("categories")
      .select("nama")
      .eq("aktif", true)
      .order("nama")
      .returns<{ nama: string }[]>();

    return selesai(
      "ditolak",
      `Kategori "${urai.data.kategori}" tidak ditemukan.\n\nKategori yang tersedia:\n${(daftar ?? []).map((k) => `- ${k.nama}`).join("\n")}`,
      { profile_id: profil.id },
    );
  }

  // --- Satuan bersifat opsional ---
  let unitId: string | null = null;
  if (urai.data.satuan) {
    const { data: unit } = await admin
      .from("units")
      .select("id")
      .ilike("nama", urai.data.satuan)
      .maybeSingle<{ id: string }>();
    unitId = unit?.id ?? null;
  }

  // --- Simpan transaksi ---
  // Aturan batas approval dijaga trigger database, tetapi trigger itu
  // membaca sesi login. Lewat WhatsApp tidak ada sesi, jadi statusnya
  // ditentukan di sini dengan aturan yang sama.
  const total = Math.round(urai.data.nominal * urai.data.kuantiti * 100) / 100;
  const perluApproval =
    profil.role === "user" && total > (await batasApproval(admin));

  const { data: expense, error } = await admin
    .from("expenses")
    .insert({
      tanggal: urai.data.tanggal,
      category_id: kategori.id,
      keterangan: urai.data.keterangan,
      nominal: urai.data.nominal,
      kuantiti: urai.data.kuantiti,
      unit_id: unitId,
      status: perluApproval ? "pending" : "aktif",
      dicatat_oleh: profil.id,
    })
    .select()
    .single<Expense>();

  if (error) {
    return selesai("ditolak", `Gagal menyimpan: ${error.message}`, {
      profile_id: profil.id,
      galat: error.message,
    });
  }

  if (perluApproval) {
    await admin.from("approval_requests").insert({
      jenis: "create",
      expense_id: expense.id,
      pemohon_id: profil.id,
      alasan: "Total melebihi batas persetujuan (dicatat lewat WhatsApp)",
    });

    await kirimNotifikasi({
      penerimaIds: await idPenyetujuAdmin(admin),
      jenis: "request_baru",
      judul: "Pencatatan lewat WhatsApp menunggu persetujuan",
      pesan: `${profil.nama} mencatat ${formatRupiah(Number(expense.total))} lewat WhatsApp dan perlu persetujuan.`,
      tautan: "/approval",
      klien: admin,
      tungguKirim: true,
    });
  }

  return selesai(
    "diproses",
    balasanSukses({
      kategori: kategori.nama,
      total: Number(expense.total),
      tanggal: expense.tanggal,
      pending: perluApproval,
    }),
    { profile_id: profil.id, expense_id: expense.id },
  );
}

/** Membaca batas approval dari database supaya angkanya tidak terduplikasi. */
async function batasApproval(
  admin: ReturnType<typeof buatSupabaseAdmin>,
): Promise<number> {
  const { data } = await admin.rpc("batas_approval");
  return Number(data ?? 500_000);
}

/** Petunjuk format, berguna saat menguji webhook lewat browser. */
export async function GET() {
  return NextResponse.json({
    keterangan: "Endpoint ini menerima POST dari gateway WhatsApp.",
    format: BANTUAN,
  });
}
