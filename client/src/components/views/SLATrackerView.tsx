/*
 * SLATrackerView — Real-time SLA tracking dashboard
 * Live countdowns, breach alerts, escalation warnings, color-coded urgency
 * Warm adaptive theme
 */
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Clock, AlertTriangle, Zap, Timer, CheckCircle2, XCircle,
  ArrowUpRight, Bell, BellRing, ChevronDown, Filter, Search,
  LifeBuoy, Mail, Phone, Briefcase, Package, Shield,
  TrendingUp, BarChart3, Eye, User, Building2, Settings2,
} from "lucide-react";
import { useAdminSettings } from "@/contexts/AdminSettingsContext";

/* ── Types ──────────────────────────────────────────────────── */
interface SLAItem {
  id: string;
  ticketId: string;
  account: string;
  subject: string;
  category: "support" | "inquiry" | "product" | "consulting";
  subcategory: string;
  channel: string;
  urgency: "Critical" | "High" | "Medium" | "Low";
  assignee: string;
  status: "active" | "warning" | "breached" | "resolved" | "escalated";
  firstResponseSLA: number; // minutes allowed
  firstResponseElapsed: number; // minutes elapsed
  firstResponseMet: boolean | null; // null = pending
  resolutionSLA: number; // minutes allowed
  resolutionElapsed: number; // minutes elapsed
  escalateTo: string;
  escalationAfter: number;
  notifyBefore: number;
  createdAt: string;
  platform: string;
}

/* ── Mock Data ──────────────────────────────────────────────── */
const MOCK_SLA_ITEMS: SLAItem[] = [
  {
    id: "sla-t1", ticketId: "T-1041", account: "BlueWave Logistics", subject: "Revenue recognition module throwing errors on multi-currency invoices",
    category: "support", subcategory: "Bug / Error Resolution", channel: "Email", urgency: "Critical",
    assignee: "Sarah Chen", status: "warning", firstResponseSLA: 15, firstResponseElapsed: 12, firstResponseMet: null,
    resolutionSLA: 120, resolutionElapsed: 95, escalateTo: "Department Head", escalationAfter: 30, notifyBefore: 10,
    createdAt: "Today 8:15 AM", platform: "NetSuite",
  },
  {
    id: "sla-t2", ticketId: "T-1042", account: "Apex Manufacturing", subject: "Custom dashboard not reflecting real-time inventory data",
    category: "support", subcategory: "Performance Optimization", channel: "Portal", urgency: "High",
    assignee: "Priya Nair", status: "active", firstResponseSLA: 30, firstResponseElapsed: 8, firstResponseMet: true,
    resolutionSLA: 480, resolutionElapsed: 145, escalateTo: "Senior Consultant", escalationAfter: 120, notifyBefore: 30,
    createdAt: "Today 6:30 AM", platform: "NetSuite",
  },
  {
    id: "sla-t3", ticketId: "INQ-0087", account: "Driftwood Capital", subject: "Contract renewal terms and pricing for next fiscal year",
    category: "inquiry", subcategory: "Contract / Renewal Question", channel: "Email", urgency: "High",
    assignee: "Marcus Lin", status: "active", firstResponseSLA: 60, firstResponseElapsed: 22, firstResponseMet: true,
    resolutionSLA: 1440, resolutionElapsed: 340, escalateTo: "VP of Customer Success", escalationAfter: 240, notifyBefore: 60,
    createdAt: "Yesterday 2:15 PM", platform: "Salesforce",
  },
  {
    id: "sla-t4", ticketId: "T-1029", account: "Driftwood Capital", subject: "Apex trigger causing CPU limit on large opportunity batch",
    category: "support", subcategory: "Integration Troubleshooting", channel: "Email", urgency: "High",
    assignee: "Priya Nair", status: "breached", firstResponseSLA: 30, firstResponseElapsed: 45, firstResponseMet: false,
    resolutionSLA: 480, resolutionElapsed: 520, escalateTo: "Senior Consultant", escalationAfter: 120, notifyBefore: 30,
    createdAt: "Apr 10, 9:00 AM", platform: "Salesforce",
  },
  {
    id: "sla-t5", ticketId: "CON-0034", account: "Edgeline Foods", subject: "Urgent audit compliance review — Q1 financials discrepancy",
    category: "consulting", subcategory: "Audit & Compliance", channel: "Phone", urgency: "Critical",
    assignee: "Jordan Davis", status: "escalated", firstResponseSLA: 60, firstResponseElapsed: 55, firstResponseMet: true,
    resolutionSLA: 1440, resolutionElapsed: 1380, escalateTo: "CTO / Executive", escalationAfter: 240, notifyBefore: 30,
    createdAt: "Yesterday 8:00 AM", platform: "NetSuite",
  },
  {
    id: "sla-t6", ticketId: "PRD-0012", account: "ClearPath Retail", subject: "Demo request for new AI-powered inventory forecasting module",
    category: "product", subcategory: "New Product Demo Request", channel: "Email", urgency: "High",
    assignee: "Tom Hargrove", status: "active", firstResponseSLA: 60, firstResponseElapsed: 15, firstResponseMet: true,
    resolutionSLA: 1440, resolutionElapsed: 180, escalateTo: "Account Manager", escalationAfter: 480, notifyBefore: 60,
    createdAt: "Today 7:00 AM", platform: "HubSpot",
  },
  {
    id: "sla-t7", ticketId: "CON-0035", account: "Apex Manufacturing", subject: "Business development strategy for Q3 market expansion",
    category: "consulting", subcategory: "Business Development Strategy", channel: "Email", urgency: "Medium",
    assignee: "Dana Reyes", status: "active", firstResponseSLA: 240, firstResponseElapsed: 60, firstResponseMet: true,
    resolutionSLA: 4320, resolutionElapsed: 720, escalateTo: "Department Head", escalationAfter: 1440, notifyBefore: 120,
    createdAt: "Apr 12, 10:00 AM", platform: "Salesforce",
  },
  {
    id: "sla-t8", ticketId: "INQ-0088", account: "BlueWave Logistics", subject: "Training session request for new team members on NetSuite",
    category: "inquiry", subcategory: "Training / Onboarding Help", channel: "Email", urgency: "Low",
    assignee: "Sofia Ruiz", status: "resolved", firstResponseSLA: 240, firstResponseElapsed: 120, firstResponseMet: true,
    resolutionSLA: 2880, resolutionElapsed: 1800, escalateTo: "Team Lead", escalationAfter: 1440, notifyBefore: 120,
    createdAt: "Apr 9, 11:00 AM", platform: "NetSuite",
  },
  {
    id: "sla-t9", ticketId: "CON-0036", account: "ClearPath Retail", subject: "Marketing services — social media strategy and content plan",
    category: "consulting", subcategory: "Marketing Services", channel: "Email", urgency: "Medium",
    assignee: "Alex Rivera", status: "active", firstResponseSLA: 240, firstResponseElapsed: 180, firstResponseMet: true,
    resolutionSLA: 4320, resolutionElapsed: 1200, escalateTo: "Department Head", escalationAfter: 1440, notifyBefore: 120,
    createdAt: "Apr 11, 9:00 AM", platform: "HubSpot",
  },
  {
    id: "sla-t10", ticketId: "T-1043", account: "Edgeline Foods", subject: "Email sequences not triggering for re-engagement campaign",
    category: "support", subcategory: "Configuration Issue", channel: "Chat", urgency: "Medium",
    assignee: "Tom Hargrove", status: "warning", firstResponseSLA: 60, firstResponseElapsed: 50, firstResponseMet: null,
    resolutionSLA: 480, resolutionElapsed: 380, escalateTo: "Team Lead", escalationAfter: 240, notifyBefore: 30,
    createdAt: "Today 4:30 AM", platform: "HubSpot",
  },
  {
    id: "sla-t11", ticketId: "CON-0037", account: "Driftwood Capital", subject: "Tax advisory — international revenue recognition compliance",
    category: "consulting", subcategory: "Tax Advisory", channel: "Email", urgency: "High",
    assignee: "Jordan Davis", status: "active", firstResponseSLA: 120, firstResponseElapsed: 45, firstResponseMet: true,
    resolutionSLA: 2880, resolutionElapsed: 960, escalateTo: "Department Head", escalationAfter: 720, notifyBefore: 60,
    createdAt: "Apr 12, 2:00 PM", platform: "Salesforce",
  },
  {
    id: "sla-t12", ticketId: "PRD-0013", account: "Apex Manufacturing", subject: "Integration capabilities inquiry — connecting NetSuite with Shopify",
    category: "product", subcategory: "Integration Capabilities", channel: "Phone", urgency: "Medium",
    assignee: "Sarah Chen", status: "active", firstResponseSLA: 120, firstResponseElapsed: 30, firstResponseMet: true,
    resolutionSLA: 2880, resolutionElapsed: 480, escalateTo: "Senior Consultant", escalationAfter: 1440, notifyBefore: 120,
    createdAt: "Apr 13, 11:00 AM", platform: "NetSuite",
  },
];

/* ── Helpers ────────────────────────────────────────────────── */
function formatTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  const d = Math.floor(minutes / 1440);
  const h = Math.floor((minutes % 1440) / 60);
  return h > 0 ? `${d}d ${h}h` : `${d}d`;
}

function getTimeRemaining(sla: number, elapsed: number): { remaining: number; percent: number; status: "ok" | "warning" | "danger" } {
  const remaining = sla - elapsed;
  const percent = Math.min((elapsed / sla) * 100, 100);
  const status = remaining <= 0 ? "danger" : percent >= 75 ? "warning" : "ok";
  return { remaining, percent, status };
}

const urgencyColors: Record<string, string> = {
  Critical: "text-red-600",
  High: "text-orange-400",
  Medium: "text-amber-600",
  Low: "text-emerald-700",
};

const urgencyBg: Record<string, string> = {
  Critical: "bg-red-500/10 border-red-200",
  High: "bg-orange-400/10 border-orange-400/20",
  Medium: "bg-amber-500/10 border-amber-200",
  Low: "bg-emerald-600/10 border-emerald-200",
};

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  active: { label: "Active", color: "text-primary bg-primary/10", icon: Clock },
  warning: { label: "At Risk", color: "text-amber-600 bg-amber-500/10", icon: AlertTriangle },
  breached: { label: "Breached", color: "text-red-600 bg-red-500/10", icon: XCircle },
  resolved: { label: "Resolved", color: "text-emerald-700 bg-emerald-600/10", icon: CheckCircle2 },
  escalated: { label: "Escalated", color: "text-purple-400 bg-purple-400/10", icon: ArrowUpRight },
};

const categoryIcons: Record<string, React.ElementType> = {
  support: LifeBuoy,
  inquiry: Mail,
  product: Package,
  consulting: Briefcase,
};

/* ── Main Component ─────────────────────────────────────────── */
export default function SLATrackerView() {
  const { slaRules, settings } = useAdminSettings();

  // Apply admin SLA rules to mock tickets: match by category+subcategory+channel+urgency
  const adminEnhancedItems = useMemo(() => {
    return MOCK_SLA_ITEMS.map(item => {
      // Find matching active SLA rule from admin config
      const matchingRule = slaRules.find(r =>
        r.active &&
        r.category === item.category &&
        r.subcategory === item.subcategory &&
        r.urgency === item.urgency
      ) ?? slaRules.find(r =>
        r.active &&
        r.category === item.category &&
        r.urgency === item.urgency
      );

      if (!matchingRule) return item;

      // Override SLA timings from admin-configured rules
      return {
        ...item,
        firstResponseSLA: matchingRule.firstResponse,
        resolutionSLA: matchingRule.resolution,
        escalationAfter: matchingRule.escalationAfter,
        escalateTo: matchingRule.escalateTo,
        notifyBefore: matchingRule.notifyBefore,
      };
    });
  }, [slaRules]);

  const [items, setItems] = useState(adminEnhancedItems);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [drillDownKpi, setDrillDownKpi] = useState<string | null>(null);
  const toggleDrill = (key: string) => setDrillDownKpi(prev => prev === key ? null : key);

  // Re-sync items when admin SLA rules change
  useEffect(() => {
    setItems(prev => prev.map(item => {
      const matchingRule = slaRules.find(r =>
        r.active &&
        r.category === item.category &&
        r.subcategory === item.subcategory &&
        r.urgency === item.urgency
      ) ?? slaRules.find(r =>
        r.active &&
        r.category === item.category &&
        r.urgency === item.urgency
      );
      if (!matchingRule) return item;
      // Re-derive status based on new SLA timings
      const newResolutionSLA = matchingRule.resolution;
      const newEscalationAfter = matchingRule.escalationAfter;
      const newNotifyBefore = matchingRule.notifyBefore;
      let newStatus = item.status;
      if (item.status !== "resolved") {
        if (item.resolutionElapsed >= newResolutionSLA) newStatus = "breached";
        else if (item.resolutionElapsed >= newEscalationAfter && item.status !== "escalated") newStatus = "escalated";
        else if (item.resolutionElapsed >= newResolutionSLA - newNotifyBefore) newStatus = "warning";
        else newStatus = "active";
      }
      return {
        ...item,
        firstResponseSLA: matchingRule.firstResponse,
        resolutionSLA: newResolutionSLA,
        escalationAfter: newEscalationAfter,
        escalateTo: matchingRule.escalateTo,
        notifyBefore: newNotifyBefore,
        status: newStatus,
      };
    }));
  }, [slaRules]);

  // Simulate live countdown every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
      setItems((prev) =>
        prev.map((item) => {
          if (item.status === "resolved") return item;
          const newElapsed = item.resolutionElapsed + 1;
          const newFirstElapsed = item.firstResponseMet === null ? item.firstResponseElapsed + 1 : item.firstResponseElapsed;
          let newStatus = item.status;
          if (newElapsed >= item.resolutionSLA) newStatus = "breached";
          else if (newElapsed >= item.escalationAfter && item.status !== "escalated") newStatus = "escalated";
          else if (newElapsed >= item.resolutionSLA - item.notifyBefore) newStatus = "warning";
          return { ...item, resolutionElapsed: newElapsed, firstResponseElapsed: newFirstElapsed, status: newStatus };
        })
      );
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (filterStatus && item.status !== filterStatus) return false;
      if (filterCategory && item.category !== filterCategory) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          item.account.toLowerCase().includes(q) ||
          item.subject.toLowerCase().includes(q) ||
          item.ticketId.toLowerCase().includes(q) ||
          item.assignee.toLowerCase().includes(q) ||
          item.subcategory.toLowerCase().includes(q) ||
          item.platform.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [items, search, filterStatus, filterCategory]);

  const stats = useMemo(() => ({
    total: items.length,
    active: items.filter((i) => i.status === "active").length,
    atRisk: items.filter((i) => i.status === "warning").length,
    breached: items.filter((i) => i.status === "breached").length,
    escalated: items.filter((i) => i.status === "escalated").length,
    resolved: items.filter((i) => i.status === "resolved").length,
    avgCompliance: Math.round(
      (items.filter((i) => i.status !== "breached").length / items.length) * 100
    ),
  }), [items]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400/20 to-rose-400/10 flex items-center justify-center">
            <Timer className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">SLA Tracker</h1>
            <p className="text-xs text-muted-foreground">Live monitoring of service level commitments across all categories</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground/40">
          <div className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
          Live · Updates every 30s
        </div>
      </motion.div>

      {/* Stats row */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="grid grid-cols-6 gap-3">
        {[
          { label: "Active", value: stats.active, color: "text-primary", icon: Clock, key: "active" },
          { label: "At Risk", value: stats.atRisk, color: "text-amber-600", icon: AlertTriangle, key: "atRisk" },
          { label: "Breached", value: stats.breached, color: "text-red-600", icon: XCircle, key: "breached" },
          { label: "Escalated", value: stats.escalated, color: "text-purple-400", icon: ArrowUpRight, key: "escalated" },
          { label: "Resolved", value: stats.resolved, color: "text-emerald-700", icon: CheckCircle2, key: "resolved" },
          { label: "Compliance", value: `${stats.avgCompliance}%`, color: stats.avgCompliance >= 90 ? "text-emerald-700" : stats.avgCompliance >= 75 ? "text-amber-600" : "text-red-600", icon: Shield, key: "compliance" },
        ].map((s) => {
          const isActive = drillDownKpi === s.key;
          return (
            <button key={s.label} onClick={() => toggleDrill(s.key)} className={cn("rounded-xl border bg-card/50 p-3 text-left transition-all cursor-pointer hover:shadow-md hover:border-primary/40", isActive ? "border-primary ring-2 ring-primary/20 shadow-md" : "border-border")}>
              <div className="flex items-center gap-1.5 mb-1">
                <s.icon className={cn("w-3.5 h-3.5", s.color)} />
                <span className="text-[9px] tracking-[0.08em] uppercase text-muted-foreground/50">{s.label}</span>
              </div>
              <div className={cn("text-xl font-bold font-mono", s.color)}>{s.value}</div>
              <p className="text-[8px] text-primary/60 font-medium uppercase tracking-wider mt-1">Click to drill down</p>
            </button>
          );
        })}
      </motion.div>

      {/* ── SLA Drill-Down Panel ── */}
      <AnimatePresence mode="wait">
        {drillDownKpi && (
          <motion.div key={drillDownKpi} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
            <div className="rounded-xl border border-primary/20 bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  {drillDownKpi === "active" && <><Clock className="w-4 h-4 text-primary" /> Active SLAs — Details</>}
                  {drillDownKpi === "atRisk" && <><AlertTriangle className="w-4 h-4 text-amber-600" /> At Risk — Details</>}
                  {drillDownKpi === "breached" && <><XCircle className="w-4 h-4 text-red-600" /> Breached — Details</>}
                  {drillDownKpi === "escalated" && <><ArrowUpRight className="w-4 h-4 text-purple-400" /> Escalated — Details</>}
                  {drillDownKpi === "resolved" && <><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Resolved — Details</>}
                  {drillDownKpi === "compliance" && <><Shield className="w-4 h-4 text-primary" /> Compliance — Overview</>}
                </h3>
                <button onClick={() => setDrillDownKpi(null)} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-muted transition-colors">Close</button>
              </div>

              {/* Status-based drill-downs */}
              {(drillDownKpi === "active" || drillDownKpi === "atRisk" || drillDownKpi === "breached" || drillDownKpi === "escalated" || drillDownKpi === "resolved") && (() => {
                const statusMap: Record<string, string> = { active: "active", atRisk: "warning", breached: "breached", escalated: "escalated", resolved: "resolved" };
                const statusItems = items.filter(i => i.status === statusMap[drillDownKpi]);
                return (
                  <div className="space-y-3">
                    {statusItems.length > 0 ? (
                      <div className="rounded-lg border border-border overflow-hidden"><table className="w-full text-xs"><thead><tr className="bg-muted/50"><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Ticket</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Account</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Subject</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Urgency</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Assignee</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Elapsed</th></tr></thead><tbody className="divide-y divide-border">{statusItems.map(i => (<tr key={i.id}><td className="px-3 py-2 font-mono font-medium text-primary">{i.ticketId}</td><td className="px-3 py-2 text-foreground">{i.account}</td><td className="px-3 py-2 text-muted-foreground truncate max-w-[200px]">{i.subject}</td><td className="px-3 py-2"><span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", i.urgency === "Critical" ? "bg-red-50 text-red-700" : i.urgency === "High" ? "bg-orange-50 text-orange-700" : i.urgency === "Medium" ? "bg-amber-50 text-amber-700" : "bg-slate-50 text-slate-700")}>{i.urgency}</span></td><td className="px-3 py-2 text-muted-foreground">{i.assignee}</td><td className="px-3 py-2 font-mono text-foreground">{formatTime(i.resolutionElapsed)}</td></tr>))}</tbody></table></div>
                    ) : <p className="text-xs text-muted-foreground">No items in this status.</p>}
                  </div>
                );
              })()}

              {/* Compliance */}
              {drillDownKpi === "compliance" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Total SLAs</p><p className="text-lg font-bold font-mono text-foreground">{stats.total}</p></div>
                    <div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Compliant</p><p className="text-lg font-bold font-mono text-emerald-600">{items.filter(i => i.status !== "breached").length}</p></div>
                    <div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Breached</p><p className="text-lg font-bold font-mono text-red-600">{stats.breached}</p></div>
                    <div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Compliance Rate</p><p className="text-lg font-bold font-mono">{stats.avgCompliance}%</p></div>
                  </div>
                  <div className="w-full bg-muted/30 rounded-full h-3 overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all", stats.avgCompliance >= 90 ? "bg-emerald-500" : stats.avgCompliance >= 75 ? "bg-amber-500" : "bg-red-500")} style={{ width: `${stats.avgCompliance}%` }} />
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tickets, accounts, assignees..."
            className="w-full h-9 rounded-lg bg-card border border-border pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
          />
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground/40 mr-1">Status:</span>
          {["active", "warning", "breached", "escalated", "resolved"].map((s) => {
            const cfg = statusConfig[s];
            return (
              <button
                key={s}
                onClick={() => setFilterStatus(filterStatus === s ? null : s)}
                className={cn(
                  "h-7 px-2.5 rounded-full text-[10px] font-medium border transition-all flex items-center gap-1",
                  filterStatus === s ? cfg.color + " border-current/20" : "border-border text-muted-foreground/50 hover:text-foreground"
                )}
              >
                <cfg.icon className="w-3 h-3" />
                {cfg.label}
              </button>
            );
          })}
        </div>

        {/* Category filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground/40 mr-1">Type:</span>
          {[
            { id: "support", label: "Support" },
            { id: "inquiry", label: "Inquiry" },
            { id: "product", label: "Product" },
            { id: "consulting", label: "Consulting" },
          ].map((c) => (
            <button
              key={c.id}
              onClick={() => setFilterCategory(filterCategory === c.id ? null : c.id)}
              className={cn(
                "h-7 px-2.5 rounded-full text-[10px] font-medium border transition-all",
                filterCategory === c.id ? "border-primary/30 bg-primary/10 text-primary" : "border-border text-muted-foreground/50 hover:text-foreground"
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* SLA Items */}
      <div className="space-y-2">
        <AnimatePresence>
          {filtered.map((item, i) => {
            const resTime = getTimeRemaining(item.resolutionSLA, item.resolutionElapsed);
            const firstTime = item.firstResponseMet === null ? getTimeRemaining(item.firstResponseSLA, item.firstResponseElapsed) : null;
            const sCfg = statusConfig[item.status];
            const CatIcon = categoryIcons[item.category];
            const isExpanded = expandedItem === item.id;

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ delay: i * 0.03 }}
                className={cn(
                  "rounded-xl border bg-card/30 overflow-hidden transition-all",
                  item.status === "breached" ? "border-rose-400/30" :
                  item.status === "warning" ? "border-amber-200" :
                  item.status === "escalated" ? "border-purple-400/20" :
                  "border-border"
                )}
              >
                {/* Main row */}
                <button
                  onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                  className="w-full flex items-center gap-4 p-4 hover:bg-muted/5 transition-colors text-left"
                >
                  {/* Status icon */}
                  <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", sCfg.color)}>
                    <sCfg.icon className="w-4.5 h-4.5" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-mono text-muted-foreground/40">{item.ticketId}</span>
                      <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full border font-medium", urgencyColors[item.urgency], urgencyBg[item.urgency])}>
                        {item.urgency}
                      </span>
                      <CatIcon className="w-3 h-3 text-muted-foreground/30" />
                      <span className="text-[10px] text-muted-foreground/30">{item.subcategory}</span>
                    </div>
                    <div className="text-[13px] font-medium text-foreground truncate">{item.subject}</div>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground/40">
                      <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{item.account}</span>
                      <span className="flex items-center gap-1"><User className="w-3 h-3" />{item.assignee}</span>
                      <span>{item.platform}</span>
                      <span>{item.channel}</span>
                    </div>
                  </div>

                  {/* First Response indicator */}
                  <div className="w-28 shrink-0 text-center">
                    <div className="text-[9px] tracking-[0.08em] uppercase text-muted-foreground/30 mb-1">1st Response</div>
                    {item.firstResponseMet === true ? (
                      <div className="flex items-center justify-center gap-1 text-emerald-700 text-[11px] font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Met
                      </div>
                    ) : item.firstResponseMet === false ? (
                      <div className="flex items-center justify-center gap-1 text-red-600 text-[11px] font-medium">
                        <XCircle className="w-3.5 h-3.5" />
                        Missed
                      </div>
                    ) : firstTime ? (
                      <div className={cn("text-sm font-bold font-mono", firstTime.status === "danger" ? "text-red-600" : firstTime.status === "warning" ? "text-amber-600" : "text-foreground")}>
                        {firstTime.remaining > 0 ? formatTime(firstTime.remaining) : "BREACH"}
                      </div>
                    ) : null}
                  </div>

                  {/* Resolution countdown */}
                  <div className="w-40 shrink-0">
                    <div className="text-[9px] tracking-[0.08em] uppercase text-muted-foreground/30 mb-1.5 text-center">Resolution</div>
                    {item.status === "resolved" ? (
                      <div className="flex items-center justify-center gap-1 text-emerald-700 text-[11px] font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Resolved in {formatTime(item.resolutionElapsed)}
                      </div>
                    ) : (
                      <>
                        <div className="h-2 rounded-full bg-muted/20 overflow-hidden mb-1.5">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${resTime.percent}%` }}
                            transition={{ duration: 0.5 }}
                            className={cn(
                              "h-full rounded-full",
                              resTime.status === "danger" ? "bg-red-500" :
                              resTime.status === "warning" ? "bg-amber-500" :
                              "bg-primary"
                            )}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-muted-foreground/30 font-mono">{formatTime(item.resolutionElapsed)}</span>
                          <span className={cn(
                            "font-bold font-mono",
                            resTime.status === "danger" ? "text-red-600" :
                            resTime.status === "warning" ? "text-amber-600" :
                            "text-foreground"
                          )}>
                            {resTime.remaining > 0 ? formatTime(resTime.remaining) + " left" : "BREACHED"}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Expand chevron */}
                  <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} className="shrink-0">
                    <ChevronDown className="w-4 h-4 text-muted-foreground/30" />
                  </motion.div>
                </button>

                {/* Expanded detail */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-border/50 p-4 grid grid-cols-3 gap-6">
                        {/* SLA Details */}
                        <div className="space-y-3">
                          <h4 className="text-[10px] tracking-[0.1em] uppercase text-muted-foreground/40 font-medium">SLA Details</h4>
                          <div className="space-y-2">
                            {[
                              { label: "First Response SLA", value: formatTime(item.firstResponseSLA), met: item.firstResponseMet },
                              { label: "Resolution SLA", value: formatTime(item.resolutionSLA), met: item.status === "resolved" ? true : item.resolutionElapsed < item.resolutionSLA ? null : false },
                            ].map((d) => (
                              <div key={d.label} className="flex items-center justify-between text-[11px]">
                                <span className="text-muted-foreground/50">{d.label}</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-foreground/70">{d.value}</span>
                                  {d.met === true && <CheckCircle2 className="w-3 h-3 text-emerald-700" />}
                                  {d.met === false && <XCircle className="w-3 h-3 text-red-600" />}
                                  {d.met === null && <Clock className="w-3 h-3 text-amber-600" />}
                                </div>
                              </div>
                            ))}
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-muted-foreground/50">Time Elapsed</span>
                              <span className="font-mono text-foreground/70">{formatTime(item.resolutionElapsed)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Escalation Path */}
                        <div className="space-y-3">
                          <h4 className="text-[10px] tracking-[0.1em] uppercase text-muted-foreground/40 font-medium">Escalation Path</h4>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-muted-foreground/50">Escalate After</span>
                              <span className="font-mono text-foreground/70">{formatTime(item.escalationAfter)}</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-muted-foreground/50">Escalate To</span>
                              <span className="text-foreground/70 font-medium">{item.escalateTo}</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-muted-foreground/50">Alert Before Breach</span>
                              <span className="font-mono text-amber-600/70 flex items-center gap-1">
                                <Bell className="w-3 h-3" />
                                {formatTime(item.notifyBefore)}
                              </span>
                            </div>
                            {item.resolutionElapsed >= item.escalationAfter && (
                              <div className="mt-2 rounded-lg bg-purple-400/[0.05] border border-purple-400/15 p-2 flex items-center gap-2">
                                <ArrowUpRight className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                                <span className="text-[10px] text-purple-400/80">Escalation triggered — {item.escalateTo} notified</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Context */}
                        <div className="space-y-3">
                          <h4 className="text-[10px] tracking-[0.1em] uppercase text-muted-foreground/40 font-medium">Context</h4>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-muted-foreground/50">Created</span>
                              <span className="text-foreground/70">{item.createdAt}</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-muted-foreground/50">Platform</span>
                              <span className="text-foreground/70">{item.platform}</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-muted-foreground/50">Channel</span>
                              <span className="text-foreground/70 flex items-center gap-1">
                                {item.channel === "Phone" && <Phone className="w-3 h-3" />}
                                {item.channel === "Email" && <Mail className="w-3 h-3" />}
                                {item.channel}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-muted-foreground/50">Category</span>
                              <span className="text-foreground/70">{item.subcategory}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Breach warning banner */}
                      {(item.status === "breached" || item.status === "warning") && (
                        <div className={cn(
                          "mx-4 mb-4 rounded-lg p-3 flex items-center gap-3",
                          item.status === "breached" ? "bg-red-500/[0.05] border border-red-200" : "bg-amber-500/[0.05] border border-amber-200"
                        )}>
                          <BellRing className={cn("w-4 h-4 shrink-0", item.status === "breached" ? "text-red-600" : "text-amber-600")} />
                          <span className={cn("text-[11px]", item.status === "breached" ? "text-red-600/80" : "text-amber-600/80")}>
                            {item.status === "breached"
                              ? `SLA breached by ${formatTime(item.resolutionElapsed - item.resolutionSLA)}. Immediate action required — ${item.escalateTo} has been notified.`
                              : `SLA at risk — ${formatTime(resTime.remaining)} remaining. Alert threshold reached. Consider escalating to ${item.escalateTo}.`
                            }
                          </span>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filtered.length === 0 && (
          <div className="rounded-xl border border-border bg-card/30 p-12 text-center">
            <Search className="w-8 h-8 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground/40">No SLA items match your filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
