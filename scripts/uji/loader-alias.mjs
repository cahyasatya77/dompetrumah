/**
 * Loader kecil supaya skrip uji bisa mengimpor modul aplikasi apa adanya.
 *
 * Node tidak mengenal alias "@/..." dari tsconfig, dan saat menjalankan
 * TypeScript langsung ia menuntut ekstensi berkas ditulis lengkap. Hook di
 * bawah menerjemahkan keduanya, sehingga berkas sumber tidak perlu diubah
 * hanya demi bisa diuji.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const AKAR = path.resolve(import.meta.dirname, "../..");
const EKSTENSI = ["", ".ts", ".tsx", ".mjs", ".js", "/index.ts", "/index.tsx"];

function cariBerkas(dasar) {
  for (const e of EKSTENSI) {
    const p = dasar + e;
    if (fs.existsSync(p) && fs.statSync(p).isFile()) return p;
  }
  return null;
}

export function resolve(spesifier, konteks, berikutnya) {
  if (spesifier.startsWith("@/")) {
    const berkas = cariBerkas(path.join(AKAR, "src", spesifier.slice(2)));
    if (berkas) return { url: pathToFileURL(berkas).href, shortCircuit: true };
  }

  // Impor relatif tanpa ekstensi, misalnya "./parser".
  if (spesifier.startsWith(".") && !path.extname(spesifier)) {
    const dasar = path.resolve(
      path.dirname(new URL(konteks.parentURL).pathname),
      spesifier,
    );
    const berkas = cariBerkas(dasar);
    if (berkas) return { url: pathToFileURL(berkas).href, shortCircuit: true };
  }

  return berikutnya(spesifier, konteks);
}
