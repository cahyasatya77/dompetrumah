"use client";

import { useFormStatus } from "react-dom";

import { Button, type ButtonProps } from "@/components/ui/button";
import type { HasilAksi } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Menampilkan hasil server action (berhasil / gagal). */
export function Pesan({
  hasil,
  className,
}: {
  hasil: HasilAksi | null;
  className?: string;
}) {
  if (!hasil?.pesan) return null;

  return (
    <p
      role="status"
      className={cn(
        "rounded-[var(--radius-app)] px-3 py-2 text-sm",
        hasil.ok
          ? "bg-[var(--success)]/12 text-[var(--success)]"
          : "bg-destructive/12 text-destructive",
        className,
      )}
    >
      {hasil.pesan}
    </p>
  );
}

/** Tombol submit yang otomatis nonaktif selama form dikirim. */
export function TombolSubmit({
  children,
  labelProses = "Menyimpan…",
  ...props
}: ButtonProps & { labelProses?: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending ? labelProses : children}
    </Button>
  );
}
