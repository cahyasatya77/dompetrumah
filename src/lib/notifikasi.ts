import { buatSupabaseServer } from "@/lib/supabase/server";

type ParamNotifikasi = {
  penerimaIds: string[];
  jenis: "request_baru" | "request_disetujui" | "request_ditolak";
  judul: string;
  pesan?: string | null;
  tautan?: string | null;
};

/**
 * Mengirim notifikasi in-app. Email dan WhatsApp menyusul di Fase 4;
 * modul ini yang nantinya memanggil pengirimnya.
 * Kegagalan notifikasi tidak membatalkan aksi utama.
 */
export async function kirimNotifikasi(p: ParamNotifikasi): Promise<void> {
  const penerima = [...new Set(p.penerimaIds)].filter(Boolean);
  if (penerima.length === 0) return;

  try {
    const supabase = await buatSupabaseServer();
    const { error } = await supabase.from("notifications").insert(
      penerima.map((id) => ({
        penerima_id: id,
        jenis: p.jenis,
        judul: p.judul,
        pesan: p.pesan ?? null,
        tautan: p.tautan ?? null,
      })),
    );

    if (error) console.error("[notifikasi] gagal:", error.message);
  } catch (e) {
    console.error("[notifikasi] gagal:", e);
  }
}

/** Mengambil id profil semua supervisor dan admin yang aktif. */
export async function idPenyetuju(): Promise<string[]> {
  const supabase = await buatSupabaseServer();
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .in("role", ["supervisor", "admin"])
    .eq("aktif", true)
    .returns<{ id: string }[]>();

  return (data ?? []).map((p) => p.id);
}
