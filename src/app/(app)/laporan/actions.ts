"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { tulisAudit } from "@/lib/audit";
import { wajibRole } from "@/lib/auth";
import { buatSupabaseServer } from "@/lib/supabase/server";
import type { HasilAksi, OpeningBalance } from "@/lib/types";
import { pesanError } from "@/lib/validations";

const skemaSaldo = z.object({
  periode: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Periode tidak valid"),
  saldo_awal: z
    .union([z.string(), z.number()])
    .transform((v) =>
      typeof v === "number"
        ? v
        : Number(String(v).replace(/[^0-9.,-]/g, "").replace(/\./g, "").replace(",", ".")),
    )
    .refine((v) => Number.isFinite(v) && v >= 0, "Saldo awal harus angka tidak negatif"),
  catatan: z
    .string()
    .trim()
    .max(200, "Catatan maksimal 200 karakter")
    .optional()
    .transform((v) => (v ? v : null)),
});

/** Mengisi atau memperbarui saldo awal satu bulan (supervisor & admin). */
export async function simpanSaldoAwal(
  _state: HasilAksi | null,
  formData: FormData,
): Promise<HasilAksi> {
  const profil = await wajibRole("supervisor");

  const hasil = skemaSaldo.safeParse({
    periode: formData.get("periode"),
    saldo_awal: formData.get("saldo_awal"),
    catatan: formData.get("catatan") ?? undefined,
  });
  if (!hasil.success) return { ok: false, pesan: pesanError(hasil.error) };

  const periodeTanggal = `${hasil.data.periode}-01`;
  const supabase = await buatSupabaseServer();

  const { data: sebelum } = await supabase
    .from("opening_balances")
    .select("*")
    .eq("periode", periodeTanggal)
    .maybeSingle<OpeningBalance>();

  const { data, error } = await supabase
    .from("opening_balances")
    .upsert(
      {
        periode: periodeTanggal,
        saldo_awal: hasil.data.saldo_awal,
        catatan: hasil.data.catatan,
        diisi_oleh: profil.id,
      },
      { onConflict: "periode" },
    )
    .select()
    .single<OpeningBalance>();

  if (error) return { ok: false, pesan: `Gagal menyimpan: ${error.message}` };

  await tulisAudit({
    aktor: profil,
    aksi: sebelum ? "update" : "create",
    tabel: "opening_balances",
    recordId: data.id,
    sebelum,
    sesudah: data,
  });

  revalidatePath("/laporan");
  revalidatePath("/dashboard");
  return { ok: true, pesan: "Saldo awal tersimpan." };
}
