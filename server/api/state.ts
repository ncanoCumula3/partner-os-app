import { Router } from "express";
import { query } from "../db.js";

export const stateRouter = Router();

// GET /api/state/:key -> stored document or null
stateRouter.get("/:key", async (req, res) => {
  const { rows } = await query("SELECT data FROM app_state WHERE key=$1", [req.params.key]);
  res.json(rows.length ? rows[0].data : null);
});

// PUT /api/state/:key -> upsert the whole document
stateRouter.put("/:key", async (req, res) => {
  await query(
    "INSERT INTO app_state (key, data, updated_at) VALUES ($1,$2,now()) " +
      "ON CONFLICT (key) DO UPDATE SET data=$2, updated_at=now()",
    [req.params.key, req.body ?? {}],
  );
  res.json({ ok: true });
});
