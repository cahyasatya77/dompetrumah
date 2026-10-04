import { z } from "zod";

/** Skema validasi sisi server. Semua pesan dalam bahasa Indonesia. */

export const skemaKategori = z.object({
  nama: z
    .string()
    .trim()
    .min(2, "Nama kategori minimal 2 karakter")
    .max(60, "Nama kategori maksimal 60 karakter"),
  deskripsi: z
    .string()
    .trim()
    .max(200, "Deskripsi maksimal 200 karakter")
    .optional()
    .transform((v) => (v ? v : null)),
});

export const skemaPengguna = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Format email tidak valid")
    .max(120, "Email terlalu panjang"),
  nama: z
    .string()
    .trim()
    .min(2, "Nama minimal 2 karakter")
    .max(80, "Nama maksimal 80 karakter"),
  role: z.enum(["user", "supervisor", "admin"], {
    message: "Role harus user, supervisor, atau admin",
  }),
  no_wa: z
    .string()
    .trim()
    .regex(/^$|^(\+?62|0)8[1-9][0-9]{6,11}$/, "Nomor WhatsApp tidak valid (contoh: 081234567890)")
    .optional()
    .transform((v) => (v ? normalkanNomorWa(v) : null)),
});

/** Mengubah 08xxx atau +62xxx menjadi format 628xxx. */
export function normalkanNomorWa(nomor: string): string {
  const bersih = nomor.replace(/[^0-9+]/g, "");
  if (bersih.startsWith("+62")) return bersih.slice(1);
  if (bersih.startsWith("62")) return bersih;
  if (bersih.startsWith("0")) return `62${bersih.slice(1)}`;
  return bersih;
}

export const skemaId = z.string().uuid("ID tidak valid");

/** Angka dari input form: "12.500" atau "12500" -> 12500 */
const angka = (pesan: string) =>
  z
    .union([z.string(), z.number()])
    .transform((v) =>
      typeof v === "number" ? v : Number(String(v).replace(/[^0-9.,-]/g, "").replace(/\./g, "").replace(",", ".")),
    )
    .refine((v) => Number.isFinite(v), pesan);

export const skemaPengeluaran = z.object({
  tanggal: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid")
    .refine((t) => !Number.isNaN(Date.parse(t)), "Tanggal tidak valid"),
  category_id: skemaId,
  keterangan: z
    .string()
    .trim()
    .max(200, "Keterangan maksimal 200 karakter")
    .optional()
    .transform((v) => (v ? v : null)),
  nominal: angka("Nominal harus berupa angka").refine(
    (v) => v >= 0,
    "Nominal tidak boleh negatif",
  ),
  kuantiti: angka("Kuantiti harus berupa angka").refine(
    (v) => v > 0,
    "Kuantiti harus lebih dari 0",
  ),
  unit_id: z
    .string()
    .optional()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || /^[0-9a-f-]{36}$/i.test(v), "Satuan tidak valid"),
});

/** Metadata lampiran yang sudah diunggah klien ke Storage. */
export const skemaLampiran = z.array(
  z.object({
    path: z.string().min(1).max(300),
    nama_file: z.string().min(1).max(200),
    mime: z.enum(["image/jpeg", "image/png", "image/webp", "application/pdf"]),
    ukuran: z.number().int().positive().max(5 * 1024 * 1024),
  }),
).max(10, "Maksimal 10 lampiran per transaksi");

export const skemaAlasan = z
  .string()
  .trim()
  .min(5, "Alasan minimal 5 karakter")
  .max(300, "Alasan maksimal 300 karakter");

export const skemaCatatan = z
  .string()
  .trim()
  .max(300, "Catatan maksimal 300 karakter")
  .optional()
  .transform((v) => (v ? v : null));

/** Mengubah error zod menjadi satu kalimat untuk ditampilkan di form. */
export function pesanError(error: z.ZodError): string {
  return error.issues.map((i) => i.message).join(". ");
}
