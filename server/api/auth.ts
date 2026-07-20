/**
 * Authentication endpoints. Per-user email + password login against the
 * `users` table. Passwords are stored hashed (scrypt); the hash never leaves
 * the server.
 */
import { Router } from "express";
import { query } from "../db.js";
import { verifyPassword, signToken, verifyToken, sanitizeUser } from "../lib/auth.js";

export const authRouter = Router();

authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ error: "email and password required" });

  const { rows } = await query("SELECT data FROM users WHERE lower(email) = lower($1) LIMIT 1", [email]);
  if (!rows.length) return res.status(401).json({ error: "Invalid email or password" });

  const user = rows[0].data as Record<string, unknown>;
  if (user.status === "suspended") return res.status(403).json({ error: "Account suspended" });
  if (!verifyPassword(password, user.passwordHash as string)) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const token = signToken({ uid: user.id, email: user.email, role: user.role });
  res.json({ user: sanitizeUser(user), token });
});

/**
 * Shared access-code login (legacy demo path). Verifies the code server-side
 * and issues a real Admin session token, so RBAC works uniformly whether you
 * signed in by password or by code.
 */
authRouter.post("/code", (req, res) => {
  const { code } = req.body ?? {};
  const expected = process.env.ACCESS_CODE || "2274";
  if (!code || String(code) !== expected) return res.status(401).json({ error: "Invalid access code" });
  const user = { id: 0, name: "Demo Admin", email: "demo@partneros.ai", role: "Admin", status: "active", title: "Demo", phone: "" };
  const token = signToken({ uid: user.id, email: user.email, role: user.role });
  res.json({ user, token });
});

/** Validate a stored session token and return the fresh user record. */
authRouter.get("/me", async (req, res) => {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const payload = token ? verifyToken(token) : null;
  if (!payload) return res.status(401).json({ error: "not authenticated" });

  const { rows } = await query("SELECT data FROM users WHERE id = $1 LIMIT 1", [payload.uid]);
  if (!rows.length) return res.status(401).json({ error: "user not found" });
  res.json({ user: sanitizeUser(rows[0].data) });
});
