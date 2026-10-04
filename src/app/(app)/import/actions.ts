"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { tulisAudit } from "@/lib/audit";
import { wajibRole } from "@/lib/auth";
import { angkaDariSel, csvKeObjek, tautanCsvGoogle } from "@/lib/csv";
import { buatSupabaseServer } from "@/lib/supabase/server";
import type { HasilAksi } from "@/lib/types";
import { normalkanNomorWa } from "@/lib/validations";

export type JenisImport = "kategori" | "pengguna" | "saldo";

export type BarisPratinjau = {
  nomor: number;
  nilai: Record<string, string | number | null>;
  status: "baru" | "diperbarui" | "lewati" | "galat";
  pesan?: string;
};

export type HasilPratinjau = HasilAksi & {
  jenis?: JenisImport;
  baris?: BarisPratinjau[];
  kolom?: string[];
};

const KOLOM: Record<JenisImport, string[]> = {
  kategori: ["nama", "deskripsi"],
  pengguna: ["email", "nama", "role", "no_wa"],
  saldo: ["periode", "saldo_awal", "catatan"],
};

/** Mengambil isi CSV dari tautan Google Sheets atau dari teks yang ditempel. */
async function ambilCsv(formData: FormData): Promise<string> {
  const tempel = String(formData.get("csv") ?? "").trim();
  if (tempel) return tempel;

  const tautan = String(formData.get("tautan") ?? "").trim();
  if (!tautan) throw new Error("Isi tautan Google Sheets atau tempel teks CSV.");

  const csvUrl = tautanCsvGoogle(tautan);
  if (!csvUrl) {
    throw new Error(
      "Tautan harus dari docs.google.com. Pastikan sheet sudah dipublikasikan lewat File → Share → Publish to web.",
    );
  }

  const res = await fetch(csvUrl, {
    redirect: "follow",
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(
      `Tidak bisa membaca sheet (HTTP ${res.status}). Pastikan sheet sudah dipublikasikan atau dibagikan ke "siapa saja yang punya link".`,
    );
  }

  const teks = await res.text();
  if (teks.trimStart().startsWith("<")) {
    throw new Error(
      "Yang terbaca halaman HTML, bukan CSV. Sheet kemungkinan masih privat.",
    );
  }

  return teks;
}

/** Membaca data, memvalidasi tiap baris, dan menyiapkan pratinjau. */
export async function pratinjauImport(
  _state: HasilPratinjau | null,
  formData: FormData,
): Promise<HasilPratinjau> {
  await wajibRole("admin");

  const jenis = String(formData.get("jenis") ?? "") as JenisImport;
  if (!KOLOM[jenis]) return { ok: false, pesan: "Jenis data tidak dikenal." };

  let csv: string;
  try {
    csv = await ambilCsv(formData);
  } catch (e) {
    return { ok: false, pesan: e instanceof Error ? e.message : String(e) };
  }

  const data = csvKeObjek(csv);
  if (data.length === 0) {
    return {
      ok: false,
      pesan: "Tidak ada baris data. Pastikan baris pertama berisi nama kolom.",
    };
  }

  const supabase = await buatSupabaseServer();

  if (jenis === "kategori") {
    const { data: adaData } = await supabase
      .from("categories")
      .select("nama")
      .returns<{ nama: string }[]>();
    const ada = new Set((adaData ?? []).map((k) => k.nama.toLowerCase()));

    const baris = data.map((r, i): BarisPratinjau => {
      const nama = (r.nama ?? r.kategori ?? "").trim();
      const nilai = { nama, deskripsi: r.deskripsi || null };

      if (!nama) {
        return { nomor: i + 2, nilai, status: "galat", pesan: "Kolom nama kosong" };
      }
      if (nama.length > 60) {
        return { nomor: i + 2, nilai, status: "galat", pesan: "Nama lebih dari 60 karakter" };
      }
      if (ada.has(nama.toLowerCase())) {
        return { nomor: i + 2, nilai, status: "lewati", pesan: "Sudah ada" };
      }
      ada.add(nama.toLowerCase());
      return { nomor: i + 2, nilai, status: "baru" };
    });

    return { ok: true, jenis, baris, kolom: KOLOM.kategori };
  }

  if (jenis === "pengguna") {
    const { data: adaData } = await supabase
      .from("profiles")
      .select("email")
      .returns<{ email: string }[]>();
    const ada = new Set((adaData ?? []).map((p) => p.email.toLowerCase()));

    const skema = z.object({
      email: z.string().email(),
      nama: z.string().min(2).max(80),
      role: z.enum(["user", "supervisor", "admin"]),
    });

    const baris = data.map((r, i): BarisPratinjau => {
      const email = (r.email ?? "").trim().toLowerCase();
      const nama = (r.nama ?? "").trim();
      const role = ((r.role ?? "user").trim().toLowerCase() || "user") as string;
      const noWa = (r.no_wa ?? r.whatsapp ?? "").trim();
      const nilai = {
        email,
        nama,
        role,
        no_wa: noWa ? normalkanNomorWa(noWa) : null,
      };

      const cek = skema.safeParse({ email, nama, role });
      if (!cek.success) {
        return {
          nomor: i + 2,
          nilai,
          status: "galat",
          pesan: cek.error.issues[0]?.message ?? "Data tidak valid",
        };
      }
      if (ada.has(email)) {
        return { nomor: i + 2, nilai, status: "lewati", pesan: "Email sudah terdaftar" };
      }
      ada.add(email);
      return { nomor: i + 2, nilai, status: "baru" };
    });

    return { ok: true, jenis, baris, kolom: KOLOM.pengguna };
  }

  // jenis === "saldo"
  const { data: adaData } = await supabase
    .from("opening_balances")
    .select("periode")
    .returns<{ periode: string }[]>();
  const ada = new Set((adaData ?? []).map((s) => String(s.periode).slice(0, 7)));

  const baris = data.map((r, i): BarisPratinjau => {
    const periodeMentah = (r.periode ?? r.bulan ?? "").trim();
    const periode = periodeMentah.slice(0, 7);
    const jumlah = angkaDariSel(r.saldo_awal ?? r.saldo ?? "");
    const nilai = { periode, saldo_awal: jumlah, catatan: r.catatan || null };

    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(periode)) {
      return {
        nomor: i + 2,
        nilai,
        status: "galat",
        pesan: "Periode harus format YYYY-MM, contoh 2026-10",
      };
    }
    if (!Number.isFinite(jumlah) || jumlah < 0) {
      return { nomor: i + 2, nilai, status: "galat", pesan: "Saldo awal bukan angka yang sah" };
    }
    return {
      nomor: i + 2,
      nilai,
      status: ada.has(periode) ? "diperbarui" : "baru",
      pesan: ada.has(periode) ? "Menimpa nilai lama" : undefined,
    };
  });

  return { ok: true, jenis, baris, kolom: KOLOM.saldo };
}

/** Menyimpan baris yang lolos validasi. Baris bermasalah dilewati. */
export async function jalankanImport(
  _state: HasilAksi | null,
  formData: FormData,
): Promise<HasilAksi> {
  const profil = await wajibRole("admin");

  const jenis = String(formData.get("jenis") ?? "") as JenisImport;
  if (!KOLOM[jenis]) return { ok: false, pesan: "Jenis data tidak dikenal." };

  let baris: BarisPratinjau[];
  try {
    baris = JSON.parse(String(formData.get("baris") ?? "[]")) as BarisPratinjau[];
  } catch {
    return { ok: false, pesan: "Data pratinjau rusak. Ulangi pratinjau." };
  }

  const dipakai = baris.filter(
    (b) => b.status === "baru" || b.status === "diperbarui",
  );
  if (dipakai.length === 0) {
    return { ok: false, pesan: "Tidak ada baris yang bisa disimpan." };
  }

  const supabase = await buatSupabaseServer();
  let error: { message: string } | null = null;

  if (jenis === "kategori") {
    ({ error } = await supabase.from("categories").insert(
      dipakai.map((b) => ({
        nama: String(b.nilai.nama),
        deskripsi: b.nilai.deskripsi ? String(b.nilai.deskripsi) : null,
        dibuat_oleh: profil.id,
      })),
    ));
  } else if (jenis === "pengguna") {
    ({ error } = await supabase.from("profiles").insert(
      dipakai.map((b) => ({
        email: String(b.nilai.email),
        nama: String(b.nilai.nama),
        role: String(b.nilai.role),
        no_wa: b.nilai.no_wa ? String(b.nilai.no_wa) : null,
      })),
    ));
  } else {
    ({ error } = await supabase.from("opening_balances").upsert(
      dipakai.map((b) => ({
        periode: `${String(b.nilai.periode)}-01`,
        saldo_awal: Number(b.nilai.saldo_awal),
        catatan: b.nilai.catatan ? String(b.nilai.catatan) : null,
        diisi_oleh: profil.id,
      })),
      { onConflict: "periode" },
    ));
  }

  if (error) return { ok: false, pesan: `Gagal menyimpan: ${error.message}` };

  await tulisAudit({
    aktor: profil,
    aksi: "import",
    tabel: jenis === "saldo" ? "opening_balances" : jenis === "pengguna" ? "profiles" : "categories",
    sesudah: { jumlah: dipakai.length },
    catatan: `Import ${jenis} dari Google Sheets`,
  });

  revalidatePath("/kategori");
  revalidatePath("/pengguna");
  revalidatePath("/laporan");
  return { ok: true, pesan: `${dipakai.length} baris berhasil disimpan.` };
}
