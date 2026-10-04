"use client";

import { Send, Sparkles } from "lucide-react";
import { useRef, useState, useTransition } from "react";

import { tanyaAi } from "@/app/(app)/chat/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import type { Pesan } from "@/lib/ai";
import { cn } from "@/lib/utils";

const CONTOH = [
  "Berapa pengeluaran bensin bulan lalu?",
  "Kategori apa yang paling boros bulan ini?",
  "Bandingkan total bulan ini dengan bulan lalu",
  "Sisa anggaran saya berapa?",
];

export function ChatKlien({ aktif }: { aktif: boolean }) {
  const [riwayat, setRiwayat] = useState<Pesan[]>([]);
  const [galat, setGalat] = useState<string | null>(null);
  const [menunggu, mulai] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function kirim(pertanyaan: string) {
    const teks = pertanyaan.trim();
    if (!teks || menunggu) return;

    setGalat(null);
    const sebelum = riwayat;
    setRiwayat([...sebelum, { peran: "pengguna", isi: teks }]);
    if (inputRef.current) inputRef.current.value = "";

    mulai(async () => {
      const fd = new FormData();
      fd.set("pertanyaan", teks);
      fd.set("riwayat", JSON.stringify(sebelum));

      const hasil = await tanyaAi(null, fd);

      if (hasil.ok && hasil.teks) {
        setRiwayat((r) => [...r, { peran: "asisten", isi: hasil.teks as string }]);
      } else {
        setGalat(hasil.pesan ?? "Gagal mendapat jawaban.");
      }
    });
  }

  return (
    <div className="space-y-4">
      {!aktif && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm">
              Chat AI belum tersambung. Isi{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                GEMINI_API_KEY
              </code>{" "}
              di <code className="rounded bg-muted px-1 py-0.5 text-xs">.env.local</code>,
              lalu jalankan ulang aplikasi.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Kunci gratis bisa dibuat di aistudio.google.com.
            </p>
          </CardContent>
        </Card>
      )}

      {riwayat.length === 0 ? (
        <Card>
          <CardContent className="pt-5 pb-5 text-center">
            <Sparkles className="mx-auto mb-3 h-6 w-6 text-muted-foreground" aria-hidden />
            <p className="text-sm text-muted-foreground">
              Tanyakan apa saja tentang pengeluaran keluarga. Jawaban diambil dari
              data yang boleh Anda lihat.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {CONTOH.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => kirim(c)}
                  disabled={!aktif || menunggu}
                  className="rounded-full border border-border px-3 py-1.5 text-xs transition hover:bg-muted disabled:opacity-50"
                >
                  {c}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {riwayat.map((p, i) => (
            <div
              key={i}
              className={cn(
                "flex",
                p.peran === "pengguna" ? "justify-end" : "justify-start",
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-[var(--radius-app)] px-4 py-2.5 text-sm whitespace-pre-wrap",
                  p.peran === "pengguna"
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-card",
                )}
              >
                {p.isi}
              </div>
            </div>
          ))}

          {menunggu && (
            <div className="flex justify-start">
              <div className="rounded-[var(--radius-app)] border border-border bg-card px-4 py-2.5 text-sm text-muted-foreground">
                Sedang menghitung…
              </div>
            </div>
          )}
        </div>
      )}

      {galat && (
        <p className="rounded-[var(--radius-app)] bg-destructive/12 px-3 py-2 text-sm text-destructive">
          {galat}
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          kirim(inputRef.current?.value ?? "");
        }}
        className="sticky bottom-20 flex gap-2 md:bottom-0"
      >
        <Input
          ref={inputRef}
          name="pertanyaan"
          placeholder="Tulis pertanyaan…"
          maxLength={500}
          disabled={!aktif || menunggu}
          autoComplete="off"
        />
        <Button type="submit" disabled={!aktif || menunggu} aria-label="Kirim">
          <Send className="h-4 w-4" aria-hidden />
        </Button>
      </form>
    </div>
  );
}
