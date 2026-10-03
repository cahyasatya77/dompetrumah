import { AppShell } from "@/components/app-shell";
import { wajibProfil } from "@/lib/auth";

/** Layout untuk semua halaman yang butuh login. */
export default async function LayoutAplikasi({
  children,
}: {
  children: React.ReactNode;
}) {
  const profil = await wajibProfil();
  return <AppShell profil={profil}>{children}</AppShell>;
}
