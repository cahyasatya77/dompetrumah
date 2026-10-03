"use server";

import { revalidatePath } from "next/cache";

import { wajibRole } from "@/lib/auth";
import { tulisAudit } from "@/lib/audit";
import { buatSupabaseServer } from "@/lib/supabase/server";
import type { Category, HasilAksi } from "@/lib/types";
import { pesanError, skemaId, skemaKategori } from "@/lib/validations";
import { z } from "zod";

/** Tambah kategori baru (supervisor & admin). */
export async function tambahKategori(
  _state: HasilAksi | null,
  formData: FormData,
): Promise<HasilAksi> {
  const profil = await wajibRole("supervisor");

  const hasil = skemaKategori.safeParse({
    nama: formData.get("nama"),
    deskripsi: formData.get("deskripsi") ?? undefined,
  });
  if (!hasil.success) return { ok: false, pesan: pesanError(hasil.error) };

  const supabase = await buatSupabaseServer();
  const { data, error } = await supabase
    .from("categories")
    .insert({ ...hasil.data, dibuat_oleh: profil.id })
    .select()
    .single<Category>();

  if (error) {
    return {
      ok: false,
      pesan:
        error.code === "23505"
          ? "Kategori dengan nama itu sudah ada."
          : `Gagal menyimpan: ${error.message}`,
    };
  }

  await tulisAudit({
    aktor: profil,
    aksi: "create",
    tabel: "categories",
    recordId: data.id,
    sesudah: data,
  });

  revalidatePath("/kategori");
  return { ok: true, pesan: `Kategori "${data.nama}" ditambahkan.` };
}

/** Ubah nama/deskripsi kategori (supervisor & admin). */
export async function ubahKategori(
  _state: HasilAksi | null,
  formData: FormData,
): Promise<HasilAksi> {
  const profil = await wajibRole("supervisor");

  const idHasil = skemaId.safeParse(formData.get("id"));
  if (!idHasil.success) return { ok: false, pesan: "ID kategori tidak valid." };

  const hasil = skemaKategori.safeParse({
    nama: formData.get("nama"),
    deskripsi: formData.get("deskripsi") ?? undefined,
  });
  if (!hasil.success) return { ok: false, pesan: pesanError(hasil.error) };

  const supabase = await buatSupabaseServer();
  const { data: sebelum } = await supabase
    .from("categories")
    .select("*")
    .eq("id", idHasil.data)
    .maybeSingle<Category>();

  if (!sebelum) return { ok: false, pesan: "Kategori tidak ditemukan." };

  const { data, error } = await supabase
    .from("categories")
    .update(hasil.data)
    .eq("id", idHasil.data)
    .select()
    .single<Category>();

  if (error) {
    return {
      ok: false,
      pesan:
        error.code === "23505"
          ? "Kategori dengan nama itu sudah ada."
          : `Gagal menyimpan: ${error.message}`,
    };
  }

  await tulisAudit({
    aktor: profil,
    aksi: "update",
    tabel: "categories",
    recordId: data.id,
    sebelum,
    sesudah: data,
  });

  revalidatePath("/kategori");
  return { ok: true, pesan: "Perubahan tersimpan." };
}

/** Aktifkan / nonaktifkan kategori (supervisor & admin). */
export async function ubahStatusKategori(
  _state: HasilAksi | null,
  formData: FormData,
): Promise<HasilAksi> {
  const profil = await wajibRole("supervisor");

  const parsed = z
    .object({ id: skemaId, aktif: z.enum(["true", "false"]) })
    .safeParse({ id: formData.get("id"), aktif: formData.get("aktif") });
  if (!parsed.success) return { ok: false, pesan: "Permintaan tidak valid." };

  const aktifBaru = parsed.data.aktif === "true";
  const supabase = await buatSupabaseServer();

  const { data, error } = await supabase
    .from("categories")
    .update({ aktif: aktifBaru })
    .eq("id", parsed.data.id)
    .select()
    .single<Category>();

  if (error) return { ok: false, pesan: `Gagal mengubah status: ${error.message}` };

  await tulisAudit({
    aktor: profil,
    aksi: aktifBaru ? "activate" : "deactivate",
    tabel: "categories",
    recordId: data.id,
    sesudah: { aktif: aktifBaru },
  });

  revalidatePath("/kategori");
  return {
    ok: true,
    pesan: aktifBaru ? "Kategori diaktifkan." : "Kategori dinonaktifkan.",
  };
}

/** Hapus kategori permanen (admin saja). */
export async function hapusKategori(
  _state: HasilAksi | null,
  formData: FormData,
): Promise<HasilAksi> {
  const profil = await wajibRole("admin");

  const idHasil = skemaId.safeParse(formData.get("id"));
  if (!idHasil.success) return { ok: false, pesan: "ID kategori tidak valid." };

  const supabase = await buatSupabaseServer();
  const { data: sebelum } = await supabase
    .from("categories")
    .select("*")
    .eq("id", idHasil.data)
    .maybeSingle<Category>();

  if (!sebelum) return { ok: false, pesan: "Kategori tidak ditemukan." };

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", idHasil.data);

  if (error) {
    return {
      ok: false,
      pesan:
        error.code === "23503"
          ? "Kategori sudah dipakai pada transaksi. Nonaktifkan saja."
          : `Gagal menghapus: ${error.message}`,
    };
  }

  await tulisAudit({
    aktor: profil,
    aksi: "delete",
    tabel: "categories",
    recordId: idHasil.data,
    sebelum,
  });

  revalidatePath("/kategori");
  return { ok: true, pesan: `Kategori "${sebelum.nama}" dihapus.` };
}
