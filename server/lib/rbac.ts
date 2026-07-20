/**
 * Server-side RBAC — mirror of client/src/lib/permissions.ts. Enforces the
 * capability matrix on mutating API routes using the session token's role.
 * Keep the matrix in sync with the client.
 */
import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "./auth.js";

export type Capability = "view" | "edit" | "delete" | "manageUsers" | "manageSettings";
export type Role = "Admin" | "Supervisor" | "Account Manager";

const ROLE_CAPABILITIES: Record<Role, Capability[]> = {
  Admin: ["view", "edit", "delete", "manageUsers", "manageSettings"],
  Supervisor: ["view", "edit", "delete"],
  "Account Manager": ["view", "edit"],
};

export function roleCan(role: string | undefined, cap: Capability): boolean {
  if (!role) return false;
  return ROLE_CAPABILITIES[role as Role]?.includes(cap) ?? false;
}

/** Pull the role off the Bearer token, or null if missing/invalid. */
export function roleFromRequest(req: Request): string | null {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return null;
  const payload = verifyToken(token);
  return payload && typeof payload.role === "string" ? payload.role : null;
}

/**
 * Express middleware factory: require a capability. Returns 401 if there is no
 * valid session, 403 if the role lacks the capability.
 */
export function requireCap(cap: Capability) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = roleFromRequest(req);
    if (!role) return res.status(401).json({ error: "authentication required" });
    if (!roleCan(role, cap)) return res.status(403).json({ error: `forbidden: '${cap}' requires a higher role` });
    next();
  };
}
