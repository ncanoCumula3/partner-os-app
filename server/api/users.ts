import { Router } from "express";
import { query } from "../db.js";

export const usersRouter = Router();

usersRouter.get("/", async (_req, res) => {
  const { rows } = await query("SELECT data FROM users ORDER BY id");
  res.json(rows.map((r) => r.data));
});

usersRouter.post("/", async (req, res) => {
  const u = req.body ?? {};
  const { rows } = await query(
    "INSERT INTO users (email, role, data) VALUES ($1,$2,$3) RETURNING id",
    [u.email ?? null, u.role ?? null, u],
  );
  const id = rows[0].id;
  await query("UPDATE users SET data = jsonb_set(data,'{id}',to_jsonb($1::int)) WHERE id=$1", [id]);
  const { rows: r2 } = await query("SELECT data FROM users WHERE id=$1", [id]);
  res.status(201).json(r2[0].data);
});

usersRouter.patch("/:id", async (req, res) => {
  const { rows } = await query(
    "UPDATE users SET data = data || $2::jsonb, email = COALESCE($2->>'email', email), role = COALESCE($2->>'role', role), updated_at=now() WHERE id=$1 RETURNING data",
    [req.params.id, req.body ?? {}],
  );
  if (!rows.length) return res.status(404).json({ error: "not found" });
  res.json(rows[0].data);
});

usersRouter.delete("/:id", async (req, res) => {
  await query("DELETE FROM users WHERE id=$1", [req.params.id]);
  res.status(204).end();
});
