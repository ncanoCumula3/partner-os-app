/**
 * Generic keyed-collection CRUD (raw SQL, no ORM). One table backs many
 * editable views — each view is a named collection of JSONB items keyed by a
 * string item_id it chooses. Powers tickets, invoices, SLA items, CSAT,
 * KB articles, playbooks, campaigns, etc.
 *
 * Routes (mounted at /api/collections):
 *   GET    /:collection            -> array of items (data payloads)
 *   PUT    /:collection/:itemId    -> upsert one item (create or edit)
 *   POST   /:collection/bulk       -> upsert many (used for first-run seeding)
 *   DELETE /:collection/:itemId    -> delete one   (requires 'delete' capability)
 */
import { Router } from "express";
import { query } from "../db.js";
import { requireCap } from "../lib/rbac.js";

export const collectionsRouter = Router();

collectionsRouter.get("/:collection", async (req, res) => {
  const { rows } = await query(
    "SELECT data FROM collections WHERE collection=$1 ORDER BY item_id",
    [req.params.collection],
  );
  res.json(rows.map((r) => r.data));
});

collectionsRouter.put("/:collection/:itemId", async (req, res) => {
  const data = req.body ?? {};
  await query(
    "INSERT INTO collections (collection, item_id, data, updated_at) VALUES ($1,$2,$3,now()) " +
      "ON CONFLICT (collection, item_id) DO UPDATE SET data=$3, updated_at=now()",
    [req.params.collection, String(req.params.itemId), data],
  );
  res.json(data);
});

collectionsRouter.post("/:collection/bulk", async (req, res) => {
  const items = Array.isArray(req.body) ? req.body : [];
  for (const it of items) {
    const id = it.id ?? it.itemId;
    if (id == null) continue;
    await query(
      "INSERT INTO collections (collection, item_id, data, updated_at) VALUES ($1,$2,$3,now()) " +
        "ON CONFLICT (collection, item_id) DO UPDATE SET data=$3, updated_at=now()",
      [req.params.collection, String(id), it],
    );
  }
  const { rows } = await query(
    "SELECT data FROM collections WHERE collection=$1 ORDER BY item_id",
    [req.params.collection],
  );
  res.json(rows.map((r) => r.data));
});

collectionsRouter.delete("/:collection/:itemId", requireCap("delete"), async (req, res) => {
  await query("DELETE FROM collections WHERE collection=$1 AND item_id=$2", [
    req.params.collection,
    String(req.params.itemId),
  ]);
  res.status(204).end();
});
