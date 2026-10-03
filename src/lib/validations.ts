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

/** Mengubah error zod menjadi satu kalimat untuk ditampilkan di form. */
export function pesanError(error: z.ZodError): string {
  return error.issues.map((i) => i.message).join(". ");
}
