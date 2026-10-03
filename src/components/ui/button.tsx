import * as React from "react";

import { cn } from "@/lib/utils";

type Varian = "primary" | "outline" | "ghost" | "destructive" | "muted";
type Ukuran = "sm" | "md" | "icon";

const varianClass: Record<Varian, string> = {
  primary:
    "bg-primary text-primary-foreground hover:opacity-90 shadow-sm",
  outline:
    "border border-border bg-card text-foreground hover:bg-muted",
  ghost: "text-foreground hover:bg-muted",
  muted: "bg-muted text-foreground hover:opacity-80",
  destructive:
    "bg-destructive text-destructive-foreground hover:opacity-90 shadow-sm",
};

const ukuranClass: Record<Ukuran, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  icon: "h-9 w-9",
};

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  varian?: Varian;
  ukuran?: Ukuran;
};

export function Button({
  className,
  varian = "primary",
  ukuran = "md",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center rounded-[var(--radius-app)] font-medium transition",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:pointer-events-none disabled:opacity-50",
        varianClass[varian],
        ukuranClass[ukuran],
        className,
      )}
      {...props}
    />
  );
}
