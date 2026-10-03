import * as React from "react";

import { cn } from "@/lib/utils";

type Nada = "netral" | "primary" | "sukses" | "peringatan" | "bahaya";

const nadaClass: Record<Nada, string> = {
  netral: "bg-muted text-muted-foreground",
  primary: "bg-accent text-accent-foreground",
  sukses: "bg-[var(--success)]/15 text-[var(--success)]",
  peringatan: "bg-[var(--warning)]/15 text-[var(--warning)]",
  bahaya: "bg-destructive/15 text-destructive",
};

export function Badge({
  className,
  nada = "netral",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { nada?: Nada }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        nadaClass[nada],
        className,
      )}
      {...props}
    />
  );
}
