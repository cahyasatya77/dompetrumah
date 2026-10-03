"use client";

import { Pencil, Plus, Power, Trash2, X } from "lucide-react";
import { useActionState, useEffect, useState } from "react";

import {
  hapusKategori,
  tambahKategori,
  ubahKategori,
  ubahStatusKategori,
} from "@/app/(app)/kategori/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/field";
import { Pesan, TombolSubmit } from "@/components/ui/pesan";
import type { Category } from "@/lib/types";

export function KategoriKlien({
  kategori,
  bisaHapus,
}: {
  kategori: Category[];
  bisaHapus: boolean;
}) {
  const [bukaTambah, setBukaTambah] = useState(false);
  const [idEdit, setIdEdit] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setBukaTambah((v) => !v);
            setIdEdit(null);
          }}
          varian={bukaTambah ? "outline" : "primary"}
        >
          {bukaTambah ? (
            <>
              <X className="h-4 w-4" aria-hidden /> Batal
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" aria-hidden /> Tambah kategori
            </>
          )}
        </Button>
      </div>

      {bukaTambah && <FormTambah onSelesai={() => setBukaTambah(false)} />}

      <Card>
        <CardHeader className="flex items-center justify-between gap-3">
          <CardTitle>Daftar kategori</CardTitle>
          <span className="text-sm text-muted-foreground">
            {kategori.length} kategori
          </span>
        </CardHeader>
        <CardContent className="px-0 sm:px-0">
          {kategori.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground sm:px-5">
              Belum ada kategori. Tambahkan kategori pertama Anda.
            </p>
          ) : (
            <ul className="divide-y divide-border border-t border-border">
              {kategori.map((k) =>
                idEdit === k.id ? (
                  <li key={k.id} className="px-4 py-4 sm:px-5">
                    <FormEdit kategori={k} onSelesai={() => setIdEdit(null)} />
                  </li>
                ) : (
                  <BarisKategori
                    key={k.id}
                    kategori={k}
                    bisaHapus={bisaHapus}
                    onEdit={() => {
                      setIdEdit(k.id);
                      setBukaTambah(false);
                    }}
                  />
                ),
              )}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FormTambah({ onSelesai }: { onSelesai: () => void }) {
  const [hasil, aksi] = useActionState(tambahKategori, null);

  // Tutup panel setelah berhasil disimpan.
  useEffect(() => {
    if (hasil?.ok) onSelesai();
  }, [hasil, onSelesai]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kategori baru</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={aksi} className="space-y-3">
          <div>
            <Label htmlFor="nama-baru">Nama kategori</Label>
            <Input
              id="nama-baru"
              name="nama"
              required
              maxLength={60}
              placeholder="Contoh: Belanja Mingguan"
            />
          </div>
          <div>
            <Label htmlFor="deskripsi-baru">Deskripsi (opsional)</Label>
            <Textarea
              id="deskripsi-baru"
              name="deskripsi"
              maxLength={200}
              placeholder="Penjelasan singkat kategori ini"
            />
          </div>
          <Pesan hasil={hasil} />
          <div className="flex gap-2">
            <TombolSubmit>Simpan</TombolSubmit>
            <Button varian="outline" onClick={onSelesai}>
              Batal
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function FormEdit({
  kategori,
  onSelesai,
}: {
  kategori: Category;
  onSelesai: () => void;
}) {
  const [hasil, aksi] = useActionState(ubahKategori, null);

  useEffect(() => {
    if (hasil?.ok) onSelesai();
  }, [hasil, onSelesai]);

  return (
    <form action={aksi} className="space-y-3">
      <input type="hidden" name="id" value={kategori.id} />
      <div>
        <Label htmlFor={`nama-${kategori.id}`}>Nama kategori</Label>
        <Input
          id={`nama-${kategori.id}`}
          name="nama"
          defaultValue={kategori.nama}
          required
          maxLength={60}
        />
      </div>
      <div>
        <Label htmlFor={`deskripsi-${kategori.id}`}>Deskripsi (opsional)</Label>
        <Textarea
          id={`deskripsi-${kategori.id}`}
          name="deskripsi"
          defaultValue={kategori.deskripsi ?? ""}
          maxLength={200}
        />
      </div>
      <Pesan hasil={hasil} />
      <div className="flex gap-2">
        <TombolSubmit ukuran="sm">Simpan</TombolSubmit>
        <Button varian="outline" ukuran="sm" onClick={onSelesai}>
          Batal
        </Button>
      </div>
    </form>
  );
}

function BarisKategori({
  kategori,
  bisaHapus,
  onEdit,
}: {
  kategori: Category;
  bisaHapus: boolean;
  onEdit: () => void;
}) {
  const [hasilStatus, aksiStatus] = useActionState(ubahStatusKategori, null);
  const [hasilHapus, aksiHapus] = useActionState(hapusKategori, null);
  const [konfirmasi, setKonfirmasi] = useState(false);

  return (
    <li className="px-4 py-3 sm:px-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium">{kategori.nama}</p>
            {!kategori.aktif && <Badge nada="netral">Nonaktif</Badge>}
          </div>
          {kategori.deskripsi && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {kategori.deskripsi}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            varian="ghost"
            ukuran="icon"
            onClick={onEdit}
            aria-label={`Ubah ${kategori.nama}`}
            title="Ubah"
          >
            <Pencil className="h-4 w-4" aria-hidden />
          </Button>

          <form action={aksiStatus}>
            <input type="hidden" name="id" value={kategori.id} />
            <input
              type="hidden"
              name="aktif"
              value={kategori.aktif ? "false" : "true"}
            />
            <TombolSubmit
              varian="ghost"
              ukuran="icon"
              labelProses="…"
              aria-label={
                kategori.aktif
                  ? `Nonaktifkan ${kategori.nama}`
                  : `Aktifkan ${kategori.nama}`
              }
              title={kategori.aktif ? "Nonaktifkan" : "Aktifkan"}
            >
              <Power className="h-4 w-4" aria-hidden />
            </TombolSubmit>
          </form>

          {bisaHapus && !konfirmasi && (
            <Button
              varian="ghost"
              ukuran="icon"
              onClick={() => setKonfirmasi(true)}
              aria-label={`Hapus ${kategori.nama}`}
              title="Hapus"
              className="text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </Button>
          )}
        </div>
      </div>

      {konfirmasi && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-[var(--radius-app)] bg-destructive/10 px-3 py-2">
          <span className="text-sm text-destructive">
            Hapus kategori ini permanen?
          </span>
          <form action={aksiHapus} className="flex gap-2">
            <input type="hidden" name="id" value={kategori.id} />
            <TombolSubmit
              varian="destructive"
              ukuran="sm"
              labelProses="Menghapus…"
            >
              Ya, hapus
            </TombolSubmit>
            <Button
              varian="outline"
              ukuran="sm"
              onClick={() => setKonfirmasi(false)}
            >
              Batal
            </Button>
          </form>
        </div>
      )}

      <Pesan hasil={hasilStatus?.ok === false ? hasilStatus : null} className="mt-2" />
      <Pesan hasil={hasilHapus?.ok === false ? hasilHapus : null} className="mt-2" />
    </li>
  );
}
