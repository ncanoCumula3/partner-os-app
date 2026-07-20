/**
 * One-off: populate the live collections with the app's real seed data so the
 * deployed app has content immediately (instead of seeding on first view visit).
 * Run: BASE=https://partner-os-app.onrender.com npx tsx scripts/seed-live.mts
 *
 * The 4 catalogue arrays come from the pure lib/data.ts; the 3 inline arrays are
 * extracted verbatim from their view files (plain data literals, safe to eval).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { TICKETS, INVOICES, OUTREACH, PLAYBOOKS } from "../client/src/lib/data.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const BASE = process.env.BASE || "https://partner-os-app.onrender.com";

/** Extract a `const NAME ... = [ ... ]` array literal from a source file and eval it. */
function extractArray(relPath: string, varName: string): any[] {
  const s = fs.readFileSync(path.join(root, relPath), "utf8");
  const decl = s.indexOf(varName);
  if (decl === -1) throw new Error(`${varName} not found in ${relPath}`);
  const eq = s.indexOf("=", decl);            // skip the `: Type[]` annotation
  const start = s.indexOf("[", eq);           // the real array literal starts after `=`
  let depth = 0, i = start;
  for (; i < s.length; i++) {
    const c = s[i];
    if (c === "[") depth++;
    else if (c === "]") { depth--; if (depth === 0) { i++; break; } }
  }
  const literal = s.slice(start, i);
  // eslint-disable-next-line no-eval
  return (0, eval)("(" + literal + ")");
}

const SLA = extractArray("client/src/components/views/SLATrackerView.tsx", "const MOCK_SLA_ITEMS");
const CSAT = extractArray("client/src/components/views/CSATView.tsx", "const csatData");
const KB = extractArray("client/src/components/views/KnowledgeBaseView.tsx", "const KB_ARTICLES");

const collections: { name: string; rows: any[]; id: (x: any) => string | number }[] = [
  { name: "tickets", rows: TICKETS as any[], id: (t) => t.id },
  { name: "invoices", rows: INVOICES as any[], id: (i) => i.inv },
  { name: "playbooks", rows: PLAYBOOKS as any[], id: (p) => p.title },
  { name: "campaigns", rows: OUTREACH as any[], id: (c) => c.account },
  { name: "sla_items", rows: SLA, id: (s) => s.id },
  { name: "csat", rows: CSAT, id: (c) => c.id },
  { name: "kb_articles", rows: KB, id: (a) => a.id },
];

for (const c of collections) {
  const payload = c.rows.map((r) => ({ ...r, id: c.id(r) }));
  const res = await fetch(`${BASE}/api/collections/${c.name}/bulk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const back = res.ok ? ((await res.json()) as any[]) : null;
  console.log(`${c.name.padEnd(12)} sent ${String(payload.length).padStart(2)} -> ${res.status} (now ${back ? back.length : "ERR"})`);
}
console.log("done.");
