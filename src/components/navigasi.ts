import {
  FolderTree,
  LayoutDashboard,
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
    label: "Master Kategori",
    labelPendek: "Kategori",
    href: "/kategori",
    ikon: FolderTree,
    minimal: "supervisor",
    utama: true,
  },
  {
    label: "Master Pengguna",
    labelPendek: "Pengguna",
    href: "/pengguna",
    ikon: Users,
    minimal: "admin",
    utama: true,
  },
  {
    label: "Audit Log",
    labelPendek: "Audit",
    href: "/audit",
    ikon: ScrollText,
    minimal: "admin",
    utama: true,
  },
];
