"use client";

import { Bell, LogOut, Plus, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { MENU } from "@/components/navigasi";
import { TemaToggle } from "@/components/tema-toggle";
import { punyaRole } from "@/lib/auth-shared";
import type { Profile } from "@/lib/types";
import { LABEL_ROLE } from "@/lib/types";
import { cn, inisial } from "@/lib/utils";

/**
 * Kerangka aplikasi: sidebar di desktop, bottom navigation di HP.
 */
export function AppShell({
  profil,
  belumDibaca,
  children,
}: {
  profil: Profile;
  belumDibaca: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const menu = MENU.filter((m) => punyaRole(profil.role, m.minimal));
  const menuBawah = menu.filter((m) => m.utama).slice(0, 4);

  const aktif = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="min-h-dvh bg-background">
      {/* Sidebar - hanya desktop */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-border bg-card md:flex">
        <div className="flex h-16 items-center gap-2 px-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-app)] bg-primary text-primary-foreground">
            <Wallet className="h-5 w-5" aria-hidden />
          </span>
          <span className="text-base font-semibold tracking-tight">DompetRumah</span>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2">
          {menu.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              className={cn(
                "flex items-center gap-3 rounded-[var(--radius-app)] px-3 py-2 text-sm font-medium transition",
                aktif(m.href)
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <m.ikon className="h-4 w-4 shrink-0" aria-hidden />
              <span className="flex-1">{m.label}</span>
              {m.href === "/notifikasi" && belumDibaca > 0 && (
                <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                  {belumDibaca}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div className="border-t border-border p-3">
          <div className="flex items-center gap-3 rounded-[var(--radius-app)] px-2 py-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
              {inisial(profil.nama)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{profil.nama}</p>
              <p className="truncate text-xs text-muted-foreground">
                {LABEL_ROLE[profil.role]}
              </p>
            </div>
            <form action="/auth/keluar" method="post">
              <button
                type="submit"
                aria-label="Keluar"
                title="Keluar"
                className="rounded-[var(--radius-app)] p-2 text-muted-foreground transition hover:bg-muted hover:text-destructive"
              >
                <LogOut className="h-4 w-4" aria-hidden />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Header - hanya HP */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-card px-4 md:hidden">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-app)] bg-primary text-primary-foreground">
            <Wallet className="h-4 w-4" aria-hidden />
          </span>
          <span className="text-sm font-semibold">DompetRumah</span>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href="/notifikasi"
            aria-label={
              belumDibaca > 0
                ? `Notifikasi, ${belumDibaca} belum dibaca`
                : "Notifikasi"
            }
            className="relative rounded-[var(--radius-app)] p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <Bell className="h-4 w-4" aria-hidden />
            {belumDibaca > 0 && (
              <span className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                {belumDibaca > 9 ? "9+" : belumDibaca}
              </span>
            )}
          </Link>
          <TemaToggle />
          <form action="/auth/keluar" method="post">
            <button
              type="submit"
              aria-label="Keluar"
              className="rounded-[var(--radius-app)] p-2 text-muted-foreground transition hover:bg-muted hover:text-destructive"
            >
              <LogOut className="h-4 w-4" aria-hidden />
            </button>
          </form>
        </div>
      </header>

      {/* Konten */}
      <div className="md:pl-64">
        <div className="hidden h-16 items-center justify-end gap-2 border-b border-border px-6 md:flex">
          <Link
            href="/notifikasi"
            aria-label={
              belumDibaca > 0
                ? `Notifikasi, ${belumDibaca} belum dibaca`
                : "Notifikasi"
            }
            className="relative rounded-[var(--radius-app)] p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <Bell className="h-4 w-4" aria-hidden />
            {belumDibaca > 0 && (
              <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                {belumDibaca > 9 ? "9+" : belumDibaca}
              </span>
            )}
          </Link>
          <TemaToggle />
        </div>
        <main className="mx-auto w-full max-w-5xl px-4 pt-5 pb-28 sm:px-6 md:pb-10">
          {children}
        </main>
      </div>

      {/* Tombol catat cepat - hanya HP */}
      <Link
        href="/pengeluaran/baru"
        aria-label="Catat pengeluaran"
        className="fixed right-4 bottom-20 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:opacity-90 md:hidden"
      >
        <Plus className="h-6 w-6" aria-hidden />
      </Link>

      {/* Bottom navigation - hanya HP */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card md:hidden">
        <ul className="flex">
          {menuBawah.map((m) => (
            <li key={m.href} className="flex-1">
              <Link
                href={m.href}
                className={cn(
                  "relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition",
                  aktif(m.href) ? "text-primary" : "text-muted-foreground",
                )}
              >
                <m.ikon className="h-5 w-5" aria-hidden />
                {m.labelPendek}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
