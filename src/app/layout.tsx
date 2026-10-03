import type { Metadata, Viewport } from "next";

import { SKRIP_TEMA } from "@/components/tema-toggle";

import "./globals.css";

export const metadata: Metadata = {
  title: "DompetRumah",
  description: "Pencatatan pengeluaran rumah tangga",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#13201d" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        {/* Menetapkan tema sebelum render agar tidak berkedip. */}
        <script dangerouslySetInnerHTML={{ __html: SKRIP_TEMA }} />
      </head>
      <body className="font-sans">{children}</body>
    </html>
  );
}
