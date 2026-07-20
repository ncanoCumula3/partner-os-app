import express from "express";
import { createServer } from "http";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { pool, query } from "./db.js";
import { projectsRouter } from "./api/projects.js";
import { dealsRouter } from "./api/deals.js";
import { notesRouter } from "./api/notes.js";
import { stateRouter } from "./api/state.js";
import { accountsRouter } from "./api/accounts.js";
import { usersRouter } from "./api/users.js";
import { netsuiteRouter } from "./api/netsuite.js";
import { authRouter } from "./api/auth.js";
import { collectionsRouter } from "./api/collections.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initSchema() {
  const sql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  await pool.query(sql);
  console.log("schema ready");
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "5mb" }));

  // ---- custom API (raw SQL, no ORM) ----
  app.get("/api/health", async (_req, res) => {
    try {
      await query("SELECT 1");
      res.json({ ok: true, db: "up" });
    } catch (e) {
      res.status(500).json({ ok: false, db: "down", error: String(e).slice(0, 200) });
    }
  });
  app.use("/api/projects", projectsRouter);
  app.use("/api/deals", dealsRouter);
  app.use("/api/notes", notesRouter);
  app.use("/api/state", stateRouter);
  app.use("/api/accounts", accountsRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/netsuite", netsuiteRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/collections", collectionsRouter);

  // ---- static SPA (client build lives in dist/public) ----
  const staticPath = path.resolve(__dirname, "..", "dist", "public");
  app.use(express.static(staticPath));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  if (process.env.DATABASE_URL) {
    try {
      await initSchema();
    } catch (e) {
      console.error("schema init failed:", e);
    }
  } else {
    console.warn("DATABASE_URL not set — the API will error until a DB is attached");
  }

  const server = createServer(app);
  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
