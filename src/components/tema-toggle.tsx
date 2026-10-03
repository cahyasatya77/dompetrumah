"use client";

import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Tombol ganti mode terang / gelap.
 *
 * Ikon ditentukan lewat CSS (varian `dark:`) bukan state React, supaya tidak
 * ada selisih render server/klien dan tidak ada kedipan saat halaman dimuat.
 */
export function TemaToggle() {
  function ganti() {
    const gelapBaru = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", gelapBaru);
    try {
      localStorage.setItem("tema", gelapBaru ? "dark" : "light");
    } catch {
      // Mode privat / penyimpanan diblokir: abaikan saja.
    }
  }

  return (
    <Button
      varian="ghost"
      ukuran="icon"
      onClick={ganti}
      aria-label="Ganti mode terang atau gelap"
      title="Ganti mode terang / gelap"
    >
      <Moon className="h-4 w-4 dark:hidden" aria-hidden />
      <Sun className="hidden h-4 w-4 dark:block" aria-hidden />
    </Button>
  );
}

/** Skrip kecil yang berjalan sebelum render untuk mencegah kedipan tema. */
export const SKRIP_TEMA = `
(function(){
  try {
    var t = localStorage.getItem('tema');
    var gelap = t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', gelap);
  } catch (e) {}
})();
`;
