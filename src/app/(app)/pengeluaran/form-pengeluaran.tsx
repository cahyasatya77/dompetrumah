"use client";

import { FileText, ImageIcon, Loader2, Paperclip, X } from "lucide-react";
import { useActionState, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Hint, Input, Label, Select, Textarea } from "@/components/ui/field";
import { Pesan, TombolSubmit } from "@/components/ui/pesan";
import { formatUkuran, kompresGambar, periksaFile } from "@/lib/kompres";
import { BATAS_APPROVAL, BUCKET_STRUK } from "@/lib/konstanta";
import { buatSupabaseBrowser } from "@/lib/supabase/browser";
import type { Category, Expense, HasilAksi, Unit } from "@/lib/types";
import { formatRupiah } from "@/lib/utils";

type LampiranTerunggah = {
  path: string;
  nama_file: string;
  mime: string;
  ukuran: number;
};

type Props = {
  kategori: Category[];
  satuan: Unit[];
  profilId: string;
  aksi: (
    state: HasilAksi | null,
    formData: FormData,
  ) => Promise<HasilAksi>;
  awal?: Expense | null;
  /** Form permintaan ubah: wajib mengisi alasan. */
  perluAlasan?: boolean;
  labelTombol?: string;
  /** Tampilkan bidang lampiran (hanya saat mencatat baru). */
  pakaiLampiran?: boolean;
  onSelesai?: () => void;
};

export function FormPengeluaran({
  kategori,
  satuan,
  profilId,
  aksi,
  awal = null,
  perluAlasan = false,
  labelTombol = "Simpan",
  pakaiLampiran = true,
  onSelesai,
}: Props) {
  const [nominal, setNominal] = useState(String(awal?.nominal ?? ""));
  const [kuantiti, setKuantiti] = useState(String(awal?.kuantiti ?? "1"));
  const [lampiran, setLampiran] = useState<LampiranTerunggah[]>([]);
  const [mengunggah, setMengunggah] = useState(false);
  const [errorUnggah, setErrorUnggah] = useState<string | null>(null);
  const inputFile = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Pembungkus di sisi klien: mengosongkan form setelah server action berhasil.
  // Dilakukan di sini, bukan di useEffect, agar tidak memicu render berantai.
  const [hasil, jalankan] = useActionState(
    async (state: HasilAksi | null, formData: FormData) => {
      const r = await aksi(state, formData);
      if (r.ok) {
        formRef.current?.reset();
        setNominal("");
        setKuantiti("1");
        setLampiran([]);
        onSelesai?.();
      }
      return r;
    },
    null,
  );

  const total = (Number(nominal) || 0) * (Number(kuantiti) || 0);
  const perluApproval = total > BATAS_APPROVAL;

  async function pilihFile(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    setErrorUnggah(null);
    setMengunggah(true);
    const supabase = buatSupabaseBrowser();
    const baru: LampiranTerunggah[] = [];

    for (const asli of files) {
      const keluhan = periksaFile(asli);
      if (keluhan) {
        setErrorUnggah(keluhan);
        continue;
      }

      const file = await kompresGambar(asli);
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${profilId}/${crypto.randomUUID()}.${ext}`;

      const { error } = await supabase.storage
        .from(BUCKET_STRUK)
        .upload(path, file, { contentType: file.type, upsert: false });

      if (error) {
        setErrorUnggah(`${asli.name}: gagal diunggah (${error.message})`);
        continue;
      }

      baru.push({
        path,
        nama_file: asli.name,
        mime: file.type,
        ukuran: file.size,
      });
    }

    setLampiran((l) => [...l, ...baru]);
    setMengunggah(false);
    if (inputFile.current) inputFile.current.value = "";
  }

  async function buangLampiran(path: string) {
    const supabase = buatSupabaseBrowser();
    await supabase.storage.from(BUCKET_STRUK).remove([path]);
    setLampiran((l) => l.filter((x) => x.path !== path));
  }

  return (
    <form ref={formRef} action={jalankan} className="space-y-4">
      {awal && <input type="hidden" name="id" value={awal.id} />}
      <input type="hidden" name="lampiran" value={JSON.stringify(lampiran)} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="tanggal">Tanggal</Label>
          <Input
            id="tanggal"
            name="tanggal"
            type="date"
            required
            defaultValue={awal?.tanggal ?? new Date().toISOString().slice(0, 10)}
          />
        </div>

        <div>
          <Label htmlFor="category_id">Kategori</Label>
          <Select
            id="category_id"
            name="category_id"
            required
            defaultValue={awal?.category_id ?? ""}
          >
            <option value="" disabled>
              Pilih kategori
            </option>
            {kategori.map((k) => (
              <option key={k.id} value={k.id}>
                {k.nama}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="nominal">Harga satuan (Rp)</Label>
          <Input
            id="nominal"
            name="nominal"
            type="number"
            min="0"
            step="any"
            required
            inputMode="decimal"
            value={nominal}
            onChange={(e) => setNominal(e.target.value)}
            placeholder="25000"
          />
        </div>

        <div>
          <Label htmlFor="kuantiti">Kuantiti</Label>
          <Input
            id="kuantiti"
            name="kuantiti"
            type="number"
            min="0.001"
            step="any"
            required
            inputMode="decimal"
            value={kuantiti}
            onChange={(e) => setKuantiti(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="unit_id">Satuan</Label>
          <Select id="unit_id" name="unit_id" defaultValue={awal?.unit_id ?? ""}>
            <option value="">—</option>
            {satuan.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nama}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="rounded-[var(--radius-app)] bg-muted px-4 py-3">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="text-xl font-semibold tabular-nums">
            {formatRupiah(total)}
          </span>
        </div>
        {perluApproval && (
          <p className="mt-2 text-xs text-[var(--warning)]">
            Melebihi {formatRupiah(BATAS_APPROVAL)} — perlu persetujuan supervisor
            sebelum dihitung.
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="keterangan">Keterangan</Label>
        <Textarea
          id="keterangan"
          name="keterangan"
          maxLength={200}
          defaultValue={awal?.keterangan ?? ""}
          placeholder="Contoh: belanja sayur di pasar"
        />
      </div>

      {perluAlasan && (
        <div>
          <Label htmlFor="alasan">Alasan perubahan</Label>
          <Textarea
            id="alasan"
            name="alasan"
            required
            minLength={5}
            maxLength={300}
            placeholder="Jelaskan kenapa transaksi ini perlu diubah"
          />
          <Hint>Dibaca supervisor saat menimbang permintaan Anda.</Hint>
        </div>
      )}

      {pakaiLampiran && (
        <div>
          <Label htmlFor="berkas">Lampiran struk</Label>
          <input
            ref={inputFile}
            id="berkas"
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={pilihFile}
            className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-[var(--radius-app)] file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm file:font-medium file:text-foreground hover:file:opacity-80"
          />
          <Hint>JPG, PNG, atau PDF. Maks 5 MB per file; foto dikompres otomatis.</Hint>

          {mengunggah && (
            <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Mengunggah…
            </p>
          )}

          {errorUnggah && (
            <p className="mt-2 text-sm text-destructive">{errorUnggah}</p>
          )}

          {lampiran.length > 0 && (
            <ul className="mt-3 space-y-2">
              {lampiran.map((l) => (
                <li
                  key={l.path}
                  className="flex items-center gap-2 rounded-[var(--radius-app)] border border-border px-3 py-2 text-sm"
                >
                  {l.mime === "application/pdf" ? (
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  ) : (
                    <ImageIcon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  )}
                  <span className="min-w-0 flex-1 truncate">{l.nama_file}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatUkuran(l.ukuran)}
                  </span>
                  <button
                    type="button"
                    onClick={() => buangLampiran(l.path)}
                    aria-label={`Hapus lampiran ${l.nama_file}`}
                    className="shrink-0 rounded p-1 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Pesan hasil={hasil} />

      <div className="flex gap-2">
        <TombolSubmit disabled={mengunggah}>{labelTombol}</TombolSubmit>
        {onSelesai && (
          <Button varian="outline" onClick={onSelesai}>
            Batal
          </Button>
        )}
      </div>
    </form>
  );
}

/** Pembungkus kartu untuk halaman "catat pengeluaran". */
export function KartuFormPengeluaran(props: Props & { judul: string }) {
  const { judul, ...sisanya } = props;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Paperclip className="h-4 w-4 text-muted-foreground" aria-hidden />
          {judul}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <FormPengeluaran {...sisanya} />
      </CardContent>
    </Card>
  );
}
