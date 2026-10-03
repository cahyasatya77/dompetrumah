"use client";

import { Pencil, Plus, Power, X } from "lucide-react";
import { useActionState, useEffect, useState } from "react";

import {
  tambahPengguna,
  ubahPengguna,
  ubahStatusPengguna,
} from "@/app/(app)/pengguna/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Hint, Input, Label, Select } from "@/components/ui/field";
import { Pesan, TombolSubmit } from "@/components/ui/pesan";
import type { Profile } from "@/lib/types";
import { LABEL_ROLE } from "@/lib/types";
import { formatWaktu, inisial } from "@/lib/utils";

export function PenggunaKlien({
  pengguna,
  idSaya,
}: {
  pengguna: Profile[];
  idSaya: string;
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
              <Plus className="h-4 w-4" aria-hidden /> Daftarkan pengguna
            </>
          )}
        </Button>
      </div>

      {bukaTambah && <FormTambah onSelesai={() => setBukaTambah(false)} />}

      <Card>
        <CardHeader className="flex items-center justify-between gap-3">
          <CardTitle>Daftar pengguna</CardTitle>
          <span className="text-sm text-muted-foreground">
            {pengguna.length} pengguna
          </span>
        </CardHeader>
        <CardContent className="px-0 sm:px-0">
          <ul className="divide-y divide-border border-t border-border">
            {pengguna.map((p) =>
              idEdit === p.id ? (
                <li key={p.id} className="px-4 py-4 sm:px-5">
                  <FormEdit pengguna={p} onSelesai={() => setIdEdit(null)} />
                </li>
              ) : (
                <BarisPengguna
                  key={p.id}
                  pengguna={p}
                  saya={p.id === idSaya}
                  onEdit={() => {
                    setIdEdit(p.id);
                    setBukaTambah(false);
                  }}
                />
              ),
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

/** Daftar pilihan role, dipakai di form tambah maupun ubah. */
function PilihanRole() {
  return (
    <>
      <option value="user">User — hanya mencatat, perubahan lewat approval</option>
      <option value="supervisor">
        Supervisor — menyetujui request &amp; kelola kategori
      </option>
      <option value="admin">Admin — akses penuh termasuk kelola pengguna</option>
    </>
  );
}

function FormTambah({ onSelesai }: { onSelesai: () => void }) {
  const [hasil, aksi] = useActionState(tambahPengguna, null);

  useEffect(() => {
    if (hasil?.ok) onSelesai();
  }, [hasil, onSelesai]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daftarkan pengguna baru</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={aksi} className="space-y-3">
          <div>
            <Label htmlFor="email-baru">Email Google</Label>
            <Input
              id="email-baru"
              name="email"
              type="email"
              required
              inputMode="email"
              placeholder="nama@gmail.com"
            />
            <Hint>
              Harus email akun Google. Pengguna masuk lewat tombol
              &ldquo;Masuk dengan Google&rdquo;, tanpa password.
            </Hint>
          </div>
          <div>
            <Label htmlFor="nama-baru">Nama</Label>
            <Input id="nama-baru" name="nama" required maxLength={80} />
          </div>
          <div>
            <Label htmlFor="role-baru">Role</Label>
            <Select id="role-baru" name="role" defaultValue="user">
              <PilihanRole />
            </Select>
          </div>
          <div>
            <Label htmlFor="wa-baru">Nomor WhatsApp (opsional)</Label>
            <Input
              id="wa-baru"
              name="no_wa"
              inputMode="tel"
              placeholder="081234567890"
            />
            <Hint>Dipakai untuk notifikasi mulai Fase 4.</Hint>
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
  pengguna,
  onSelesai,
}: {
  pengguna: Profile;
  onSelesai: () => void;
}) {
  const [hasil, aksi] = useActionState(ubahPengguna, null);

  useEffect(() => {
    if (hasil?.ok) onSelesai();
  }, [hasil, onSelesai]);

  return (
    <form action={aksi} className="space-y-3">
      <input type="hidden" name="id" value={pengguna.id} />
      <p className="text-sm text-muted-foreground">{pengguna.email}</p>
      <div>
        <Label htmlFor={`nama-${pengguna.id}`}>Nama</Label>
        <Input
          id={`nama-${pengguna.id}`}
          name="nama"
          defaultValue={pengguna.nama}
          required
          maxLength={80}
        />
      </div>
      <div>
        <Label htmlFor={`role-${pengguna.id}`}>Role</Label>
        <Select
          id={`role-${pengguna.id}`}
          name="role"
          defaultValue={pengguna.role}
        >
          <PilihanRole />
        </Select>
      </div>
      <div>
        <Label htmlFor={`wa-${pengguna.id}`}>Nomor WhatsApp (opsional)</Label>
        <Input
          id={`wa-${pengguna.id}`}
          name="no_wa"
          defaultValue={pengguna.no_wa ?? ""}
          inputMode="tel"
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

function BarisPengguna({
  pengguna,
  saya,
  onEdit,
}: {
  pengguna: Profile;
  saya: boolean;
  onEdit: () => void;
}) {
  const [hasil, aksi] = useActionState(ubahStatusPengguna, null);

  return (
    <li className="px-4 py-3 sm:px-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
            {inisial(pengguna.nama)}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">{pengguna.nama}</p>
              <Badge nada={pengguna.role === "user" ? "netral" : "primary"}>
                {LABEL_ROLE[pengguna.role]}
              </Badge>
              {!pengguna.aktif && <Badge nada="bahaya">Nonaktif</Badge>}
              {saya && <Badge nada="netral">Anda</Badge>}
            </div>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              {pengguna.email}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {pengguna.login_terakhir
                ? `Login terakhir ${formatWaktu(pengguna.login_terakhir)}`
                : "Belum pernah login"}
              {pengguna.no_wa ? ` · WA ${pengguna.no_wa}` : ""}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            varian="ghost"
            ukuran="icon"
            onClick={onEdit}
            aria-label={`Ubah ${pengguna.nama}`}
            title="Ubah"
          >
            <Pencil className="h-4 w-4" aria-hidden />
          </Button>

          {!saya && (
            <form action={aksi}>
              <input type="hidden" name="id" value={pengguna.id} />
              <input
                type="hidden"
                name="aktif"
                value={pengguna.aktif ? "false" : "true"}
              />
              <TombolSubmit
                varian="ghost"
                ukuran="icon"
                labelProses="…"
                aria-label={
                  pengguna.aktif
                    ? `Nonaktifkan ${pengguna.nama}`
                    : `Aktifkan ${pengguna.nama}`
                }
                title={pengguna.aktif ? "Nonaktifkan" : "Aktifkan"}
              >
                <Power className="h-4 w-4" aria-hidden />
              </TombolSubmit>
            </form>
          )}
        </div>
      </div>

      <Pesan hasil={hasil?.ok === false ? hasil : null} className="mt-2" />
    </li>
  );
}
