/**
 * Role-based access control. Three access levels drive what a user can do
 * across the whole app: Admin, Supervisor, Account Manager.
 *
 * Capability model (tiered):
 *   view            everyone
 *   edit            everyone (create + update operational data)
 *   delete          Admin + Supervisor
 *   manageUsers     Admin only
 *   manageSettings  Admin only
 *
 * The same matrix is mirrored server-side in server/lib/rbac.ts — keep them
 * in sync.
 */
import type { UserRole } from "@/lib/users";

export type Capability = "view" | "edit" | "delete" | "manageUsers" | "manageSettings";

export const ROLE_CAPABILITIES: Record<UserRole, Capability[]> = {
  Admin: ["view", "edit", "delete", "manageUsers", "manageSettings"],
  Supervisor: ["view", "edit", "delete"],
  "Account Manager": ["view", "edit"],
};

/** Can this role perform the capability? Unknown/absent role = no (fail closed). */
export function can(role: UserRole | null | undefined, cap: Capability): boolean {
  if (!role) return false;
  return ROLE_CAPABILITIES[role]?.includes(cap) ?? false;
}
