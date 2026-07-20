/**
 * Password hashing + session tokens using Node's built-in crypto only
 * (scrypt for passwords, HMAC-SHA256 for tokens). No native deps — builds
 * cleanly in the Docker image.
 */
import crypto from "crypto";

const SECRET = process.env.AUTH_SECRET || "partner-os-dev-secret-change-me";

/** Hash a plaintext password → "scrypt$<salt>$<hash>". */
export function hashPassword(pw: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(pw, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

/** Constant-time verify of a plaintext password against a stored hash. */
export function verifyPassword(pw: string, stored: string | undefined | null): boolean {
  if (!stored) return false;
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const test = crypto.scryptSync(pw, salt, 64).toString("hex");
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(test, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Sign a small session token: base64url(payload).hmac. */
export function signToken(payload: Record<string, unknown>, ttlSeconds = 60 * 60 * 24 * 7): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const body = Buffer.from(JSON.stringify({ ...payload, exp })).toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

/** Verify + decode a session token, or null if bad/expired. */
export function verifyToken(token: string): Record<string, unknown> | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString());
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Strip secret fields before sending a user to the client. */
export function sanitizeUser<T extends Record<string, unknown>>(u: T): Omit<T, "passwordHash" | "password"> {
  const { passwordHash: _h, password: _p, ...rest } = u as Record<string, unknown>;
  return rest as Omit<T, "passwordHash" | "password">;
}
