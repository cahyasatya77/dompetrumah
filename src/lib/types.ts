/** Tipe data yang dipakai bersama di seluruh aplikasi. */

export type UserRole = "user" | "supervisor" | "admin";

export type Profile = {
  id: string;
  user_id: string | null;
  email: string;
  nama: string;
  role: UserRole;
  aktif: boolean;
  no_wa: string | null;
  avatar_url: string | null;
  login_terakhir: string | null;
  dibuat_pada: string;
  diperbarui_pada: string;
};

export type Category = {
  id: string;
  nama: string;
  deskripsi: string | null;
  aktif: boolean;
  dibuat_oleh: string | null;
  dibuat_pada: string;
  diperbarui_pada: string;
};

export type Unit = {
  id: string;
  nama: string;
  aktif: boolean;
  dibuat_pada: string;
  diperbarui_pada: string;
};

export type AuditLog = {
  id: number;
  aktor_profile_id: string | null;
  aktor_email: string | null;
  aksi: string;
  tabel: string;
  record_id: string | null;
  data_sebelum: unknown;
  data_sesudah: unknown;
  catatan: string | null;
  dibuat_pada: string;
};

/** Hasil balikan server action untuk form. */
export type HasilAksi = {
  ok: boolean;
  pesan?: string;
};

export const LABEL_ROLE: Record<UserRole, string> = {
  user: "User",
  supervisor: "Supervisor",
  admin: "Admin",
};
