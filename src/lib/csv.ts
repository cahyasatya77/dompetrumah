/**
 * Pembaca CSV sederhana namun tahan kasus nyata: nilai berkutip, koma di
 * dalam kutip, kutip ganda sebagai escape, dan akhir baris CRLF maupun LF.
 */
export function uraikanCsv(teks: string): string[][] {
  const baris: string[][] = [];
  let kolom: string[] = [];
  let nilai = "";
  let dalamKutip = false;

  // Buang BOM yang sering ikut saat file diekspor dari spreadsheet.
  const s = teks.replace(/^﻿/, "");

  for (let i = 0; i < s.length; i++) {
    const c = s[i];

    if (dalamKutip) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          nilai += '"';
          i++;
        } else {
          dalamKutip = false;
        }
      } else {
        nilai += c;
      }
      continue;
    }

    if (c === '"') {
      dalamKutip = true;
    } else if (c === ",") {
      kolom.push(nilai);
      nilai = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      kolom.push(nilai);
      baris.push(kolom);
      kolom = [];
      nilai = "";
    } else {
      nilai += c;
    }
  }

  if (nilai !== "" || kolom.length > 0) {
    kolom.push(nilai);
    baris.push(kolom);
  }

  // Buang baris yang seluruhnya kosong.
  return baris.filter((b) => b.some((k) => k.trim() !== ""));
}

/**
 * Mengubah CSV menjadi daftar objek memakai baris pertama sebagai nama kolom.
 * Nama kolom dinormalkan: huruf kecil, spasi jadi garis bawah.
 */
export function csvKeObjek(teks: string): Record<string, string>[] {
  const baris = uraikanCsv(teks);
  if (baris.length < 2) return [];

  const kepala = baris[0].map((k) =>
    k.trim().toLowerCase().replace(/\s+/g, "_"),
  );

  return baris.slice(1).map((b) => {
    const o: Record<string, string> = {};
    kepala.forEach((nama, i) => {
      o[nama] = (b[i] ?? "").trim();
    });
    return o;
  });
}

/**
 * Mengubah berbagai bentuk tautan Google Sheets menjadi tautan CSV.
 * Mengembalikan null bila bukan tautan Google Sheets.
 */
export function tautanCsvGoogle(tautan: string): string | null {
  let url: URL;
  try {
    url = new URL(tautan.trim());
  } catch {
    return null;
  }

  // Hanya Google Sheets, supaya endpoint ini tidak bisa dipakai
  // untuk memanggil alamat internal.
  if (url.hostname !== "docs.google.com") return null;

  // Bentuk "Publish to web": .../spreadsheets/d/e/2PACX-.../pub?output=csv
  if (url.pathname.includes("/spreadsheets/d/e/")) {
    url.searchParams.set("output", "csv");
    return url.toString();
  }

  // Bentuk biasa: .../spreadsheets/d/<id>/edit#gid=123
  const cocok = url.pathname.match(/\/spreadsheets\/d\/([^/]+)/);
  if (!cocok) return null;

  const gid =
    url.searchParams.get("gid") ??
    (url.hash.match(/gid=(\d+)/)?.[1] ?? "0");

  return `https://docs.google.com/spreadsheets/d/${cocok[1]}/export?format=csv&gid=${gid}`;
}

/**
 * Membaca angka Rupiah dari sel: "Rp1.250.000" atau "1250000" -> 1250000.
 * Sel kosong mengembalikan NaN, bukan 0, supaya tidak diam-diam tersimpan
 * sebagai nol saat kolomnya ternyata tidak terisi.
 */
export function angkaDariSel(s: string): number {
  const bersih = s.replace(/[^0-9,.-]/g, "");
  if (bersih === "") return NaN;
  // Titik dipakai sebagai pemisah ribuan di Indonesia.
  const normal = bersih.replace(/\./g, "").replace(",", ".");
  return Number(normal);
}
