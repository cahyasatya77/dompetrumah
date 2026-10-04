import nodemailer, { type Transporter } from "nodemailer";

export type HasilKirim = {
  status: "terkirim" | "gagal" | "dilewati";
  galat?: string;
};

let transporter: Transporter | null = null;

/** Konfigurasi dianggap siap hanya bila kedua nilai terisi. */
export function emailAktif(): boolean {
  return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

function ambilTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }
  return transporter;
}

/**
 * Mengirim satu email.
 * Tidak pernah melempar error: pemanggilnya hanya perlu tahu hasilnya,
 * karena gagal kirim notifikasi tidak boleh membatalkan aksi utama.
 */
export async function kirimEmail(opsi: {
  ke: string;
  subjek: string;
  teks: string;
  html?: string;
}): Promise<HasilKirim> {
  if (!emailAktif()) {
    console.info(`[email] dilewati (belum dikonfigurasi) -> ${opsi.ke}: ${opsi.subjek}`);
    return { status: "dilewati", galat: "GMAIL_USER / GMAIL_APP_PASSWORD belum diisi" };
  }

  try {
    await ambilTransporter().sendMail({
      from: `"DompetRumah" <${process.env.GMAIL_USER}>`,
      to: opsi.ke,
      subject: opsi.subjek,
      text: opsi.teks,
      html: opsi.html ?? bungkusHtml(opsi.subjek, opsi.teks),
    });
    return { status: "terkirim" };
  } catch (e) {
    const galat = e instanceof Error ? e.message : String(e);
    console.error(`[email] gagal -> ${opsi.ke}: ${galat}`);
    return { status: "gagal", galat };
  }
}

/** Kerangka HTML sederhana supaya email tidak tampil polos. */
function bungkusHtml(judul: string, teks: string): string {
  const isi = teks
    .split("\n")
    .filter(Boolean)
    .map((b) => `<p style="margin:0 0 12px">${lolos(b)}</p>`)
    .join("");

  return `<!doctype html><html lang="id"><body style="margin:0;background:#f5f7f6;font-family:Arial,Helvetica,sans-serif">
<div style="max-width:520px;margin:24px auto;background:#fff;border:1px solid #e3e8e6;border-radius:12px;overflow:hidden">
  <div style="background:#127c6b;padding:16px 20px"><strong style="color:#fff;font-size:15px">DompetRumah</strong></div>
  <div style="padding:20px;color:#1f2937;font-size:14px;line-height:1.6">
    <h1 style="margin:0 0 12px;font-size:16px;color:#111827">${lolos(judul)}</h1>
    ${isi}
  </div>
  <div style="padding:12px 20px;background:#f5f7f6;color:#6b7280;font-size:12px">
    Email otomatis dari aplikasi pencatatan pengeluaran keluarga.
  </div>
</div></body></html>`;
}

function lolos(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
