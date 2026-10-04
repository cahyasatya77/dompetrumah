import {
  Bell,
  ClipboardCheck,
  FolderTree,
  LayoutDashboard,
  ReceiptText,
  ScrollText,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { UserRole } from "@/lib/types";

export type ItemNav = {
  label: string;
  labelPendek: string;
  href: string;
  ikon: LucideIcon;
  /** Role minimal yang boleh melihat menu ini. */
  minimal: UserRole;
  /** Tampil di bottom navigation HP. */
  utama: boolean;
};

export const MENU: ItemNav[] = [
  {
    label: "Dashboard",
    labelPendek: "Beranda",
    href: "/dashboard",
    ikon: LayoutDashboard,
    minimal: "user",
    utama: true,
  },
  {
    label: "Pengeluaran",
    labelPendek: "Catatan",
    href: "/pengeluaran",
    ikon: ReceiptText,
    minimal: "user",
    utama: true,
  },
  {
    label: "Approval",
    labelPendek: "Approval",
    href: "/approval",
    ikon: ClipboardCheck,
    minimal: "supervisor",
    utama: true,
  },
  {
    label: "Notifikasi",
    labelPendek: "Notifikasi",
    href: "/notifikasi",
    ikon: Bell,
    minimal: "user",
    utama: true,
  },
  {
    label: "Master Kategori",
    labelPendek: "Kategori",
    href: "/kategori",
    ikon: FolderTree,
    minimal: "supervisor",
    utama: false,
  },
  {
    label: "Master Pengguna",
    labelPendek: "Pengguna",
    href: "/pengguna",
    ikon: Users,
    minimal: "admin",
    utama: false,
  },
  {
    label: "Audit Log",
    labelPendek: "Audit",
    href: "/audit",
    ikon: ScrollText,
    minimal: "admin",
    utama: false,
  },
];
