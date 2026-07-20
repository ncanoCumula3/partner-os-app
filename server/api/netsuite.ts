/**
 * NetSuite (SuiteTalk REST) integration endpoints.
 *
 * All routes are guarded: if the NETSUITE_* env vars are absent the router
 * reports { configured: false } and mutating routes return 503. Nothing here
 * touches NetSuite until real credentials are supplied — safe to ship.
 *
 * Mapping (NetSuite standard record → Partner OS entity):
 *   customer   → accounts
 *   opportunity/estimate → deals   (not auto-synced yet; see /preview)
 *   job/project → projects         (not auto-synced yet)
 *   employee   → users             (not auto-synced yet)
 */
import { Router } from "express";
import { query } from "../db.js";
import { readConfig, suiteQL } from "../netsuite/client.js";

export const netsuiteRouter = Router();

const now = () => String(Math.floor(Date.now() / 1000));

netsuiteRouter.get("/status", (_req, res) => {
  const cfg = readConfig();
  res.json({
    configured: !!cfg,
    account: cfg?.accountId ?? null,
    auth: "TBA (OAuth 1.0a HMAC-SHA256)",
    capabilities: ["customers.preview", "customers.sync"],
    hint: cfg ? "ready" : "set NETSUITE_ACCOUNT_ID, NETSUITE_CONSUMER_KEY/SECRET, NETSUITE_TOKEN_ID/SECRET",
  });
});

/** Read-only preview: pull customers from NetSuite via SuiteQL, no writes. */
netsuiteRouter.get("/customers/preview", async (req, res) => {
  const cfg = readConfig();
  if (!cfg) return res.status(503).json({ error: "NetSuite not configured" });
  try {
    const limit = Math.min(Number(req.query.limit) || 25, 1000);
    const result = await suiteQL<Record<string, unknown>>(
      cfg,
      "SELECT id, companyName, email, phone, entityStatus FROM customer WHERE isInactive = 'F' ORDER BY id",
      now(),
      limit,
    );
    res.json({ count: result.items.length, hasMore: result.hasMore, items: result.items });
  } catch (e) {
    res.status(502).json({ error: String(e).slice(0, 500) });
  }
});

/**
 * Pull NetSuite customers into the local `accounts` table (upsert by nsId).
 * Idempotent: re-running updates existing rows rather than duplicating.
 */
netsuiteRouter.post("/customers/sync", async (_req, res) => {
  const cfg = readConfig();
  if (!cfg) return res.status(503).json({ error: "NetSuite not configured" });
  try {
    const result = await suiteQL<{ id: string; companyname?: string; email?: string; phone?: string }>(
      cfg,
      "SELECT id, companyName, email, phone FROM customer WHERE isInactive = 'F' ORDER BY id",
      now(),
      1000,
    );

    let inserted = 0;
    let updated = 0;
    for (const c of result.items) {
      const nsId = String(c.id);
      const name = c.companyname ?? `Customer ${nsId}`;
      // Does an account already carry this NetSuite id?
      const { rows } = await query("SELECT id FROM accounts WHERE data->>'nsId' = $1", [nsId]);
      if (rows.length) {
        await query(
          "UPDATE accounts SET name=$2, data = data || $3::jsonb, updated_at=now() WHERE id=$1",
          [rows[0].id, name, { name, nsId, contact: c.email ?? "", platform: "NetSuite" }],
        );
        updated++;
      } else {
        const seed = {
          name, platform: "NetSuite", tier: "Silver", customerType: "Services",
          health: 80, arr: 0, stage: "Stable", contact: c.email ?? "", next: "",
          nsId, source: "netsuite",
        };
        const { rows: ins } = await query(
          "INSERT INTO accounts (name, platform, tier, data) VALUES ($1,$2,$3,$4) RETURNING id",
          [name, "NetSuite", "Silver", seed],
        );
        await query("UPDATE accounts SET data = jsonb_set(data,'{id}',to_jsonb($1::int)) WHERE id=$1", [ins[0].id]);
        inserted++;
      }
    }
    res.json({ ok: true, pulled: result.items.length, inserted, updated });
  } catch (e) {
    res.status(502).json({ error: String(e).slice(0, 500) });
  }
});
