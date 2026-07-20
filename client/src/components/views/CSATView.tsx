/*
 * CSATView — customer satisfaction scores and feedback + drill-down detail panel
 * Warm adaptive theme
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ACCOUNTS, TICKETS, OUTREACH, healthColor } from "@/lib/data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  ChevronRight, User, Calendar, Building2, Globe, TrendingUp,
  TrendingDown, Minus, MessageSquare, Star, ArrowUpRight,
  BarChart3, Zap, Clock, ThumbsUp, ThumbsDown, UserPlus, AlertTriangle, CheckCircle2, Phone,
  Search, ArrowUpDown, ArrowUp, ArrowDown, X,
  Plus, Pencil, Trash2,
} from "lucide-react";
import ActivityNotes from "@/components/ActivityNotes";
import { useCollection } from "@/lib/useCollection";
import RecordFormDialog, { type FieldSpec } from "@/components/RecordFormDialog";
import { useAuth } from "@/contexts/AuthContext";

interface CSATEntry {
  id: number;
  account: string;
  score: number;
  comment?: string;
  sentiment: "positive" | "neutral" | "negative";
  respondent?: string;
  surveyDate?: string;
  surveyType?: string;
  previousScore: number;
  trend: "up" | "down" | "stable";
  detailedFeedback?: string;
  actionItems?: string[];
  history?: { date: string; score: number; comment: string }[];
}

export type CsatEntry = CSATEntry;

const csatData: CSATEntry[] = [
  {
    id: 1, account: "Driftwood Capital", score: 5, comment: "Team is incredibly responsive. The NetSuite config saved us 20hrs/week.",
    sentiment: "positive", respondent: "Tom Hargrove", surveyDate: "Apr 8, 2026", surveyType: "Quarterly NPS",
    previousScore: 4, trend: "up",
    detailedFeedback: "Tom specifically praised the speed of the NetSuite configuration project. The custom reporting dashboard has been a game-changer for their finance team. He mentioned wanting to explore advanced analytics as the next step. Only minor feedback was about documentation — would like more self-service guides.",
    actionItems: [
      "Continue nurturing upsell opportunity for Advanced Analytics",
      "Create self-service documentation for custom reports",
      "Schedule executive sponsor meeting to discuss expansion",
    ],
    history: [
      { date: "Jan 2026", score: 4, comment: "Good support, onboarding was smooth" },
      { date: "Oct 2025", score: 4, comment: "Solid platform, responsive team" },
      { date: "Jul 2025", score: 3, comment: "Initial setup took longer than expected" },
    ],
  },
  {
    id: 2, account: "Apex Manufacturing", score: 4, comment: "Good support, could improve documentation turnaround time.",
    sentiment: "neutral", respondent: "Dana Reyes", surveyDate: "Apr 5, 2026", surveyType: "Post-Interaction",
    previousScore: 4, trend: "stable",
    detailedFeedback: "Dana appreciates the technical depth of our support team but noted that documentation for custom configurations takes too long to produce. She's waiting on updated docs for the inventory module before rolling out to additional warehouses. The QBR preparation has been excellent.",
    actionItems: [
      "Fast-track documentation for inventory module customizations",
      "Prepare expansion proposal for QBR on Apr 18",
      "Assign dedicated documentation resource for Apex",
    ],
    history: [
      { date: "Jan 2026", score: 4, comment: "Consistent quality, documentation could be faster" },
      { date: "Oct 2025", score: 3, comment: "Support response time needs improvement" },
      { date: "Jul 2025", score: 4, comment: "Great onboarding experience" },
    ],
  },
  {
    id: 3, account: "BlueWave Logistics", score: 2, comment: "Multi-currency issue has been open for 3 days with no resolution.",
    sentiment: "negative", respondent: "Marcus Lin", surveyDate: "Apr 9, 2026", surveyType: "Post-Interaction",
    previousScore: 3, trend: "down",
    detailedFeedback: "Marcus is visibly frustrated. The multi-currency revenue recognition issue (T-1041) has been blocking their month-end close for 3 days. He feels the escalation process was too slow and that the initial response didn't adequately convey the urgency. He's questioning whether to renew the contract.",
    actionItems: [
      "URGENT: Resolve T-1041 within 24 hours",
      "Schedule executive apology call with Marcus",
      "Prepare account recovery plan with concrete SLA commitments",
      "Offer service credit for the disruption",
    ],
    history: [
      { date: "Jan 2026", score: 3, comment: "Acceptable but not great — some integration hiccups" },
      { date: "Oct 2025", score: 4, comment: "Good initial implementation" },
      { date: "Jul 2025", score: 4, comment: "Smooth onboarding process" },
    ],
  },
  {
    id: 4, account: "ClearPath Retail", score: 4, comment: "Onboarding was smooth. Looking forward to the next phase.",
    sentiment: "neutral", respondent: "Priya Nair", surveyDate: "Apr 3, 2026", surveyType: "Quarterly NPS",
    previousScore: 3, trend: "up",
    detailedFeedback: "Priya is pleased with the HubSpot implementation and onboarding process. She's particularly excited about the email automation capabilities and wants to explore cross-selling opportunities. The only concern is around data migration — a few contact records had formatting issues during import.",
    actionItems: [
      "Audit and fix contact data migration issues",
      "Prepare email automation demo for QBR",
      "Send cross-sell proposal for marketing automation add-on",
    ],
    history: [
      { date: "Jan 2026", score: 3, comment: "Onboarding in progress, some data migration concerns" },
      { date: "Oct 2025", score: 3, comment: "Early stages, still evaluating" },
    ],
  },
  {
    id: 5, account: "Edgeline Foods", score: 3, comment: "Support response time has improved but still needs work on complex issues.",
    sentiment: "neutral", respondent: "Sofia Ruiz", surveyDate: "Apr 7, 2026", surveyType: "Post-Interaction",
    previousScore: 2, trend: "up",
    detailedFeedback: "Sofia acknowledges improvement in basic support response times but feels complex issues (like inventory sync and custom workflow configurations) still take too long. She's cautiously optimistic about the recovery plan but wants to see consistent improvement over the next 30 days before committing to the renewal terms.",
    actionItems: [
      "Continue executing 30-day recovery plan",
      "Assign senior engineer for complex issue escalations",
      "Weekly check-in calls with Sofia for the next month",
      "Prepare renewal discussion contingent on recovery milestones",
    ],
    history: [
      { date: "Jan 2026", score: 2, comment: "Frustrated with support delays on critical issues" },
      { date: "Oct 2025", score: 3, comment: "Mixed experience — good product, slow support" },
      { date: "Jul 2025", score: 4, comment: "Promising start to the partnership" },
    ],
  },
];

const CSAT_FIELDS: FieldSpec[] = [
  { key: "account", label: "Account", required: true },
  { key: "score", label: "Score (1-5)", type: "number", required: true },
  { key: "comment", label: "Comment", full: true },
  { key: "respondent", label: "Respondent" },
  { key: "surveyDate", label: "Survey date", placeholder: "Apr 8, 2026" },
  { key: "surveyType", label: "Survey type", placeholder: "Quarterly NPS" },
  { key: "previousScore", label: "Previous score", type: "number" },
  { key: "detailedFeedback", label: "Detailed feedback", type: "textarea" },
  { key: "actionItems", label: "Action items", type: "list" },
];

const sentimentConfig = {
  positive: { bg: "bg-emerald-600/10", text: "text-emerald-700", border: "border-emerald-200" },
  neutral: { bg: "bg-amber-500/10", text: "text-amber-600", border: "border-amber-200" },
  negative: { bg: "bg-red-500/10", text: "text-red-600", border: "border-red-200" },
};

type CSATSortField = "score" | "account" | "date";
type CSATSortDir = "asc" | "desc";

export default function CSATView() {
  const { can } = useAuth();
  const canEdit = can("edit");
  const canDelete = can("delete");
  const { items: csat, upsert, remove } = useCollection<CsatEntry>("csat", csatData as CsatEntry[], (c) => c.id);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CsatEntry | null>(null);
  const [selected, setSelected] = useState<CSATEntry | null>(null);
  const [search, setSearch] = useState("");
  const [sentimentFilter, setSentimentFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<CSATSortField>("date");
  const [sortDir, setSortDir] = useState<CSATSortDir>("desc");

  const toggleSort = (field: CSATSortField) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir(field === "score" ? "desc" : "asc"); }
  };

  const SortIcon = ({ field }: { field: CSATSortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="w-3 h-3 text-primary" /> : <ArrowDown className="w-3 h-3 text-primary" />;
  };

  const filtered = csat
    .filter(c => {
      if (sentimentFilter !== "all" && c.sentiment !== sentimentFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return c.account.toLowerCase().includes(q) || (c.respondent ?? "").toLowerCase().includes(q) || (c.comment ?? "").toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortField) {
        case "score": return dir * (a.score - b.score);
        case "account": return dir * a.account.localeCompare(b.account);
        case "date": return dir * (a.surveyDate ?? "").localeCompare(b.surveyDate ?? "");
        default: return 0;
      }
    });

  const avgScore = csat.length ? (csat.reduce((a, b) => a + b.score, 0) / csat.length).toFixed(1) : "0.0";
  const hasFilters = search || sentimentFilter !== "all";
  const [drillDownKpi, setDrillDownKpi] = useState<string | null>(null);
  const toggleDrill = (key: string) => setDrillDownKpi(prev => prev === key ? null : key);
  const positiveEntries = csat.filter(c => c.sentiment === "positive");
  const neutralEntries = csat.filter(c => c.sentiment === "neutral");
  const negativeEntries = csat.filter(c => c.sentiment === "negative");

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">CSAT</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Customer satisfaction scores and recent feedback · Click any entry for details
          </p>
        </div>
        {canEdit && (
          <button onClick={() => { setEditing(null); setFormOpen(true); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90">
            <Plus className="w-3.5 h-3.5" /> Add Response
          </button>
        )}
      </motion.div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Avg CSAT Score", value: avgScore, color: "text-foreground", key: "avg" },
          { label: "Positive", value: String(positiveEntries.length), color: "text-emerald-700", key: "positive" },
          { label: "Neutral", value: String(neutralEntries.length), color: "text-amber-600", key: "neutral" },
          { label: "Negative", value: String(negativeEntries.length), color: "text-red-600", key: "negative" },
        ].map((k, i) => {
          const isActive = drillDownKpi === k.key;
          return (
            <motion.button
              key={k.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => toggleDrill(k.key)}
              className={cn(
                "card-elevated rounded-xl border bg-card p-4 text-left transition-all cursor-pointer hover:shadow-md hover:border-primary/40",
                isActive ? "border-primary ring-2 ring-primary/20 shadow-md" : "border-border",
              )}
            >
              <div className="text-[10px] tracking-[0.1em] text-muted-foreground font-medium uppercase mb-1">{k.label}</div>
              <div className={cn("text-xl font-bold font-mono", k.color)}>{k.value}</div>
              <p className="text-[8px] text-primary/60 font-medium uppercase tracking-wider mt-1">Click to drill down</p>
            </motion.button>
          );
        })}
      </div>

      {/* ── CSAT Drill-Down Panel ── */}
      <AnimatePresence mode="wait">
        {drillDownKpi && (
          <motion.div key={drillDownKpi} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
            <div className="rounded-xl border border-primary/20 bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  {drillDownKpi === "avg" && <><Star className="w-4 h-4 text-primary" /> CSAT Score — Distribution</>}
                  {drillDownKpi === "positive" && <><ThumbsUp className="w-4 h-4 text-emerald-600" /> Positive Feedback — Details</>}
                  {drillDownKpi === "neutral" && <><Minus className="w-4 h-4 text-amber-600" /> Neutral Feedback — Details</>}
                  {drillDownKpi === "negative" && <><ThumbsDown className="w-4 h-4 text-red-600" /> Negative Feedback — Details</>}
                </h3>
                <button onClick={() => setDrillDownKpi(null)} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-muted transition-colors">Close</button>
              </div>

              {/* Avg CSAT */}
              {drillDownKpi === "avg" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Avg Score</p><p className="text-lg font-bold font-mono text-foreground">{avgScore}</p></div>
                    <div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Responses</p><p className="text-lg font-bold font-mono text-foreground">{csat.length}</p></div>
                    <div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Highest</p><p className="text-lg font-bold font-mono text-emerald-600">{csat.length ? Math.max(...csat.map(c => c.score)) : 0}</p></div>
                    <div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Lowest</p><p className="text-lg font-bold font-mono text-red-600">{csat.length ? Math.min(...csat.map(c => c.score)) : 0}</p></div>
                  </div>
                  <div className="rounded-lg border border-border overflow-hidden"><table className="w-full text-xs"><thead><tr className="bg-muted/50"><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Account</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Score</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Sentiment</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Respondent</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Date</th></tr></thead><tbody className="divide-y divide-border">{[...csat].sort((a, b) => b.score - a.score).map(c => (<tr key={c.id}><td className="px-3 py-2 font-medium text-foreground">{c.account}</td><td className="px-3 py-2 font-mono font-bold"><span className={cn(c.score >= 4 ? "text-emerald-600" : c.score >= 3 ? "text-amber-600" : "text-red-600")}>{c.score}</span></td><td className="px-3 py-2"><span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", c.sentiment === "positive" ? "bg-emerald-50 text-emerald-700" : c.sentiment === "neutral" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700")}>{c.sentiment}</span></td><td className="px-3 py-2 text-muted-foreground">{c.respondent}</td><td className="px-3 py-2 text-muted-foreground">{c.surveyDate}</td></tr>))}</tbody></table></div>
                </div>
              )}

              {/* Positive */}
              {drillDownKpi === "positive" && (
                <div className="space-y-3">
                  {positiveEntries.length > 0 ? (
                    <div className="rounded-lg border border-border overflow-hidden"><table className="w-full text-xs"><thead><tr className="bg-muted/50"><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Account</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Score</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Comment</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Respondent</th></tr></thead><tbody className="divide-y divide-border">{positiveEntries.map(c => (<tr key={c.id}><td className="px-3 py-2 font-medium text-foreground">{c.account}</td><td className="px-3 py-2 font-mono font-bold text-emerald-600">{c.score}</td><td className="px-3 py-2 text-muted-foreground max-w-[300px] truncate">{c.comment}</td><td className="px-3 py-2 text-muted-foreground">{c.respondent}</td></tr>))}</tbody></table></div>
                  ) : <p className="text-xs text-muted-foreground">No positive feedback.</p>}
                </div>
              )}

              {/* Neutral */}
              {drillDownKpi === "neutral" && (
                <div className="space-y-3">
                  {neutralEntries.length > 0 ? (
                    <div className="rounded-lg border border-border overflow-hidden"><table className="w-full text-xs"><thead><tr className="bg-muted/50"><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Account</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Score</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Comment</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Respondent</th></tr></thead><tbody className="divide-y divide-border">{neutralEntries.map(c => (<tr key={c.id}><td className="px-3 py-2 font-medium text-foreground">{c.account}</td><td className="px-3 py-2 font-mono font-bold text-amber-600">{c.score}</td><td className="px-3 py-2 text-muted-foreground max-w-[300px] truncate">{c.comment}</td><td className="px-3 py-2 text-muted-foreground">{c.respondent}</td></tr>))}</tbody></table></div>
                  ) : <p className="text-xs text-muted-foreground">No neutral feedback.</p>}
                </div>
              )}

              {/* Negative */}
              {drillDownKpi === "negative" && (
                <div className="space-y-3">
                  {negativeEntries.length > 0 ? (
                    <div className="rounded-lg border border-border overflow-hidden"><table className="w-full text-xs"><thead><tr className="bg-muted/50"><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Account</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Score</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Comment</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Respondent</th></tr></thead><tbody className="divide-y divide-border">{negativeEntries.map(c => (<tr key={c.id}><td className="px-3 py-2 font-medium text-foreground">{c.account}</td><td className="px-3 py-2 font-mono font-bold text-red-600">{c.score}</td><td className="px-3 py-2 text-muted-foreground max-w-[300px] truncate">{c.comment}</td><td className="px-3 py-2 text-muted-foreground">{c.respondent}</td></tr>))}</tbody></table></div>
                  ) : <p className="text-xs text-muted-foreground">No negative feedback.</p>}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Score distribution */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="card-elevated rounded-xl border border-border bg-card p-5"
      >
        <div className="text-[10px] tracking-[0.1em] text-muted-foreground font-medium uppercase mb-4">
          Score Distribution
        </div>
        <div className="flex items-end gap-3 h-24">
          {[1, 2, 3, 4, 5].map(score => {
            const count = csat.filter(c => c.score === score).length;
            const height = count > 0 ? (count / csat.length) * 100 : 4;
            return (
              <div key={score} className="flex-1 flex flex-col items-center gap-1">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${height}%` }}
                  transition={{ delay: 0.3 + score * 0.05, duration: 0.5 }}
                  className={cn(
                    "w-full rounded-t-md min-h-[4px]",
                    score >= 4 ? "bg-emerald-600/60" : score === 3 ? "bg-amber-500/60" : "bg-red-500/60"
                  )}
                />
                <span className="text-[10px] text-muted-foreground font-mono">{score}</span>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Search & Filters */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by account, respondent, or comment..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <select
          value={sentimentFilter}
          onChange={e => setSentimentFilter(e.target.value)}
          className="text-xs bg-card border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="all">All Sentiments</option>
          <option value="positive">Positive</option>
          <option value="neutral">Neutral</option>
          <option value="negative">Negative</option>
        </select>
        <div className="flex items-center gap-1">
          <button onClick={() => toggleSort("score")} className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1.5 rounded-md border border-border bg-card hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors">
            Score <SortIcon field="score" />
          </button>
          <button onClick={() => toggleSort("account")} className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1.5 rounded-md border border-border bg-card hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors">
            Account <SortIcon field="account" />
          </button>
          <button onClick={() => toggleSort("date")} className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1.5 rounded-md border border-border bg-card hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors">
            Date <SortIcon field="date" />
          </button>
        </div>
        {hasFilters && (
          <button
            onClick={() => { setSearch(""); setSentimentFilter("all"); }}
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3 h-3" /> Clear
          </button>
        )}
        <span className="text-[11px] text-muted-foreground ml-auto">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
      </motion.div>

      {/* Feedback list */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card-elevated rounded-xl border border-border bg-card p-5"
      >
        <div className="text-[10px] tracking-[0.1em] text-muted-foreground font-medium uppercase mb-4">
          Recent Feedback ({filtered.length})
        </div>
        {filtered.length === 0 && (
          <div className="py-8 text-center text-xs text-muted-foreground">No feedback matches your filters</div>
        )}
        <div className="space-y-0">
          {filtered.map((f) => {
            const config = sentimentConfig[f.sentiment];
            return (
              <div
                key={f.id}
                onClick={() => setSelected(f)}
                className="flex gap-4 py-4 border-b border-border last:border-0 items-start cursor-pointer hover:bg-muted/20 -mx-5 px-5 transition-colors group"
              >
                <div className={cn("rounded-lg px-3 py-2 text-lg font-bold shrink-0 font-mono", config.bg, config.text)}>
                  {f.score}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-[13px] font-semibold text-foreground">{f.account}</div>
                    {f.trend === "up" && <TrendingUp className="w-3 h-3 text-emerald-600" />}
                    {f.trend === "down" && <TrendingDown className="w-3 h-3 text-red-600" />}
                    {f.trend === "stable" && <Minus className="w-3 h-3 text-muted-foreground" />}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{f.comment}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={cn("text-[10px] px-2 py-0.5 rounded-md font-medium capitalize", config.bg, config.text)}>
                    {f.sentiment}
                  </span>
                  {canEdit && <button onClick={(e) => { e.stopPropagation(); setEditing(f); setFormOpen(true); }} title="Edit" className="p-1 rounded hover:bg-primary/10"><Pencil className="w-3.5 h-3.5 text-primary" /></button>}
                  {canDelete && <button onClick={(e) => { e.stopPropagation(); if (confirm("Delete response?")) remove(f.id); }} title="Delete" className="p-1 rounded hover:bg-red-500/10"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>}
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* ── CSAT Detail Panel ── */}
      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent side="right" className="!w-[500px] !max-w-[90vw] bg-background border-l border-border p-0 overflow-hidden">
          {selected && <CSATDetail entry={selected} />}
        </SheetContent>
      </Sheet>

      <RecordFormDialog<CsatEntry>
        open={formOpen}
        title={editing ? "Edit Response" : "Add Response"}
        fields={CSAT_FIELDS}
        record={editing}
        defaults={{ score: 5, previousScore: 5, history: [] }}
        onClose={() => setFormOpen(false)}
        onSubmit={(rec) => {
          const r: any = rec;
          if (!r.id) r.id = Date.now();
          r.sentiment = r.score >= 4 ? "positive" : r.score <= 2 ? "negative" : "neutral";
          r.trend = r.score > r.previousScore ? "up" : r.score < r.previousScore ? "down" : "stable";
          upsert(r, editing ? editing.id : undefined);
        }}
      />
    </div>
  );
}

/* ─── CSAT Detail Component ─── */
function CSATDetail({ entry }: { entry: CSATEntry }) {
  const account = ACCOUNTS.find(a => a.name === entry.account);
  const config = sentimentConfig[entry.sentiment];
  const relatedTickets = TICKETS.filter(t => t.account === entry.account);

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        {/* Header */}
        <SheetHeader className="p-0 space-y-3">
          <div className="flex items-start gap-4">
            <div className={cn("w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-bold font-mono", config.bg, config.text)}>
              {entry.score}
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-lg text-foreground font-bold leading-tight">
                {entry.account}
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                <span className={cn("text-[10px] px-1.5 py-px rounded font-medium capitalize", config.bg, config.text)}>{entry.sentiment}</span>
                <span>·</span>
                <span>{entry.surveyType}</span>
                <span>·</span>
                <span>{entry.surveyDate}</span>
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Score Trend */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <Star className="w-3.5 h-3.5 text-muted-foreground mx-auto mb-1" />
            <div className="text-[10px] text-muted-foreground uppercase">Current</div>
            <div className={cn("text-lg font-bold font-mono", config.text)}>{entry.score}/5</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <Clock className="w-3.5 h-3.5 text-muted-foreground mx-auto mb-1" />
            <div className="text-[10px] text-muted-foreground uppercase">Previous</div>
            <div className="text-lg font-bold font-mono text-foreground">{entry.previousScore}/5</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            {entry.trend === "up" ? <TrendingUp className="w-3.5 h-3.5 text-emerald-600 mx-auto mb-1" /> :
             entry.trend === "down" ? <TrendingDown className="w-3.5 h-3.5 text-red-600 mx-auto mb-1" /> :
             <Minus className="w-3.5 h-3.5 text-muted-foreground mx-auto mb-1" />}
            <div className="text-[10px] text-muted-foreground uppercase">Trend</div>
            <div className={cn("text-lg font-bold font-mono capitalize",
              entry.trend === "up" ? "text-emerald-700" : entry.trend === "down" ? "text-red-600" : "text-muted-foreground"
            )}>{entry.trend}</div>
          </div>
        </div>

        <Separator className="bg-border/40" />

        {/* Survey Details */}
        <section>
          <h3 className="text-[11px] tracking-[0.1em] uppercase text-muted-foreground font-medium mb-3">Survey Details</h3>
          <div className="space-y-3">
            <DetailRow icon={<User className="w-3.5 h-3.5" />} label="Respondent" value={entry.respondent ?? "—"} />
            <DetailRow icon={<Calendar className="w-3.5 h-3.5" />} label="Survey Date" value={entry.surveyDate ?? "—"} />
            <DetailRow icon={<BarChart3 className="w-3.5 h-3.5" />} label="Survey Type" value={entry.surveyType ?? "—"} />
            {account && (
              <>
                <DetailRow icon={<Globe className="w-3.5 h-3.5" />} label="Platform" value={account.platform} />
                <DetailRow icon={<Zap className="w-3.5 h-3.5" />} label="Health Score" value={`${account.health}/100`} valueClass={healthColor(account.health)} />
              </>
            )}
          </div>
        </section>

        <Separator className="bg-border/40" />

        {/* Verbatim Comment */}
        <section>
          <h3 className="text-[11px] tracking-[0.1em] uppercase text-muted-foreground font-medium mb-2">Verbatim Comment</h3>
          <div className={cn("rounded-xl border p-4", config.bg, config.border)}>
            <div className="flex items-start gap-3">
              <MessageSquare className={cn("w-4 h-4 shrink-0 mt-0.5", config.text)} />
              <p className="text-xs text-foreground leading-relaxed italic">"{entry.comment}"</p>
            </div>
          </div>
        </section>

        {/* Detailed Feedback */}
        <section>
          <h3 className="text-[11px] tracking-[0.1em] uppercase text-muted-foreground font-medium mb-2">Detailed Analysis</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">{entry.detailedFeedback}</p>
        </section>

        <Separator className="bg-border/40" />

        {/* Action Items */}
        <section>
          <h3 className="text-[11px] tracking-[0.1em] uppercase text-muted-foreground font-medium mb-3">
            Action Items ({(entry.actionItems ?? []).length})
          </h3>
          <div className="space-y-2">
            {(entry.actionItems ?? []).map((item, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border border-border p-3">
                <ArrowUpRight className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-foreground leading-relaxed">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <Separator className="bg-border/40" />

        {/* Score History */}
        <section>
          <h3 className="text-[11px] tracking-[0.1em] uppercase text-muted-foreground font-medium mb-3">Score History</h3>
          <div className="space-y-0">
            {(entry.history ?? []).map((h, i) => (
              <div key={i} className="flex gap-3 pb-4 last:pb-0">
                <div className="flex flex-col items-center">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold font-mono",
                    h.score >= 4 ? "bg-emerald-100 text-emerald-700" : h.score === 3 ? "bg-amber-100 text-amber-600" : "bg-red-100 text-red-600"
                  )}>
                    {h.score}
                  </div>
                  {i < (entry.history ?? []).length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-muted-foreground font-medium">{h.date}</p>
                  <p className="text-xs text-foreground mt-0.5">{h.comment}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Related Tickets */}
        {relatedTickets.length > 0 && (
          <>
            <Separator className="bg-border/40" />
            <section>
              <h3 className="text-[11px] tracking-[0.1em] uppercase text-muted-foreground font-medium mb-3">
                Open Tickets ({relatedTickets.length})
              </h3>
              <div className="space-y-2">
                {relatedTickets.map(t => (
                  <div key={t.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                    <span className="text-xs text-primary font-mono font-semibold">{t.id}</span>
                    <p className="text-xs text-foreground truncate flex-1">{t.issue}</p>
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-md font-medium shrink-0",
                      t.priority === "Critical" ? "text-red-700 bg-red-50" : "text-amber-700 bg-amber-50"
                    )}>{t.priority}</span>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {/* ── Inline Actions ── */}
        <Separator className="bg-border/40" />
        <section>
          <h3 className="text-[11px] tracking-[0.1em] uppercase text-muted-foreground font-medium mb-3">Quick Actions</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => toast.success(`Follow-up scheduled`, { description: `A follow-up call with ${entry.respondent} at ${entry.account} has been scheduled.` })}
              className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted/50 text-foreground transition-colors"
            >
              <Phone className="w-3 h-3" /> Schedule Follow-up
            </button>
            <button
              onClick={() => toast.success(`Feedback reassigned`, { description: `${entry.account} CSAT follow-up has been reassigned to a new owner.` })}
              className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted/50 text-foreground transition-colors"
            >
              <UserPlus className="w-3 h-3" /> Reassign
            </button>
            {entry.sentiment === "negative" && (
              <button
                onClick={() => toast.warning(`Account escalated`, { description: `${entry.account} has been escalated due to negative CSAT feedback.` })}
                className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-2 rounded-lg border border-red-200 bg-red-50/50 hover:bg-red-100/50 text-red-700 transition-colors"
              >
                <AlertTriangle className="w-3 h-3" /> Escalate
              </button>
            )}
            <button
              onClick={() => toast.success(`Action items completed`, { description: `All action items for ${entry.account} have been marked as completed.` })}
              className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/50 text-emerald-700 transition-colors"
            >
              <CheckCircle2 className="w-3 h-3" /> Completed
            </button>
          </div>
        </section>

        {/* Rep Notes (interactive, linked to account) */}
        <ActivityNotes account={entry.account} section="csat" itemRef={entry.account} />
      </div>
    </ScrollArea>
  );
}

/* ─── Helper ─── */
function DetailRow({ icon, label, value, valueClass }: { icon: React.ReactNode; label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-muted-foreground">{icon}</div>
      <span className="text-xs text-muted-foreground w-28">{label}</span>
      <span className={cn("text-xs font-medium text-foreground", valueClass)}>{value}</span>
    </div>
  );
}
