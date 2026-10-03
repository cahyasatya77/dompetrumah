import { buatSupabaseServer } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export type AksiAudit =
  | "create"
  | "update"
  | "delete"
  | "login"
  | "activate"
  | "deactivate"
  | "role_change"
  | "import";

type ParamAudit = {
  aktor: Pick<Profile, "id" | "email">;
  aksi: AksiAudit;
  tabel: string;
  recordId?: string | null;
  sebelum?: unknown;
  sesudah?: unknown;
  catatan?: string | null;
};

/**
 * Menulis satu baris audit log.
 * Kegagalan audit tidak boleh membatalkan aksi utama, jadi error hanya dicatat
 * ke console server.
 */
export async function tulisAudit(p: ParamAudit): Promise<void> {
  try {
    const supabase = await buatSupabaseServer();
    const { error } = await supabase.from("audit_logs").insert({
      aktor_profile_id: p.aktor.id,
      aktor_email: p.aktor.email,
      aksi: p.aksi,
      tabel: p.tabel,
      record_id: p.recordId ?? null,
      data_sebelum: p.sebelum ?? null,
      data_sesudah: p.sesudah ?? null,
      catatan: p.catatan ?? null,
    });

    if (error) console.error("[audit] gagal menulis log:", error.message);
  } catch (e) {
    console.error("[audit] gagal menulis log:", e);
  }
}
