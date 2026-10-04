import { AppShell } from "@/components/app-shell";
import { wajibProfil } from "@/lib/auth";
import { buatSupabaseServer } from "@/lib/supabase/server";

/** Layout untuk semua halaman yang butuh login. */
export default async function LayoutAplikasi({
  children,
}: {
  children: React.ReactNode;
}) {
  const profil = await wajibProfil();
  const supabase = await buatSupabaseServer();

  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("penerima_id", profil.id)
    .is("dibaca_pada", null);

  return (
    <AppShell profil={profil} belumDibaca={count ?? 0}>
      {children}
    </AppShell>
  );
}
