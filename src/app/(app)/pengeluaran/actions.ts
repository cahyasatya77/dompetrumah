"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { tulisAudit } from "@/lib/audit";
import { punyaRole, wajibProfil, wajibRole } from "@/lib/auth";
import { idPenyetuju, kirimNotifikasi } from "@/lib/notifikasi";
import { buatSupabaseServer } from "@/lib/supabase/server";
import type { Expense, HasilAksi } from "@/lib/types";
import { formatRupiah } from "@/lib/utils";
import {
  pesanError,
  skemaAlasan,
  skemaId,
  skemaLampiran,
  skemaPengeluaran,
} from "@/lib/validations";

/** Membaca metadata lampiran yang sudah diunggah klien ke Storage. */
function bacaLampiran(formData: FormData) {
  const mentah = formData.get("lampiran");
  if (!mentah || typeof mentah !== "string" || mentah === "") return [];
  try {
    return skemaLampiran.parse(JSON.parse(mentah));
  } catch {
    return [];
  }
}

function dariForm(formData: FormData) {
  return skemaPengeluaran.safeParse({
    tanggal: formData.get("tanggal"),
    category_id: formData.get("category_id"),
    keterangan: formData.get("keterangan") ?? undefined,
    nominal: formData.get("nominal"),
    kuantiti: formData.get("kuantiti"),
    unit_id: formData.get("unit_id") ?? undefined,
  });
}

/**
 * Mencatat pengeluaran baru.
 * Status akhir ditentukan database: input user di atas batas otomatis pending.
 */
export async function tambahPengeluaran(
  _state: HasilAksi | null,
  formData: FormData,
): Promise<HasilAksi> {
  const profil = await wajibProfil();

  const hasil = dariForm(formData);
  if (!hasil.success) return { ok: false, pesan: pesanError(hasil.error) };

  const lampiran = bacaLampiran(formData);
  const supabase = await buatSupabaseServer();

  const { data: expense, error } = await supabase
    .from("expenses")
    .insert({ ...hasil.data, dicatat_oleh: profil.id })
    .select()
    .single<Expense>();

  if (error) return { ok: false, pesan: `Gagal menyimpan: ${error.message}` };

  if (lampiran.length > 0) {
    const { error: errLampiran } = await supabase
      .from("expense_attachments")
      .insert(
        lampiran.map((l) => ({
          expense_id: expense.id,
          path: l.path,
          nama_file: l.nama_file,
          mime: l.mime,
          ukuran: l.ukuran,
          diunggah_oleh: profil.id,
        })),
      );
    if (errLampiran) {
      console.error("[lampiran] gagal disimpan:", errLampiran.message);
    }
  }

  await tulisAudit({
    aktor: profil,
    aksi: "create",
    tabel: "expenses",
    recordId: expense.id,
    sesudah: expense,
  });

  // Di atas batas: database sudah menandainya pending, tinggal buatkan request.
  if (expense.status === "pending") {
    const { error: errReq } = await supabase.from("approval_requests").insert({
      jenis: "create",
      expense_id: expense.id,
      pemohon_id: profil.id,
      alasan: "Total melebihi batas persetujuan",
      data_sebelum: null,
    });

    if (errReq) return { ok: false, pesan: `Gagal membuat request: ${errReq.message}` };

    await kirimNotifikasi({
      penerimaIds: await idPenyetuju(),
      jenis: "request_baru",
      judul: "Pencatatan menunggu persetujuan",
      pesan: `${profil.nama} mencatat ${formatRupiah(Number(expense.total))} dan perlu persetujuan.`,
      tautan: "/approval",
    });

    revalidatePath("/pengeluaran");
    return {
      ok: true,
      pesan: `Tersimpan sebagai PENDING karena total ${formatRupiah(Number(expense.total))} melebihi batas. Menunggu persetujuan supervisor.`,
    };
  }

  revalidatePath("/pengeluaran");
  revalidatePath("/dashboard");
  return { ok: true, pesan: "Pengeluaran tercatat." };
}

/** Supervisor & admin mengubah transaksi langsung, tanpa approval. */
export async function ubahPengeluaran(
  _state: HasilAksi | null,
  formData: FormData,
): Promise<HasilAksi> {
  const profil = await wajibRole("supervisor");

  const idHasil = skemaId.safeParse(formData.get("id"));
  if (!idHasil.success) return { ok: false, pesan: "ID transaksi tidak valid." };

  const hasil = dariForm(formData);
  if (!hasil.success) return { ok: false, pesan: pesanError(hasil.error) };

  const supabase = await buatSupabaseServer();
  const { data: sebelum } = await supabase
    .from("expenses")
    .select("*")
    .eq("id", idHasil.data)
    .maybeSingle<Expense>();

  if (!sebelum) return { ok: false, pesan: "Transaksi tidak ditemukan." };

  const { data, error } = await supabase
    .from("expenses")
    .update(hasil.data)
    .eq("id", idHasil.data)
    .select()
    .single<Expense>();

  if (error) return { ok: false, pesan: `Gagal menyimpan: ${error.message}` };

  await tulisAudit({
    aktor: profil,
    aksi: "update",
    tabel: "expenses",
    recordId: data.id,
    sebelum,
    sesudah: data,
  });

  revalidatePath("/pengeluaran");
  revalidatePath(`/pengeluaran/${data.id}`);
  return { ok: true, pesan: "Perubahan tersimpan." };
}

/** Supervisor & admin menghapus transaksi (soft delete). */
export async function hapusPengeluaran(
  _state: HasilAksi | null,
  formData: FormData,
): Promise<HasilAksi> {
  const profil = await wajibRole("supervisor");

  const idHasil = skemaId.safeParse(formData.get("id"));
  if (!idHasil.success) return { ok: false, pesan: "ID transaksi tidak valid." };

  const supabase = await buatSupabaseServer();
  const { data: sebelum } = await supabase
    .from("expenses")
    .select("*")
    .eq("id", idHasil.data)
    .maybeSingle<Expense>();

  if (!sebelum) return { ok: false, pesan: "Transaksi tidak ditemukan." };

  const { error } = await supabase
    .from("expenses")
    .update({ dihapus_pada: new Date().toISOString(), dihapus_oleh: profil.id })
    .eq("id", idHasil.data);

  if (error) return { ok: false, pesan: `Gagal menghapus: ${error.message}` };

  await tulisAudit({
    aktor: profil,
    aksi: "delete",
    tabel: "expenses",
    recordId: idHasil.data,
    sebelum,
    catatan: "Soft delete",
  });

  revalidatePath("/pengeluaran");
  return { ok: true, pesan: "Transaksi dihapus." };
}

/** User mengajukan permintaan ubah; data baru berlaku setelah disetujui. */
export async function ajukanUbah(
  _state: HasilAksi | null,
  formData: FormData,
): Promise<HasilAksi> {
  const profil = await wajibProfil();

  const idHasil = skemaId.safeParse(formData.get("id"));
  if (!idHasil.success) return { ok: false, pesan: "ID transaksi tidak valid." };

  const alasanHasil = skemaAlasan.safeParse(formData.get("alasan"));
  if (!alasanHasil.success) {
    return { ok: false, pesan: pesanError(alasanHasil.error) };
  }

  const hasil = dariForm(formData);
  if (!hasil.success) return { ok: false, pesan: pesanError(hasil.error) };

  const supabase = await buatSupabaseServer();
  const { data: sebelum } = await supabase
    .from("expenses")
    .select("*")
    .eq("id", idHasil.data)
    .maybeSingle<Expense>();

  if (!sebelum) return { ok: false, pesan: "Transaksi tidak ditemukan." };

  const { error } = await supabase.from("approval_requests").insert({
    jenis: "update",
    expense_id: idHasil.data,
    pemohon_id: profil.id,
    alasan: alasanHasil.data,
    perubahan: hasil.data,
    data_sebelum: {
      tanggal: sebelum.tanggal,
      category_id: sebelum.category_id,
      keterangan: sebelum.keterangan,
      nominal: sebelum.nominal,
      kuantiti: sebelum.kuantiti,
      unit_id: sebelum.unit_id,
    },
  });

  if (error) {
    return {
      ok: false,
      pesan:
        error.code === "23505"
          ? "Transaksi ini sudah punya permintaan yang menunggu persetujuan."
          : `Gagal mengajukan: ${error.message}`,
    };
  }

  await kirimNotifikasi({
    penerimaIds: await idPenyetuju(),
    jenis: "request_baru",
    judul: "Permintaan ubah transaksi",
    pesan: `${profil.nama} ingin mengubah transaksi. Alasan: ${alasanHasil.data}`,
    tautan: "/approval",
  });

  revalidatePath("/pengeluaran");
  revalidatePath(`/pengeluaran/${idHasil.data}`);
  return { ok: true, pesan: "Permintaan terkirim. Menunggu persetujuan supervisor." };
}

/** User mengajukan permintaan hapus. */
export async function ajukanHapus(
  _state: HasilAksi | null,
  formData: FormData,
): Promise<HasilAksi> {
  const profil = await wajibProfil();

  const parsed = z
    .object({ id: skemaId, alasan: skemaAlasan })
    .safeParse({ id: formData.get("id"), alasan: formData.get("alasan") });
  if (!parsed.success) return { ok: false, pesan: pesanError(parsed.error) };

  const supabase = await buatSupabaseServer();
  const { data: sebelum } = await supabase
    .from("expenses")
    .select("*")
    .eq("id", parsed.data.id)
    .maybeSingle<Expense>();

  if (!sebelum) return { ok: false, pesan: "Transaksi tidak ditemukan." };

  const { error } = await supabase.from("approval_requests").insert({
    jenis: "delete",
    expense_id: parsed.data.id,
    pemohon_id: profil.id,
    alasan: parsed.data.alasan,
    data_sebelum: sebelum,
  });

  if (error) {
    return {
      ok: false,
      pesan:
        error.code === "23505"
          ? "Transaksi ini sudah punya permintaan yang menunggu persetujuan."
          : `Gagal mengajukan: ${error.message}`,
    };
  }

  await kirimNotifikasi({
    penerimaIds: await idPenyetuju(),
    jenis: "request_baru",
    judul: "Permintaan hapus transaksi",
    pesan: `${profil.nama} ingin menghapus transaksi ${formatRupiah(Number(sebelum.total))}. Alasan: ${parsed.data.alasan}`,
    tautan: "/approval",
  });

  revalidatePath(`/pengeluaran/${parsed.data.id}`);
  return { ok: true, pesan: "Permintaan terkirim. Menunggu persetujuan supervisor." };
}

/** Dipakai halaman detail untuk memutuskan tombol apa yang ditampilkan. */
export async function bolehUbahLangsung(): Promise<boolean> {
  const profil = await wajibProfil();
  return punyaRole(profil.role, "supervisor");
}
