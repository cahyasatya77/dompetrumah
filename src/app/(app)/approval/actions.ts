"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { tulisAudit } from "@/lib/audit";
import { wajibRole } from "@/lib/auth";
import { kirimNotifikasi } from "@/lib/notifikasi";
import { buatSupabaseServer } from "@/lib/supabase/server";
import type { ApprovalRequest, Expense, HasilAksi } from "@/lib/types";
import { pesanError, skemaCatatan, skemaId } from "@/lib/validations";

const skemaKeputusan = z.object({
  id: skemaId,
  catatan: skemaCatatan,
});

/**
 * Menyetujui permintaan, lalu menerapkannya ke data utama:
 * - create : transaksi pending menjadi aktif
 * - update : nilai usulan ditulis ke transaksi
 * - delete : transaksi di-soft delete
 */
export async function setujuiRequest(
  _state: HasilAksi | null,
  formData: FormData,
): Promise<HasilAksi> {
  const profil = await wajibRole("supervisor");

  const parsed = skemaKeputusan.safeParse({
    id: formData.get("id"),
    catatan: formData.get("catatan") ?? undefined,
  });
  if (!parsed.success) return { ok: false, pesan: pesanError(parsed.error) };

  const supabase = await buatSupabaseServer();
  const { data: req } = await supabase
    .from("approval_requests")
    .select("*")
    .eq("id", parsed.data.id)
    .maybeSingle<ApprovalRequest>();

  if (!req) return { ok: false, pesan: "Permintaan tidak ditemukan." };
  if (req.status !== "pending") {
    return { ok: false, pesan: "Permintaan ini sudah diputuskan." };
  }
  if (req.pemohon_id === profil.id) {
    return { ok: false, pesan: "Anda tidak bisa menyetujui permintaan sendiri." };
  }

  const { data: sebelum } = await supabase
    .from("expenses")
    .select("*")
    .eq("id", req.expense_id ?? "")
    .maybeSingle<Expense>();

  if (!sebelum) return { ok: false, pesan: "Transaksi terkait tidak ditemukan." };

  // Terapkan perubahan ke data utama.
  let perubahan: Record<string, unknown>;
  if (req.jenis === "create") {
    perubahan = { status: "aktif" };
  } else if (req.jenis === "update") {
    perubahan = { ...(req.perubahan ?? {}) };
  } else {
    perubahan = {
      dihapus_pada: new Date().toISOString(),
      dihapus_oleh: profil.id,
    };
  }

  const { data: sesudah, error: errTerap } = await supabase
    .from("expenses")
    .update(perubahan)
    .eq("id", sebelum.id)
    .select()
    .single<Expense>();

  if (errTerap) {
    return { ok: false, pesan: `Gagal menerapkan perubahan: ${errTerap.message}` };
  }

  const { error: errReq } = await supabase
    .from("approval_requests")
    .update({ status: "approved", catatan_peninjau: parsed.data.catatan })
    .eq("id", req.id);

  if (errReq) {
    return { ok: false, pesan: `Gagal menyimpan keputusan: ${errReq.message}` };
  }

  await tulisAudit({
    aktor: profil,
    aksi: "approve",
    tabel: "approval_requests",
    recordId: req.id,
    sebelum,
    sesudah,
    catatan: parsed.data.catatan,
  });

  await kirimNotifikasi({
    penerimaIds: [req.pemohon_id],
    jenis: "request_disetujui",
    judul: "Permintaan Anda disetujui",
    pesan: parsed.data.catatan ?? `${profil.nama} menyetujui permintaan Anda.`,
    tautan: `/pengeluaran/${sebelum.id}`,
  });

  revalidatePath("/approval");
  revalidatePath("/pengeluaran");
  revalidatePath(`/pengeluaran/${sebelum.id}`);
  return { ok: true, pesan: "Permintaan disetujui." };
}

/** Menolak permintaan. Pencatatan baru yang ditolak ditandai 'ditolak'. */
export async function tolakRequest(
  _state: HasilAksi | null,
  formData: FormData,
): Promise<HasilAksi> {
  const profil = await wajibRole("supervisor");

  const parsed = skemaKeputusan.safeParse({
    id: formData.get("id"),
    catatan: formData.get("catatan") ?? undefined,
  });
  if (!parsed.success) return { ok: false, pesan: pesanError(parsed.error) };

  const supabase = await buatSupabaseServer();
  const { data: req } = await supabase
    .from("approval_requests")
    .select("*")
    .eq("id", parsed.data.id)
    .maybeSingle<ApprovalRequest>();

  if (!req) return { ok: false, pesan: "Permintaan tidak ditemukan." };
  if (req.status !== "pending") {
    return { ok: false, pesan: "Permintaan ini sudah diputuskan." };
  }
  if (req.pemohon_id === profil.id) {
    return { ok: false, pesan: "Anda tidak bisa menolak permintaan sendiri." };
  }

  if (req.jenis === "create" && req.expense_id) {
    const { error } = await supabase
      .from("expenses")
      .update({ status: "ditolak" })
      .eq("id", req.expense_id);
    if (error) {
      return { ok: false, pesan: `Gagal menandai transaksi: ${error.message}` };
    }
  }

  const { error: errReq } = await supabase
    .from("approval_requests")
    .update({ status: "rejected", catatan_peninjau: parsed.data.catatan })
    .eq("id", req.id);

  if (errReq) {
    return { ok: false, pesan: `Gagal menyimpan keputusan: ${errReq.message}` };
  }

  await tulisAudit({
    aktor: profil,
    aksi: "reject",
    tabel: "approval_requests",
    recordId: req.id,
    sebelum: req,
    catatan: parsed.data.catatan,
  });

  await kirimNotifikasi({
    penerimaIds: [req.pemohon_id],
    jenis: "request_ditolak",
    judul: "Permintaan Anda ditolak",
    pesan: parsed.data.catatan ?? `${profil.nama} menolak permintaan Anda.`,
    tautan: req.expense_id ? `/pengeluaran/${req.expense_id}` : "/pengeluaran",
  });

  revalidatePath("/approval");
  revalidatePath("/pengeluaran");
  if (req.expense_id) revalidatePath(`/pengeluaran/${req.expense_id}`);
  return { ok: true, pesan: "Permintaan ditolak." };
}
