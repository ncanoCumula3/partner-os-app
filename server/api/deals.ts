import { Router } from "express";
import { query } from "../db.js";
import { requireCap } from "../lib/rbac.js";

export const dealsRouter = Router();

dealsRouter.get("/", async (_req, res) => {
  const { rows } = await query("SELECT data FROM deals ORDER BY id");
  res.json(rows.map((x) => x.data));
});
dealsRouter.post("/", async (req, res) => {
  const b = req.body ?? {};
  const { rows } = await query("INSERT INTO deals (data) VALUES ($1) RETURNING id", [b]);
  const id = rows[0].id;
  await query("UPDATE deals SET data = jsonb_set(data,'{id}',to_jsonb($1::int)) WHERE id=$1", [id]);
  const { rows: r2 } = await query("SELECT data FROM deals WHERE id=$1", [id]);
  res.status(201).json(r2[0].data);
});
dealsRouter.patch("/:id", async (req, res) => {
  const { rows } = await query("UPDATE deals SET data = data || $2::jsonb, updated_at=now() WHERE id=$1 RETURNING data", [req.params.id, req.body ?? {}]);
  if (!rows.length) return res.status(404).json({ error: "not found" });
  res.json(rows[0].data);
});
dealsRouter.delete("/:id", requireCap("delete"), async (req, res) => {
  await query("DELETE FROM deals WHERE id=$1", [req.params.id]);
  res.status(204).end();
});
