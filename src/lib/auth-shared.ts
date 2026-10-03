import type { UserRole } from "@/lib/types";

/**
 * Helper role yang aman dipakai di server maupun client.
 * Dipisah dari lib/auth.ts karena file itu mengimpor next/headers (server saja).
 */

/** Urutan hak akses: admin mencakup supervisor, supervisor mencakup user. */
const PERINGKAT: Record<UserRole, number> = {
  user: 1,
  supervisor: 2,
  admin: 3,
};

export function punyaRole(role: UserRole, minimal: UserRole): boolean {
  return PERINGKAT[role] >= PERINGKAT[minimal];
}
