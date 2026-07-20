import { Router } from "express";
import { query } from "../db.js";

export const accountsRouter = Router();

accountsRouter.get("/", async (_req, res) => {
  const { rows } = await query("SELECT data FROM accounts ORDER BY id");
  res.json(rows.map((r) => r.data));
});

accountsRouter.post("/", async (req, res) => {
  const a = req.body ?? {};
  const { rows } = await query(
    "INSERT INTO accounts (name, platform, tier, data) VALUES ($1,$2,$3,$4) RETURNING id",
    [a.name ?? null, a.platform ?? null, a.tier ?? null, a],
  );
  const id = rows[0].id;
  await query("UPDATE accounts SET data = jsonb_set(data,'{id}',to_jsonb($1::int)) WHERE id=$1", [id]);
  const { rows: r2 } = await query("SELECT data FROM accounts WHERE id=$1", [id]);
  res.status(201).json(r2[0].data);
});

accountsRouter.patch("/:id", async (req, res) => {
  const { rows } = await query(
    "UPDATE accounts SET data = data || $2::jsonb, updated_at=now() WHERE id=$1 RETURNING data",
    [req.params.id, req.body ?? {}],
  );
  if (!rows.length) return res.status(404).json({ error: "not found" });
  res.json(rows[0].data);
});

accountsRouter.delete("/:id", async (req, res) => {
  await query("DELETE FROM accounts WHERE id=$1", [req.params.id]);
  res.status(204).end();
});
