/*
 * SupportView — ticket table with priority/status badges + drill-down detail panel
 * Warm adaptive theme
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TICKETS, ACCOUNTS, OUTREACH, priorityColors, statusColors, healthColor, tierColors } from "@/lib/data";
import type { Ticket } from "@/lib/data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  AlertCircle, Clock, User, Calendar, Building2, Globe,
  MessageSquare, FileText, ChevronRight, Shield, ArrowUpRight,
  Phone, Mail, Send, CheckCircle2, Zap, Search, ArrowUpDown, ArrowUp, ArrowDown, X,
} from "lucide-react";
import ActivityNotes from "@/components/ActivityNotes";

/* ── Extended ticket data ── */
interface TicketDetail extends Ticket {
  description: string;
  assignee: string;
  reporter: string;
  created: string;
  lastUpdated: string;
  slaDeadline: string;
  resolution?: string;
  comments: { author: string; text: string; date: string; isInternal: boolean }[];
  relatedTickets: string[];
}

const TICKET_DETAILS: Record<string, TicketDetail> = {
  "T-1041": {
    ...TICKETS.find(t => t.id === "T-1041")!,
    description: "Revenue recognition module is throwing validation errors when processing multi-currency invoices. The issue appears when converting between USD and EUR/GBP. Batch processing of 50+ invoices triggers a timeout. This is blocking month-end close for the finance team.",
    assignee: "Sarah Chen", reporter: "Marcus Lin", created: "Apr 7, 2026", lastUpdated: "Apr 10, 2026",
    slaDeadline: "Apr 11, 2026 — 2:00 PM",
    comments: [
      { author: "Marcus Lin", text: "This is urgent — our finance team can't close the books until this is resolved.", date: "Apr 7", isInternal: false },
      { author: "Sarah Chen", text: "Reproduced the issue. It's related to the exchange rate API returning stale data for GBP. Working on a fix.", date: "Apr 8", isInternal: true },
      { author: "Sarah Chen", text: "Patch deployed to staging. Need Marcus to verify before pushing to production.", date: "Apr 10", isInternal: true },
      { author: "Jordan Davis", text: "Escalated to Tier 2 per SLA policy. Adding additional engineering resource.", date: "Apr 10", isInternal: true },
    ],
    relatedTickets: ["T-1029"],
  },
  "T-1038": {
    ...TICKETS.find(t => t.id === "T-1038")!,
    description: "Custom executive dashboard is not reflecting real-time inventory data. The data refresh interval appears stuck at 24 hours instead of the configured 15-minute interval. This affects the operations team's ability to make real-time decisions.",
    assignee: "Jordan Davis", reporter: "Dana Reyes", created: "Apr 5, 2026", lastUpdated: "Apr 9, 2026",
    slaDeadline: "Apr 12, 2026 — 10:00 AM",
    comments: [
      { author: "Dana Reyes", text: "The dashboard was working fine until last week's update. Now it only refreshes once a day.", date: "Apr 5", isInternal: false },
      { author: "Jordan Davis", text: "Identified the issue — a scheduled job configuration was overwritten during the last deployment. Fix in progress.", date: "Apr 7", isInternal: true },
      { author: "Jordan Davis", text: "Fix deployed. Monitoring refresh intervals — should be back to 15 minutes now.", date: "Apr 9", isInternal: true },
    ],
    relatedTickets: [],
  },
  "T-1035": {
    ...TICKETS.find(t => t.id === "T-1035")!,
    description: "Email sequences configured in HubSpot are not triggering for newly imported contact lists. The automation rules appear correct but the trigger events are not firing. Affects the Q2 marketing campaign launch.",
    assignee: "Priya Nair", reporter: "Priya Nair", created: "Apr 2, 2026", lastUpdated: "Apr 6, 2026",
    slaDeadline: "Resolved",
    resolution: "Root cause was a permission issue on the HubSpot API token. The token was regenerated with correct scopes and sequences are now firing correctly. Verified with a test batch of 100 contacts.",
    comments: [
      { author: "Priya Nair", text: "None of our new contact lists are receiving the onboarding sequence. This is blocking our Q2 campaign.", date: "Apr 2", isInternal: false },
      { author: "Sarah Chen", text: "Checked the HubSpot workflow logs — the API token doesn't have the contacts.write scope. Regenerating.", date: "Apr 4", isInternal: true },
      { author: "Sarah Chen", text: "New token deployed. Test batch of 100 contacts processed successfully. Marking as resolved.", date: "Apr 6", isInternal: true },
    ],
    relatedTickets: [],
  },
  "T-1029": {
    ...TICKETS.find(t => t.id === "T-1029")!,
    description: "Apex trigger on the Opportunity object is hitting CPU time limits when processing batches of 200+ records. This blocks bulk opportunity updates and imports. The trigger was added as part of the custom forecasting module.",
    assignee: "Sarah Chen", reporter: "Tom Hargrove", created: "Mar 30, 2026", lastUpdated: "Apr 8, 2026",
    slaDeadline: "Apr 14, 2026 — 5:00 PM",
    comments: [
      { author: "Tom Hargrove", text: "We can't do bulk updates on opportunities anymore. This is critical for our quarterly pipeline review.", date: "Mar 30", isInternal: false },
      { author: "Sarah Chen", text: "The trigger is doing SOQL queries inside a loop. Need to refactor to use collections. Estimating 2 days.", date: "Apr 2", isInternal: true },
      { author: "Sarah Chen", text: "Refactored trigger to use bulkified pattern. Testing with 500-record batch now.", date: "Apr 8", isInternal: true },
    ],
    relatedTickets: ["T-1041"],
  },
};

type SortField = "id" | "account" | "priority" | "status" | "age";
type SortDir = "asc" | "desc";

const priorityOrder: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
const statusOrder: Record<string, number> = { Open: 0, "In Progress": 1, Resolved: 2 };

export default function SupportView() {
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("id");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="w-3 h-3 text-primary" /> : <ArrowDown className="w-3 h-3 text-primary" />;
  };

  const filtered = TICKETS
    .filter(t => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return t.id.toLowerCase().includes(q) || t.account.toLowerCase().includes(q) || t.issue.toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortField) {
        case "id": return dir * a.id.localeCompare(b.id);
        case "account": return dir * a.account.localeCompare(b.account);
        case "priority": return dir * ((priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9));
        case "status": return dir * ((statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9));
        case "age": return dir * (parseInt(a.age) - parseInt(b.age));
        default: return 0;
      }
    });

  const openCount = TICKETS.filter(t => t.status === "Open").length;
  const inProgressCount = TICKETS.filter(t => t.status === "In Progress").length;
  const resolvedCount = TICKETS.filter(t => t.status === "Resolved").length;
  const criticalCount = TICKETS.filter(t => t.priority === "Critical").length;
  const selectedDetail = selected ? TICKET_DETAILS[selected] : null;
  const hasFilters = search || statusFilter !== "all" || priorityFilter !== "all";
  const [drillDownKpi, setDrillDownKpi] = useState<string | null>(null);
  const toggleDrill = (key: string) => setDrillDownKpi(prev => prev === key ? null : key);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-xl font-bold text-foreground">Support</h2>
        <p className="text-xs text-muted-foreground mt-1">
          {TICKETS.length} tickets · {openCount} open · {criticalCount} critical · Click any ticket for details
        </p>
      </motion.div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Tickets", value: String(TICKETS.length), color: "text-foreground", key: "total" },
          { label: "Open", value: String(openCount), color: "text-red-600", key: "open" },
          { label: "In Progress", value: String(inProgressCount), color: "text-amber-600", key: "progress" },
          { label: "Resolved", value: String(resolvedCount), color: "text-emerald-700", key: "resolved" },
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

      {/* ── Support Drill-Down Panel ── */}
      <AnimatePresence mode="wait">
        {drillDownKpi && (
          <motion.div key={drillDownKpi} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
            <div className="rounded-xl border border-primary/20 bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  {drillDownKpi === "total" && <><AlertCircle className="w-4 h-4 text-primary" /> All Tickets — Overview</>}
                  {drillDownKpi === "open" && <><AlertCircle className="w-4 h-4 text-red-600" /> Open Tickets — Details</>}
                  {drillDownKpi === "progress" && <><Clock className="w-4 h-4 text-amber-600" /> In Progress — Details</>}
                  {drillDownKpi === "resolved" && <><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Resolved — Details</>}
                </h3>
                <button onClick={() => setDrillDownKpi(null)} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-muted transition-colors">Close</button>
              </div>

              {/* Total Tickets */}
              {drillDownKpi === "total" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Total</p><p className="text-lg font-bold font-mono text-foreground">{TICKETS.length}</p></div>
                    <div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Open</p><p className="text-lg font-bold font-mono text-red-600">{openCount}</p></div>
                    <div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">In Progress</p><p className="text-lg font-bold font-mono text-amber-600">{inProgressCount}</p></div>
                    <div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Resolved</p><p className="text-lg font-bold font-mono text-emerald-600">{resolvedCount}</p></div>
                  </div>
                  <div className="rounded-lg border border-border overflow-hidden"><table className="w-full text-xs"><thead><tr className="bg-muted/50"><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Ticket</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Account</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Issue</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Priority</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Status</th></tr></thead><tbody className="divide-y divide-border">{TICKETS.map(t => (<tr key={t.id}><td className="px-3 py-2 font-mono font-medium text-primary">{t.id}</td><td className="px-3 py-2 text-foreground">{t.account}</td><td className="px-3 py-2 text-muted-foreground truncate max-w-[200px]">{t.issue}</td><td className="px-3 py-2"><span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", priorityColors[t.priority])}>{t.priority}</span></td><td className="px-3 py-2"><span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", statusColors[t.status])}>{t.status}</span></td></tr>))}</tbody></table></div>
                </div>
              )}

              {/* Open */}
              {drillDownKpi === "open" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Open Count</p><p className="text-lg font-bold font-mono text-red-600">{openCount}</p></div>
                    <div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Critical Open</p><p className="text-lg font-bold font-mono text-red-600">{TICKETS.filter(t => t.status === "Open" && t.priority === "Critical").length}</p></div>
                    <div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">High Open</p><p className="text-lg font-bold font-mono text-amber-600">{TICKETS.filter(t => t.status === "Open" && t.priority === "High").length}</p></div>
                  </div>
                  <div className="rounded-lg border border-border overflow-hidden"><table className="w-full text-xs"><thead><tr className="bg-muted/50"><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Ticket</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Account</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Issue</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Priority</th></tr></thead><tbody className="divide-y divide-border">{TICKETS.filter(t => t.status === "Open").map(t => (<tr key={t.id}><td className="px-3 py-2 font-mono font-medium text-primary">{t.id}</td><td className="px-3 py-2 text-foreground">{t.account}</td><td className="px-3 py-2 text-muted-foreground truncate max-w-[200px]">{t.issue}</td><td className="px-3 py-2"><span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", priorityColors[t.priority])}>{t.priority}</span></td></tr>))}</tbody></table></div>
                </div>
              )}

              {/* In Progress */}
              {drillDownKpi === "progress" && (
                <div className="space-y-3">
                  <div className="rounded-lg border border-border overflow-hidden"><table className="w-full text-xs"><thead><tr className="bg-muted/50"><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Ticket</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Account</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Issue</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Priority</th></tr></thead><tbody className="divide-y divide-border">{TICKETS.filter(t => t.status === "In Progress").map(t => (<tr key={t.id}><td className="px-3 py-2 font-mono font-medium text-primary">{t.id}</td><td className="px-3 py-2 text-foreground">{t.account}</td><td className="px-3 py-2 text-muted-foreground truncate max-w-[200px]">{t.issue}</td><td className="px-3 py-2"><span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", priorityColors[t.priority])}>{t.priority}</span></td></tr>))}</tbody></table></div>
                </div>
              )}

              {/* Resolved */}
              {drillDownKpi === "resolved" && (
                <div className="space-y-3">
                  <div className="rounded-lg border border-border overflow-hidden"><table className="w-full text-xs"><thead><tr className="bg-muted/50"><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Ticket</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Account</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Issue</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Priority</th></tr></thead><tbody className="divide-y divide-border">{TICKETS.filter(t => t.status === "Resolved").map(t => (<tr key={t.id}><td className="px-3 py-2 font-mono font-medium text-primary">{t.id}</td><td className="px-3 py-2 text-foreground">{t.account}</td><td className="px-3 py-2 text-muted-foreground truncate max-w-[200px]">{t.issue}</td><td className="px-3 py-2"><span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", priorityColors[t.priority])}>{t.priority}</span></td></tr>))}</tbody></table></div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search & Filters */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tickets by ID, account, or issue..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="text-xs bg-card border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="all">All Statuses</option>
          <option value="Open">Open</option>
          <option value="In Progress">In Progress</option>
          <option value="Resolved">Resolved</option>
        </select>
        <select
          value={priorityFilter}
          onChange={e => setPriorityFilter(e.target.value)}
          className="text-xs bg-card border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="all">All Priorities</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
        {hasFilters && (
          <button
            onClick={() => { setSearch(""); setStatusFilter("all"); setPriorityFilter("all"); }}
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3 h-3" /> Clear
          </button>
        )}
        <span className="text-[11px] text-muted-foreground ml-auto">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
      </motion.div>

      {/* Ticket table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="card-elevated rounded-xl border border-border bg-card overflow-hidden"
      >
        <div className="grid grid-cols-[0.6fr_1.5fr_2.5fr_0.7fr_0.8fr_0.8fr_0.5fr] gap-3 px-5 py-3 text-[10px] tracking-[0.1em] text-muted-foreground font-medium uppercase border-b border-border">
          <button onClick={() => toggleSort("id")} className="flex items-center gap-1 hover:text-foreground transition-colors"><span>ID</span><SortIcon field="id" /></button>
          <button onClick={() => toggleSort("account")} className="flex items-center gap-1 hover:text-foreground transition-colors"><span>Account</span><SortIcon field="account" /></button>
          <span>Issue</span>
          <button onClick={() => toggleSort("priority")} className="flex items-center gap-1 hover:text-foreground transition-colors"><span>Priority</span><SortIcon field="priority" /></button>
          <button onClick={() => toggleSort("status")} className="flex items-center gap-1 hover:text-foreground transition-colors"><span>Status</span><SortIcon field="status" /></button>
          <span>Platform</span>
          <button onClick={() => toggleSort("age")} className="flex items-center gap-1 hover:text-foreground transition-colors"><span>Age</span><SortIcon field="age" /></button>
        </div>
        {filtered.length === 0 && (
          <div className="px-5 py-10 text-center text-xs text-muted-foreground">No tickets match your filters</div>
        )}
        {filtered.map((t, i) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.05 }}
            onClick={() => setSelected(t.id)}
            className="grid grid-cols-[0.6fr_1.5fr_2.5fr_0.7fr_0.8fr_0.8fr_0.5fr] gap-3 px-5 py-3.5 items-center border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer group"
          >
            <span className="text-xs text-primary font-mono font-semibold">{t.id}</span>
            <span className="text-[13px] text-foreground font-medium truncate">{t.account}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground truncate">{t.issue}</span>
              <ChevronRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </div>
            <span className={cn("text-[10px] px-2 py-0.5 rounded-md font-medium w-fit flex items-center gap-1", priorityColors[t.priority])}>
              {t.priority === "Critical" && <AlertCircle className="w-3 h-3" />}
              {t.priority}
            </span>
            <span className={cn("text-[10px] px-2 py-0.5 rounded-md font-medium w-fit", statusColors[t.status])}>
              {t.status}
            </span>
            <span className="text-xs text-muted-foreground">{t.platform}</span>
            <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
              <Clock className="w-3 h-3" /> {t.age}
            </span>
          </motion.div>
        ))}
      </motion.div>

      {/* ── Ticket Detail Panel ── */}
      <Sheet open={!!selectedDetail} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent side="right" className="!w-[500px] !max-w-[90vw] bg-background border-l border-border p-0 overflow-hidden">
          {selectedDetail && <TicketDetail ticket={selectedDetail} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ─── Ticket Detail Component ─── */
function TicketDetail({ ticket }: { ticket: TicketDetail }) {
  const account = ACCOUNTS.find(a => a.name === ticket.account);

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        {/* Header */}
        <SheetHeader className="p-0 space-y-3">
          <div className="flex items-start gap-4">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center",
              ticket.priority === "Critical" ? "bg-red-100" : ticket.priority === "High" ? "bg-orange-100" : "bg-amber-100"
            )}>
              <AlertCircle className={cn(
                "w-6 h-6",
                ticket.priority === "Critical" ? "text-red-600" : ticket.priority === "High" ? "text-orange-600" : "text-amber-600"
              )} />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-lg text-foreground font-bold leading-tight">
                {ticket.id}
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                <span className={cn("text-[10px] px-1.5 py-px rounded font-medium", priorityColors[ticket.priority])}>{ticket.priority}</span>
                <span className={cn("text-[10px] px-1.5 py-px rounded font-medium", statusColors[ticket.status])}>{ticket.status}</span>
                <span className="text-muted-foreground">·</span>
                <span>{ticket.platform}</span>
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Issue */}
        <section>
          <h3 className="text-[11px] tracking-[0.1em] uppercase text-muted-foreground font-medium mb-2">Issue</h3>
          <p className="text-sm font-medium text-foreground leading-relaxed">{ticket.issue}</p>
        </section>

        {/* Description */}
        <section>
          <h3 className="text-[11px] tracking-[0.1em] uppercase text-muted-foreground font-medium mb-2">Description</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">{ticket.description}</p>
        </section>

        <Separator className="bg-border/40" />

        {/* Details Grid */}
        <section>
          <h3 className="text-[11px] tracking-[0.1em] uppercase text-muted-foreground font-medium mb-3">Ticket Details</h3>
          <div className="space-y-3">
            <DetailRow icon={<Building2 className="w-3.5 h-3.5" />} label="Account" value={ticket.account} />
            <DetailRow icon={<User className="w-3.5 h-3.5" />} label="Assignee" value={ticket.assignee} />
            <DetailRow icon={<User className="w-3.5 h-3.5" />} label="Reporter" value={ticket.reporter} />
            <DetailRow icon={<Calendar className="w-3.5 h-3.5" />} label="Created" value={ticket.created} />
            <DetailRow icon={<Clock className="w-3.5 h-3.5" />} label="Last Updated" value={ticket.lastUpdated} />
            <DetailRow
              icon={<Shield className="w-3.5 h-3.5" />}
              label="SLA Deadline"
              value={ticket.slaDeadline}
              valueClass={ticket.slaDeadline === "Resolved" ? "text-emerald-700" : "text-red-600 font-semibold"}
            />
            {account && (
              <DetailRow icon={<Zap className="w-3.5 h-3.5" />} label="Account Health" value={`${account.health}/100`} valueClass={healthColor(account.health)} />
            )}
          </div>
        </section>

        {/* Resolution (if resolved) */}
        {ticket.resolution && (
          <>
            <Separator className="bg-border/40" />
            <section>
              <h3 className="text-[11px] tracking-[0.1em] uppercase text-muted-foreground font-medium mb-2">Resolution</h3>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-foreground leading-relaxed">{ticket.resolution}</p>
                </div>
              </div>
            </section>
          </>
        )}

        <Separator className="bg-border/40" />

        {/* Comments / Activity */}
        <section>
          <h3 className="text-[11px] tracking-[0.1em] uppercase text-muted-foreground font-medium mb-3">
            Comments ({ticket.comments.length})
          </h3>
          <div className="space-y-3">
            {ticket.comments.map((c, i) => (
              <div key={i} className={cn(
                "rounded-xl border p-4",
                c.isInternal ? "border-blue-200 bg-blue-50/30" : "border-border bg-card"
              )}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                    {c.author.split(" ").map(n => n[0]).join("")}
                  </div>
                  <span className="text-xs font-semibold text-foreground">{c.author}</span>
                  {c.isInternal && (
                    <span className="text-[9px] px-1.5 py-px rounded bg-blue-100 text-blue-700 font-medium">Internal</span>
                  )}
                  <span className="text-[10px] text-muted-foreground ml-auto">{c.date}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed pl-8">{c.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Inline Actions ── */}
        <Separator className="bg-border/40" />
        <section>
          <h3 className="text-[11px] tracking-[0.1em] uppercase text-muted-foreground font-medium mb-3">Quick Actions</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => toast.success(`Ticket reassigned`, { description: `${ticket.id} has been reassigned. The new assignee will be notified.` })}
              className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted/50 text-foreground transition-colors"
            >
              <User className="w-3 h-3" /> Reassign
            </button>
            <button
              onClick={() => toast.warning(`Ticket escalated`, { description: `${ticket.id} has been escalated to Tier 2 support.` })}
              className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-2 rounded-lg border border-red-200 bg-red-50/50 hover:bg-red-100/50 text-red-700 transition-colors"
            >
              <Shield className="w-3 h-3" /> Escalate
            </button>
            {ticket.status !== "Resolved" && (
              <button
                onClick={() => toast.success(`Ticket resolved`, { description: `${ticket.id} has been marked as resolved.` })}
                className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/50 text-emerald-700 transition-colors"
              >
                <CheckCircle2 className="w-3 h-3" /> Completed
              </button>
            )}
          </div>
        </section>

        {/* Rep Notes (interactive, linked to account) */}
        <ActivityNotes account={ticket.account} section="support" itemRef={ticket.id} />

        {/* Related Tickets */}
        {ticket.relatedTickets.length > 0 && (
          <>
            <Separator className="bg-border/40" />
            <section>
              <h3 className="text-[11px] tracking-[0.1em] uppercase text-muted-foreground font-medium mb-3">Related Tickets</h3>
              <div className="space-y-2">
                {ticket.relatedTickets.map(tid => {
                  const rt = TICKETS.find(t => t.id === tid);
                  if (!rt) return null;
                  return (
                    <div key={tid} className="flex items-center gap-3 rounded-lg border border-border p-3">
                      <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground">{rt.id} — {rt.issue}</p>
                        <p className="text-[10px] text-muted-foreground">{rt.account} · {rt.platform}</p>
                      </div>
                      <span className={cn("text-[10px] px-2 py-0.5 rounded-md font-medium shrink-0", statusColors[rt.status])}>{rt.status}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}
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
