import { Router } from "express";
import { query } from "../db.js";

export const projectsRouter = Router();

projectsRouter.get("/", async (_req, res) => {
  const { rows } = await query("SELECT data FROM projects ORDER BY id");
  res.json(rows.map((r) => r.data));
});

projectsRouter.get("/:id", async (req, res) => {
  const { rows } = await query("SELECT data FROM projects WHERE id=$1", [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: "not found" });
  res.json(rows[0].data);
});

projectsRouter.post("/", async (req, res) => {
  const p = req.body ?? {};
  const { rows } = await query(
    "INSERT INTO projects (account_id, name, status, data) VALUES ($1,$2,$3,$4) RETURNING id",
    [p.accountId ?? null, p.name ?? null, p.status ?? null, p],
  );
  const id = rows[0].id;
  await query("UPDATE projects SET data = jsonb_set(data,'{id}',to_jsonb($1::int)) WHERE id=$1", [id]);
  const { rows: r2 } = await query("SELECT data FROM projects WHERE id=$1", [id]);
  res.status(201).json(r2[0].data);
});

projectsRouter.patch("/:id", async (req, res) => {
  const { rows } = await query(
    "UPDATE projects SET data = data || $2::jsonb, updated_at=now() WHERE id=$1 RETURNING data",
    [req.params.id, req.body ?? {}],
  );
  if (!rows.length) return res.status(404).json({ error: "not found" });
  res.json(rows[0].data);
});

projectsRouter.delete("/:id", async (req, res) => {
  await query("DELETE FROM projects WHERE id=$1", [req.params.id]);
  res.status(204).end();
});
