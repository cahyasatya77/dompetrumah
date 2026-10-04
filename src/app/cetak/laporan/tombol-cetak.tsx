"use client";

import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Membuka dialog cetak browser. Di dialog itu pilih "Save as PDF". */
export function TombolCetak() {
  return (
    <Button onClick={() => window.print()}>
      <Printer className="h-4 w-4" aria-hidden /> Cetak / simpan sebagai PDF
    </Button>
  );
}
