import { redirect } from "next/navigation";

/** Halaman akar: langsung arahkan ke dashboard (proxy menangani login). */
export default function Home() {
  redirect("/dashboard");
}
