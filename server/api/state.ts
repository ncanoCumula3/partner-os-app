import { Router } from "express";
import { query } from "../db.js";
import { roleFromRequest, roleCan } from "../lib/rbac.js";

export const stateRouter = Router();

// GET /api/state/:key -> stored document or null
stateRouter.get("/:key", async (req, res) => {
  const { rows } = await query("SELECT data FROM app_state WHERE key=$1", [req.params.key]);
  res.json(rows.length ? rows[0].data : null);
});

// PUT /api/state/:key -> upsert the whole document.
// The admin-settings document requires the manageSettings capability.
stateRouter.put("/:key", async (req, res) => {
  if (req.params.key === "admin") {
    const role = roleFromRequest(req);
    if (!role) return res.status(401).json({ error: "authentication required" });
    if (!roleCan(role, "manageSettings")) return res.status(403).json({ error: "forbidden: admin settings require Admin" });
  }
  await query(
    "INSERT INTO app_state (key, data, updated_at) VALUES ($1,$2,now()) " +
      "ON CONFLICT (key) DO UPDATE SET data=$2, updated_at=now()",
    [req.params.key, req.body ?? {}],
  );
  res.json({ ok: true });
});
