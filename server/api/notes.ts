import { Router } from "express";
import { query } from "../db.js";

export const notesRouter = Router();

notesRouter.get("/", async (_req, res) => {
  const { rows } = await query("SELECT data FROM notes ORDER BY id");
  res.json(rows.map((r) => r.data));
});

// client generates the note id (e.g. "n-011") and posts the whole note
notesRouter.post("/", async (req, res) => {
  const note = req.body ?? {};
  await query("INSERT INTO notes (data) VALUES ($1)", [note]);
  res.status(201).json(note);
});

notesRouter.patch("/:appId", async (req, res) => {
  const { rows } = await query(
    "UPDATE notes SET data = data || $2::jsonb, updated_at=now() WHERE data->>'id' = $1 RETURNING data",
    [req.params.appId, req.body ?? {}],
  );
  if (!rows.length) return res.status(404).json({ error: "not found" });
  res.json(rows[0].data);
});

notesRouter.delete("/:appId", async (req, res) => {
  await query("DELETE FROM notes WHERE data->>'id' = $1", [req.params.appId]);
  res.status(204).end();
});
