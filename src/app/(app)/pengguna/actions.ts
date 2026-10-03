"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { tulisAudit } from "@/lib/audit";
import { wajibRole } from "@/lib/auth";
import { buatSupabaseServer } from "@/lib/supabase/server";
import type { HasilAksi, Profile } from "@/lib/types";
import { pesanError, skemaId, skemaPengguna } from "@/lib/validations";

/** Buang field sensitif sebelum disimpan ke audit log. */
function ringkas(p: Profile) {
  return {
    id: p.id,
    email: p.email,
    nama: p.nama,
    role: p.role,
    aktif: p.aktif,
    no_wa: p.no_wa,
  };
}

/** Daftarkan email Google baru (admin saja). */
export async function tambahPengguna(
  _state: HasilAksi | null,
  formData: FormData,
): Promise<HasilAksi> {
  const profil = await wajibRole("admin");

  const hasil = skemaPengguna.safeParse({
    email: formData.get("email"),
    nama: formData.get("nama"),
    role: formData.get("role"),
    no_wa: formData.get("no_wa") ?? undefined,
  });
  if (!hasil.success) return { ok: false, pesan: pesanError(hasil.error) };

  const supabase = await buatSupabaseServer();
  const { data, error } = await supabase
    .from("profiles")
    .insert(hasil.data)
    .select()
    .single<Profile>();

  if (error) {
    return {
      ok: false,
      pesan:
        error.code === "23505"
          ? "Email itu sudah terdaftar."
          : `Gagal menyimpan: ${error.message}`,
    };
  }

  await tulisAudit({
    aktor: profil,
    aksi: "create",
    tabel: "profiles",
    recordId: data.id,
    sesudah: ringkas(data),
  });

  revalidatePath("/pengguna");
  return { ok: true, pesan: `${data.nama} ditambahkan.` };
}

/** Ubah nama, role, atau nomor WA pengguna (admin saja). */
export async function ubahPengguna(
  _state: HasilAksi | null,
  formData: FormData,
): Promise<HasilAksi> {
  const profil = await wajibRole("admin");

  const idHasil = skemaId.safeParse(formData.get("id"));
  if (!idHasil.success) return { ok: false, pesan: "ID pengguna tidak valid." };

  const hasil = skemaPengguna.omit({ email: true }).safeParse({
    nama: formData.get("nama"),
    role: formData.get("role"),
    no_wa: formData.get("no_wa") ?? undefined,
  });
  if (!hasil.success) return { ok: false, pesan: pesanError(hasil.error) };

  const supabase = await buatSupabaseServer();
  const { data: sebelum } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", idHasil.data)
    .maybeSingle<Profile>();

  if (!sebelum) return { ok: false, pesan: "Pengguna tidak ditemukan." };

  // Admin tidak boleh menurunkan role dirinya sendiri (mencegah terkunci).
  if (sebelum.id === profil.id && hasil.data.role !== "admin") {
    return {
      ok: false,
      pesan: "Anda tidak bisa menurunkan role akun Anda sendiri.",
    };
  }

  // Harus selalu ada minimal satu admin aktif.
  if (sebelum.role === "admin" && hasil.data.role !== "admin") {
    const { count } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin")
      .eq("aktif", true);

    if ((count ?? 0) <= 1) {
      return { ok: false, pesan: "Minimal harus ada satu admin aktif." };
    }
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(hasil.data)
    .eq("id", idHasil.data)
    .select()
    .single<Profile>();

  if (error) return { ok: false, pesan: `Gagal menyimpan: ${error.message}` };

  await tulisAudit({
    aktor: profil,
    aksi: sebelum.role === data.role ? "update" : "role_change",
    tabel: "profiles",
    recordId: data.id,
    sebelum: ringkas(sebelum),
    sesudah: ringkas(data),
  });

  revalidatePath("/pengguna");
  return { ok: true, pesan: "Perubahan tersimpan." };
}

/** Aktifkan / nonaktifkan pengguna (admin saja). */
export async function ubahStatusPengguna(
  _state: HasilAksi | null,
  formData: FormData,
): Promise<HasilAksi> {
  const profil = await wajibRole("admin");

  const parsed = z
    .object({ id: skemaId, aktif: z.enum(["true", "false"]) })
    .safeParse({ id: formData.get("id"), aktif: formData.get("aktif") });
  if (!parsed.success) return { ok: false, pesan: "Permintaan tidak valid." };

  const aktifBaru = parsed.data.aktif === "true";

  if (parsed.data.id === profil.id && !aktifBaru) {
    return { ok: false, pesan: "Anda tidak bisa menonaktifkan akun sendiri." };
  }

  const supabase = await buatSupabaseServer();

  if (!aktifBaru) {
    const { data: target } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", parsed.data.id)
      .maybeSingle<Pick<Profile, "role">>();

    if (target?.role === "admin") {
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "admin")
        .eq("aktif", true);

      if ((count ?? 0) <= 1) {
        return { ok: false, pesan: "Minimal harus ada satu admin aktif." };
      }
    }
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ aktif: aktifBaru })
    .eq("id", parsed.data.id)
    .select()
    .single<Profile>();

  if (error) return { ok: false, pesan: `Gagal mengubah status: ${error.message}` };

  await tulisAudit({
    aktor: profil,
    aksi: aktifBaru ? "activate" : "deactivate",
    tabel: "profiles",
    recordId: data.id,
    sesudah: { aktif: aktifBaru },
  });

  revalidatePath("/pengguna");
  return {
    ok: true,
    pesan: aktifBaru ? "Pengguna diaktifkan." : "Pengguna dinonaktifkan.",
  };
}
