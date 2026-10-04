import * as React from "react";

import { cn } from "@/lib/utils";

const dasarInput =
  "w-full rounded-[var(--radius-app)] border border-input bg-card px-3 py-2 text-sm text-foreground " +
  "placeholder:text-muted-foreground transition " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring " +
  "disabled:cursor-not-allowed disabled:opacity-50";

// React 19 memperlakukan ref sebagai prop biasa, jadi tidak perlu forwardRef;
// tipenya saja yang harus disebutkan supaya TypeScript menerimanya.
export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  ref?: React.Ref<HTMLInputElement>;
}) {
  return <input className={cn(dasarInput, "h-10", className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(dasarInput, "min-h-20", className)} {...props} />;
}

export function Select({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(dasarInput, "h-10 pr-8", className)} {...props} />;
}

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("mb-1.5 block text-sm font-medium text-foreground", className)}
      {...props}
    />
  );
}

export function Hint({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("mt-1 text-xs text-muted-foreground", className)} {...props} />
  );
}
