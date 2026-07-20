import pg from "pg";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("render.com")
    ? { rejectUnauthorized: false }
    : undefined,
});

// Never let an idle-client error crash the process (e.g. running locally with
// no database reachable).
pool.on("error", (e) => console.error("pg pool error:", (e as Error).message));

export function query(text: string, params?: unknown[]) {
  // Fail fast (and cleanly) when there is no database configured — the app
  // still runs locally; the client falls back to its bundled seed data.
  if (!process.env.DATABASE_URL) {
    return Promise.reject(new Error("no database configured (DATABASE_URL unset)"));
  }
  return pool.query(text, params);
}
