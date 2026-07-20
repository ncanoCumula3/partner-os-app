import { Router } from "express";
import { query } from "../db.js";

export const notesRouter = Router();

notesRouter.get("/", async (_req, res) => {
  const { rows } = await query("SELECT data FROM notes ORDER BY id");
  res.json(rows.map((x) => x.data));
});
notesRouter.post("/", async (req, res) => {
  const b = req.body ?? {};
  const { rows } = await query("INSERT INTO notes (data) VALUES ($1) RETURNING id", [b]);
  const id = rows[0].id;
  await query("UPDATE notes SET data = jsonb_set(data,'{id}',to_jsonb($1::int)) WHERE id=$1", [id]);
  const { rows: r2 } = await query("SELECT data FROM notes WHERE id=$1", [id]);
  res.status(201).json(r2[0].data);
});
notesRouter.patch("/:id", async (req, res) => {
  const { rows } = await query("UPDATE notes SET data = data || $2::jsonb, updated_at=now() WHERE id=$1 RETURNING data", [req.params.id, req.body ?? {}]);
  if (!rows.length) return res.status(404).json({ error: "not found" });
  res.json(rows[0].data);
});
notesRouter.delete("/:id", async (req, res) => {
  await query("DELETE FROM notes WHERE id=$1", [req.params.id]);
  res.status(204).end();
});
