/**
 * Uji konfigurasi email tanpa menjalankan aplikasi.
 *
 *   node scripts/uji-email.mjs
 *   node scripts/uji-email.mjs tujuan@gmail.com
 *
 * Membaca GMAIL_USER dan GMAIL_APP_PASSWORD dari .env.local, mencoba login
 * ke Gmail, lalu mengirim satu email percobaan. Tanpa argumen, email dikirim
 * ke alamat Anda sendiri.
 */
import fs from "node:fs";
import path from "node:path";
import nodemailer from "nodemailer";

const berkasEnv = path.join(process.cwd(), ".env.local");

if (!fs.existsSync(berkasEnv)) {
  console.error("Tidak menemukan .env.local. Jalankan dari folder proyek.");
  process.exit(1);
}

const env = Object.fromEntries(
  fs
    .readFileSync(berkasEnv, "utf8")
    .split(/\r?\n/)
    .filter((b) => /^[A-Z_]+=/.test(b))
    .map((b) => [b.slice(0, b.indexOf("=")), b.slice(b.indexOf("=") + 1).trim()]),
);

const user = env.GMAIL_USER;
const pass = env.GMAIL_APP_PASSWORD;

if (!user || !pass) {
  console.error("GMAIL_USER atau GMAIL_APP_PASSWORD masih kosong di .env.local.");
  process.exit(1);
}

if (/\s/.test(pass)) {
  console.error(
    "App Password masih mengandung spasi. Google menampilkannya berkelompok\n" +
      "empat huruf, tapi yang disimpan harus 16 huruf tanpa spasi.",
  );
  process.exit(1);
}

if (pass.length !== 16) {
  console.warn(
    `Peringatan: App Password biasanya 16 huruf, yang terisi ${pass.length}.`,
  );
}

const tujuan = process.argv[2] || user;

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user, pass },
  connectionTimeout: 20_000,
});

try {
  process.stdout.write("Menghubungi Gmail… ");
  await transporter.verify();
  console.log("login berhasil.");

  process.stdout.write(`Mengirim email ke ${tujuan}… `);
  const info = await transporter.sendMail({
    from: `"DompetRumah" <${user}>`,
    to: tujuan,
    subject: "[DompetRumah] Uji coba pengiriman email",
    text:
      "Kalau email ini sampai, konfigurasi Gmail SMTP di DompetRumah sudah benar.\n\n" +
      "Email ini dikirim oleh scripts/uji-email.mjs, bukan oleh aplikasi.",
  });
  console.log("terkirim.");
  console.log("Message ID:", info.messageId);
  console.log("\nCek kotak masuk (dan folder Spam) alamat tujuan.");
} catch (e) {
  console.log("gagal.\n");
  const kode = e.code ?? "";

  if (kode === "EAUTH") {
    console.error(
      "Gmail menolak login. Penyebab yang paling sering:\n" +
        "  - yang diisi password Gmail biasa, bukan App Password\n" +
        "  - App Password sudah dicabut di akun Google\n" +
        "  - verifikasi 2 langkah belum aktif, sehingga App Password tidak berlaku\n" +
        "Buat yang baru di https://myaccount.google.com/apppasswords",
    );
  } else if (kode === "EDNS" || kode === "ECONNECTION" || kode === "ETIMEDOUT") {
    console.error(
      "Tidak bisa menjangkau smtp.gmail.com. Biasanya karena jaringan kantor\n" +
        "atau antivirus memblokir port 465/587. Coba dari jaringan lain.",
    );
  } else {
    console.error(`${kode} ${e.message}`);
  }
  process.exit(1);
}
