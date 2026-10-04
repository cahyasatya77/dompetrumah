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

export type ExpenseStatus = "pending" | "aktif" | "ditolak";

export type Expense = {
  id: string;
  tanggal: string;
  category_id: string;
  keterangan: string | null;
  nominal: number;
  kuantiti: number;
  unit_id: string | null;
  total: number;
  status: ExpenseStatus;
  dicatat_oleh: string;
  dihapus_pada: string | null;
  dihapus_oleh: string | null;
  dibuat_pada: string;
  diperbarui_pada: string;
};

/** Transaksi beserta nama kategori, satuan, dan pencatatnya. */
export type ExpenseLengkap = Expense & {
  categories: { nama: string } | null;
  units: { nama: string } | null;
  pencatat: { nama: string; email: string } | null;
};

export type Attachment = {
  id: string;
  expense_id: string;
  path: string;
  nama_file: string;
  mime: string;
  ukuran: number;
  diunggah_oleh: string | null;
  dibuat_pada: string;
};

export type RequestJenis = "create" | "update" | "delete";
export type RequestStatus = "pending" | "approved" | "rejected";

export type ApprovalRequest = {
  id: string;
  jenis: RequestJenis;
  expense_id: string | null;
  pemohon_id: string;
  alasan: string | null;
  perubahan: Record<string, unknown> | null;
  data_sebelum: Record<string, unknown> | null;
  status: RequestStatus;
  peninjau_id: string | null;
  catatan_peninjau: string | null;
  ditinjau_pada: string | null;
  dibuat_pada: string;
  diperbarui_pada: string;
};

export type ApprovalRequestLengkap = ApprovalRequest & {
  pemohon: { nama: string; email: string } | null;
  peninjau: { nama: string } | null;
  expenses: ExpenseLengkap | null;
};

export type Notifikasi = {
  id: string;
  penerima_id: string;
  jenis: string;
  judul: string;
  pesan: string | null;
  tautan: string | null;
  dibaca_pada: string | null;
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

export const LABEL_STATUS: Record<ExpenseStatus, string> = {
  pending: "Menunggu persetujuan",
  aktif: "Tercatat",
  ditolak: "Ditolak",
};

export const LABEL_JENIS_REQUEST: Record<RequestJenis, string> = {
  create: "Pencatatan baru",
  update: "Permintaan ubah",
  delete: "Permintaan hapus",
};
