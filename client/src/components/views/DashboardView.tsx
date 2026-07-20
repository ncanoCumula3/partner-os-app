/*
 * DashboardView — Enterprise Command Center
 * Light teal theme with insight banner, KPI cards with mini-charts,
 * action items, health overview, SLA urgency, projects table, renewals, downsell
 */
import { useState, useEffect, useMemo } from "react";
import { useAdminSettings } from "@/contexts/AdminSettingsContext";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  ACCOUNTS, healthColor, getSaaSAccountsByUrgency, daysUntilLED,
  getLEDUrgency, formatLEDDate, ledUrgencyColors, ledUrgencyLabels,
  getARRAtRisk, isInRenewalWindow, downsellRiskColors,
  getAllRiskProfiles, riskScoreColor, riskScoreLabel, signalCategoryConfig,
  DOWNSELL_SIGNALS, TICKETS, INVOICES, type SignalCategory,
  type DownsellWeightsConfig, type RiskThresholdConfig,
} from "@/lib/data";
import {
  getProjectKPIs,
  healthColors as projectHealthColors, projectStatusColors,
  projectTypeLabels, projectTypeColors, billingModelLabels,
  getProjectBudgetPct, getProjectDaysRemaining,
  type ServiceProject,
} from "@/lib/projects";
import { useProjects } from "@/contexts/ProjectsContext";
import {
  AlertTriangle, Clock, XCircle, ArrowUpRight, Shield,
  ChevronRight, Zap, Timer, LifeBuoy, Mail, Package, Briefcase,
  ExternalLink, CalendarClock, TrendingDown, ShieldAlert, Brain, Sparkles,
  FolderKanban, CheckCircle2, Layers, Pause, DollarSign, Heart,
  AlertCircle, BarChart3, TrendingUp, X, Activity, Star, Receipt,
} from "lucide-react";
import { useMitigationEngine } from "@/contexts/MitigationEngineContext";
import { cn } from "@/lib/utils";

/* ── KPI definitions ────────────────────────────────────────── */
const kpis = [
  {
    label: "ARR",
    value: "$285K",
    delta: "+12% from last month",
    up: true,
    navTarget: "ar",
    Icon: DollarSign,
    iconBg: "bg-teal-50",
    iconColor: "text-teal-600",
  },
  {
    label: "Health Score",
    value: "79.2",
    delta: "+1.5 points",
    up: true,
    navTarget: "accounts",
    Icon: Heart,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
  },
  {
    label: "Open Tickets",
    value: "3",
    delta: "2 urgent",
    up: false,
    navTarget: "support",
    Icon: AlertCircle,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
  },
  {
    label: "Pipeline Value",
    value: "$64K",
    delta: "$15K closing this week",
    up: true,
    navTarget: "pipeline",
    Icon: BarChart3,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
  },
];

/* ── Action items ───────────────────────────────────────────── */
const actionItems = [
  { color: "bg-red-500", text: "Review Q2 Renewal Strategy for Acme Corp", time: "10:00 AM", navTarget: "accounts", hint: "View Acme Corp" },
  { color: "bg-amber-500", text: "Follow up on Project Alpha milestone", time: "1:00 PM", navTarget: "projects", hint: "View Project Alpha" },
  { color: "bg-emerald-600", text: "Prepare slides for weekly team sync", time: "3:30 PM", navTarget: "pipeline", hint: "View Pipeline" },
];

/* ── SLA Data ───────────────────────────────────────────────── */
interface SLAUrgentItem {
  id: string;
  ticketId: string;
  account: string;
  subject: string;
  category: "support" | "inquiry" | "product" | "consulting";
  urgency: "Critical" | "High" | "Medium" | "Low";
  assignee: string;
  status: "active" | "warning" | "breached" | "escalated";
  resolutionSLA: number;
  resolutionElapsed: number;
  channel: string;
  platform: string;
}

const TOP_SLA_ITEMS: SLAUrgentItem[] = [
  {
    id: "sla-t1", ticketId: "T-1041", account: "BlueWave Logistics",
    subject: "Revenue recognition module throwing errors on multi-currency invoices",
    category: "support", urgency: "Critical", assignee: "Sarah Chen",
    status: "warning", resolutionSLA: 120, resolutionElapsed: 95,
    channel: "Email", platform: "NetSuite",
  },
  {
    id: "sla-t5", ticketId: "CON-0034", account: "Edgeline Foods",
    subject: "Urgent audit compliance review — Q1 financials discrepancy",
    category: "consulting", urgency: "Critical", assignee: "Jordan Davis",
    status: "escalated", resolutionSLA: 1440, resolutionElapsed: 1380,
    channel: "Phone", platform: "NetSuite",
  },
  {
    id: "sla-t4", ticketId: "T-1029", account: "Driftwood Capital",
    subject: "Apex trigger causing CPU limit on large opportunity batch",
    category: "support", urgency: "High", assignee: "Priya Nair",
    status: "breached", resolutionSLA: 480, resolutionElapsed: 520,
    channel: "Email", platform: "Salesforce",
  },
];

/* ── SLA Helpers ────────────────────────────────────────────── */
function formatTime(minutes: number): string {
  if (minutes <= 0) return "0m";
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

const urgencyConfig: Record<string, { color: string; bg: string }> = {
  Critical: { color: "text-red-600", bg: "bg-red-50" },
  High: { color: "text-orange-500", bg: "bg-orange-50" },
  Medium: { color: "text-amber-600", bg: "bg-amber-50" },
  Low: { color: "text-emerald-700", bg: "bg-emerald-50" },
};

const statusConfig: Record<string, { label: string; color: string; bgColor: string; Icon: React.ElementType }> = {
  active: { label: "Active", color: "text-primary", bgColor: "bg-primary/10", Icon: Clock },
  warning: { label: "At Risk", color: "text-amber-600", bgColor: "bg-amber-50", Icon: AlertTriangle },
  breached: { label: "Breached", color: "text-red-600", bgColor: "bg-red-50", Icon: XCircle },
  escalated: { label: "Escalated", color: "text-purple-500", bgColor: "bg-purple-50", Icon: ArrowUpRight },
};

const categoryIcons: Record<string, React.ElementType> = {
  support: LifeBuoy,
  inquiry: Mail,
  product: Package,
  consulting: Briefcase,
};

/* ── SLA Urgency Widget ─────────────────────────────────────── */
function SLAUrgencyWidget({ onViewAll, onItemClick }: { onViewAll?: () => void; onItemClick?: (id: string) => void }) {
  const [items, setItems] = useState(TOP_SLA_ITEMS);
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
      setItems((prev) =>
        prev.map((item) => {
          const newElapsed = Math.min(item.resolutionElapsed + 1, item.resolutionSLA + 60);
          let newStatus = item.status;
          if (newElapsed >= item.resolutionSLA && item.status !== "breached") {
            newStatus = "breached";
          }
          return { ...item, resolutionElapsed: newElapsed, status: newStatus };
        })
      );
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.35 }}
      className="rounded-lg border border-border bg-card overflow-hidden"
    >
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
            <Shield className="w-4 h-4 text-red-600" />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">SLA Urgency</div>
            <div className="text-[11px] text-muted-foreground">Top 3 items requiring immediate attention</div>
          </div>
        </div>
        <button
          onClick={onViewAll}
          className="text-[11px] text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors"
        >
          View All <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      <div className="px-3 pb-3 space-y-2">
        {items.map((item, i) => {
          const remaining = item.resolutionSLA - item.resolutionElapsed;
          const percent = Math.min((item.resolutionElapsed / item.resolutionSLA) * 100, 100);
          const isBreached = remaining <= 0;
          const isWarning = !isBreached && percent >= 75;
          const urg = urgencyConfig[item.urgency];
          const st = statusConfig[item.status];
          const CatIcon = categoryIcons[item.category];

          return (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 + i * 0.08, duration: 0.3 }}
              onClick={() => onItemClick?.("sla-tracker")}
              className={cn(
                "relative w-full text-left rounded-lg border p-3.5 transition-all hover:shadow-md group",
                isBreached
                  ? "border-red-200 bg-red-50/50 hover:border-red-300"
                  : isWarning
                  ? "border-amber-200 bg-amber-50/50 hover:border-amber-300"
                  : "border-border bg-card hover:border-primary/30"
              )}
            >
              {(isBreached || (item.urgency === "Critical" && isWarning)) && (
                <div className="absolute top-3.5 right-3.5">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", isBreached ? "bg-red-500" : "bg-amber-500")} />
                    <span className={cn("relative inline-flex rounded-full h-2.5 w-2.5", isBreached ? "bg-red-500" : "bg-amber-500")} />
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center">
                  <CatIcon className="w-3 h-3 text-muted-foreground" />
                </div>
                <span className="text-[11px] font-mono text-muted-foreground">{item.ticketId}</span>
                <span className={cn("text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded", urg.bg, urg.color)}>
                  {item.urgency}
                </span>
                <span className={cn("text-[9px] font-medium px-1.5 py-0.5 rounded flex items-center gap-1", st.bgColor, st.color)}>
                  <st.Icon className="w-2.5 h-2.5" />
                  {st.label}
                </span>
                <ExternalLink className="w-3 h-3 text-muted-foreground/0 group-hover:text-primary transition-colors ml-auto" />
              </div>

              <div className="mb-2.5">
                <div className="text-[12.5px] font-medium text-foreground leading-snug line-clamp-1 group-hover:text-primary transition-colors">
                  {item.subject}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {item.account} · {item.platform} · {item.assignee}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(percent, 100)}%` }}
                    transition={{ delay: 0.5 + i * 0.1, duration: 0.6, ease: "easeOut" }}
                    className={cn("h-full rounded-full", isBreached ? "bg-red-500" : isWarning ? "bg-amber-500" : "bg-emerald-600")}
                  />
                </div>
                <div className={cn("flex items-center gap-1 text-[11px] font-mono font-semibold shrink-0",
                  isBreached ? "text-red-600" : isWarning ? "text-amber-600" : "text-foreground"
                )}>
                  {isBreached ? (
                    <><Zap className="w-3 h-3" /><span>-{formatTime(Math.abs(remaining))} overdue</span></>
                  ) : (
                    <><Timer className="w-3 h-3" /><span>{formatTime(remaining)} left</span></>
                  )}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

/* ── Main Dashboard ─────────────────────────────────────────── */
export default function DashboardView({ onNavigate }: { onNavigate?: (id: string) => void }) {
  const nav = (target: string) => onNavigate?.(target);
  const engine = useMitigationEngine();
  const engineTasks = useMemo(() => engine.getPendingTasks(), [engine]);
  const { settings } = useAdminSettings();
  const { user } = useAuth();
  const { projects: allServiceProjects, getActiveProjects: getActiveProjectsFn } = useProjects();
  const [drillDownKpi, setDrillDownKpi] = useState<string | null>(null);

  const toggleDrill = (key: string) => setDrillDownKpi(prev => prev === key ? null : key);

  // Derived data for drill-downs
  const openTickets = useMemo(() => TICKETS.filter(t => t.status !== "Resolved"), []);
  const totalARR = useMemo(() => ACCOUNTS.reduce((s, a) => s + a.arr, 0), []);
  const avgHealth = useMemo(() => ACCOUNTS.length > 0 ? ACCOUNTS.reduce((s, a) => s + a.health, 0) / ACCOUNTS.length : 0, []);

  const renewalThresholds = useMemo(() => ({
    renewalWindowMonths: settings.renewals.renewalWindowMonths,
    criticalThresholdDays: settings.renewals.criticalThresholdDays,
    urgentThresholdDays: settings.renewals.urgentThresholdDays,
  }), [settings.renewals]);

  const riskThresholds: Partial<RiskThresholdConfig> = useMemo(() => ({
    low: settings.downsell.riskThresholds.low,
    medium: settings.downsell.riskThresholds.medium,
    high: settings.downsell.riskThresholds.high,
  }), [settings.downsell.riskThresholds]);

  const downsellConfig: DownsellWeightsConfig = useMemo(() => ({
    signalWeights: {
      usageDrop: settings.downsell.signalWeights.usageDrop,
      supportIssues: settings.downsell.signalWeights.supportIssues,
      csatDecline: settings.downsell.signalWeights.csatDecline,
      billingFriction: settings.downsell.signalWeights.billingFriction,
      lowEngagement: settings.downsell.signalWeights.lowEngagement,
      outreachGhosting: settings.downsell.signalWeights.outreachGhosting,
    },
    renewalThresholds: renewalThresholds,
  }), [settings.downsell.signalWeights, renewalThresholds]);

  return (
    <div className="space-y-5">
      {/* Insight Banner */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-5 py-3"
      >
        <Sparkles className="w-4 h-4 text-primary shrink-0" />
        <span className="text-[13px] text-foreground">
          Good morning, {(user?.name || settings.general.userDisplayName)?.split(" ")[0] || "there"} — <span className="font-medium">3 items need your attention today</span>
        </span>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k, i) => {
          const drillKey = k.label === "ARR" ? "arr" : k.label === "Health Score" ? "health" : k.label === "Open Tickets" ? "tickets" : "pipeline";
          const isActive = drillDownKpi === drillKey;
          return (
            <motion.button
              key={k.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i, duration: 0.3 }}
              onClick={() => toggleDrill(drillKey)}
              className={cn(
                "rounded-lg border bg-card p-4 text-left hover:border-primary/30 hover:shadow-sm transition-all group",
                isActive ? "border-primary ring-2 ring-primary/20 shadow-md" : "border-border",
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", k.iconBg)}>
                  <k.Icon className={cn("w-[18px] h-[18px]", k.iconColor)} />
                </div>
                <TrendingUp className={cn("w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity", k.up ? "text-emerald-600" : "text-red-500", !k.up && "rotate-180")} />
              </div>
              <div className="text-[11px] text-muted-foreground font-medium mb-0.5">{k.label}</div>
              <div className="text-2xl font-bold text-foreground tracking-tight">{k.value}</div>
              <div className={cn("text-[11px] mt-1 flex items-center gap-1", k.up ? "text-emerald-600" : "text-amber-600")}>
                {k.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {k.delta}
              </div>
              {/* Mini sparkline placeholder */}
              <div className="mt-3 h-8 w-full rounded overflow-hidden bg-muted/30">
                <svg viewBox="0 0 120 32" className="w-full h-full" preserveAspectRatio="none">
                  <path
                    d={i === 0 ? "M0,28 L15,24 L30,26 L45,20 L60,18 L75,14 L90,10 L105,8 L120,4" :
                       i === 1 ? "M0,20 L15,18 L30,22 L45,16 L60,14 L75,12 L90,10 L105,8 L120,6" :
                       i === 2 ? "M0,8 L15,12 L30,10 L45,14 L60,16 L75,12 L90,14 L105,10 L120,12" :
                       "M0,26 L15,22 L30,24 L45,18 L60,14 L75,16 L90,10 L105,6 L120,4"}
                    fill="none"
                    stroke={i === 0 ? "#0B7285" : i === 1 ? "#059669" : i === 2 ? "#D97706" : "#2563EB"}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d={i === 0 ? "M0,28 L15,24 L30,26 L45,20 L60,18 L75,14 L90,10 L105,8 L120,4 L120,32 L0,32 Z" :
                       i === 1 ? "M0,20 L15,18 L30,22 L45,16 L60,14 L75,12 L90,10 L105,8 L120,6 L120,32 L0,32 Z" :
                       i === 2 ? "M0,8 L15,12 L30,10 L45,14 L60,16 L75,12 L90,14 L105,10 L120,12 L120,32 L0,32 Z" :
                       "M0,26 L15,22 L30,24 L45,18 L60,14 L75,16 L90,10 L105,6 L120,4 L120,32 L0,32 Z"}
                    fill={i === 0 ? "#0B728510" : i === 1 ? "#05966910" : i === 2 ? "#D9770610" : "#2563EB10"}
                  />
                </svg>
              </div>
              <p className="text-[8px] text-primary/60 font-medium uppercase tracking-wider mt-1.5">Click to drill down</p>
            </motion.button>
          );
        })}
      </div>

      {/* ── Drill-Down Panel ── */}
      <AnimatePresence mode="wait">
        {drillDownKpi && (
          <motion.div
            key={drillDownKpi}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-primary/20 bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  {drillDownKpi === "arr" && <><DollarSign className="w-4 h-4 text-teal-600" /> ARR — Revenue Breakdown</>}
                  {drillDownKpi === "health" && <><Heart className="w-4 h-4 text-emerald-600" /> Health Score — Account Breakdown</>}
                  {drillDownKpi === "tickets" && <><AlertCircle className="w-4 h-4 text-amber-600" /> Open Tickets — Ticket Details</>}
                  {drillDownKpi === "pipeline" && <><BarChart3 className="w-4 h-4 text-blue-600" /> Pipeline Value — Deal Breakdown</>}
                </h3>
                <button onClick={() => setDrillDownKpi(null)} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-muted transition-colors">Close</button>
              </div>

              {/* ARR Drill-Down */}
              {drillDownKpi === "arr" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Total ARR</p>
                      <p className="text-lg font-bold font-mono text-foreground">${(totalARR / 1000).toFixed(0)}K</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Accounts</p>
                      <p className="text-lg font-bold font-mono text-foreground">{ACCOUNTS.length}</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Avg ARR</p>
                      <p className="text-lg font-bold font-mono text-foreground">${(totalARR / ACCOUNTS.length / 1000).toFixed(0)}K</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Top Account</p>
                      <p className="text-lg font-bold font-mono text-foreground">{ACCOUNTS.reduce((a, b) => a.arr > b.arr ? a : b).name}</p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full text-xs">
                      <thead><tr className="bg-muted/50">
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Account</th>
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">ARR</th>
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Tier</th>
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Platform</th>
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Health</th>
                      </tr></thead>
                      <tbody className="divide-y divide-border">
                        {[...ACCOUNTS].sort((a, b) => b.arr - a.arr).map(a => (
                          <tr key={a.id}>
                            <td className="px-3 py-2 font-medium text-foreground">{a.name}</td>
                            <td className="px-3 py-2 font-mono font-medium text-foreground">${(a.arr / 1000).toFixed(0)}K</td>
                            <td className="px-3 py-2 text-muted-foreground">{a.tier}</td>
                            <td className="px-3 py-2 text-muted-foreground">{a.platform}</td>
                            <td className="px-3 py-2"><span className={cn("font-medium", healthColor(a.health))}>{a.health}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Health Score Drill-Down */}
              {drillDownKpi === "health" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Avg Health</p>
                      <p className="text-lg font-bold font-mono text-foreground">{avgHealth.toFixed(1)}</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Healthy (85+)</p>
                      <p className="text-lg font-bold font-mono text-emerald-600">{ACCOUNTS.filter(a => a.health >= 85).length}</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">At Risk (65-84)</p>
                      <p className="text-lg font-bold font-mono text-amber-600">{ACCOUNTS.filter(a => a.health >= 65 && a.health < 85).length}</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Critical (&lt;65)</p>
                      <p className="text-lg font-bold font-mono text-red-600">{ACCOUNTS.filter(a => a.health < 65).length}</p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full text-xs">
                      <thead><tr className="bg-muted/50">
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Account</th>
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Health</th>
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Stage</th>
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">ARR</th>
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Contact</th>
                      </tr></thead>
                      <tbody className="divide-y divide-border">
                        {[...ACCOUNTS].sort((a, b) => a.health - b.health).map(a => (
                          <tr key={a.id}>
                            <td className="px-3 py-2 font-medium text-foreground">{a.name}</td>
                            <td className="px-3 py-2"><span className={cn("font-bold font-mono", healthColor(a.health))}>{a.health}</span></td>
                            <td className="px-3 py-2 text-muted-foreground">{a.stage}</td>
                            <td className="px-3 py-2 font-mono text-foreground">${(a.arr / 1000).toFixed(0)}K</td>
                            <td className="px-3 py-2 text-muted-foreground">{a.contact}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Open Tickets Drill-Down */}
              {drillDownKpi === "tickets" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Total Tickets</p>
                      <p className="text-lg font-bold font-mono text-foreground">{TICKETS.length}</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Open</p>
                      <p className="text-lg font-bold font-mono text-amber-600">{openTickets.length}</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Critical</p>
                      <p className="text-lg font-bold font-mono text-red-600">{TICKETS.filter(t => t.priority === "Critical").length}</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Resolved</p>
                      <p className="text-lg font-bold font-mono text-emerald-600">{TICKETS.filter(t => t.status === "Resolved").length}</p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full text-xs">
                      <thead><tr className="bg-muted/50">
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">ID</th>
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Account</th>
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Issue</th>
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Priority</th>
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Age</th>
                      </tr></thead>
                      <tbody className="divide-y divide-border">
                        {TICKETS.map(t => (
                          <tr key={t.id} className={t.status === "Resolved" ? "opacity-50" : ""}>
                            <td className="px-3 py-2 font-mono font-medium text-primary">{t.id}</td>
                            <td className="px-3 py-2 text-foreground">{t.account}</td>
                            <td className="px-3 py-2 text-foreground max-w-[200px] truncate">{t.issue}</td>
                            <td className="px-3 py-2"><span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", t.priority === "Critical" ? "bg-red-50 text-red-700" : t.priority === "High" ? "bg-orange-50 text-orange-700" : t.priority === "Medium" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700")}>{t.priority}</span></td>
                            <td className="px-3 py-2"><span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", t.status === "Resolved" ? "bg-emerald-50 text-emerald-700" : t.status === "In Progress" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700")}>{t.status}</span></td>
                            <td className="px-3 py-2 text-muted-foreground">{t.age}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Pipeline Value Drill-Down */}
              {drillDownKpi === "pipeline" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Total Pipeline</p>
                      <p className="text-lg font-bold font-mono text-foreground">$64K</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Closing This Week</p>
                      <p className="text-lg font-bold font-mono text-blue-600">$15K</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Open Invoices</p>
                      <p className="text-lg font-bold font-mono text-foreground">{INVOICES.filter(inv => inv.status !== "Paid").length}</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Overdue</p>
                      <p className="text-lg font-bold font-mono text-red-600">{INVOICES.filter(inv => inv.status === "Overdue").length}</p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full text-xs">
                      <thead><tr className="bg-muted/50">
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Invoice</th>
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Account</th>
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Amount</th>
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Issued</th>
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Due</th>
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                      </tr></thead>
                      <tbody className="divide-y divide-border">
                        {INVOICES.map(inv => (
                          <tr key={inv.inv}>
                            <td className="px-3 py-2 font-mono font-medium text-primary">{inv.inv}</td>
                            <td className="px-3 py-2 text-foreground">{inv.account}</td>
                            <td className="px-3 py-2 font-mono font-medium text-foreground">{inv.amount}</td>
                            <td className="px-3 py-2 text-muted-foreground">{inv.issued}</td>
                            <td className="px-3 py-2 text-muted-foreground">{inv.due}</td>
                            <td className="px-3 py-2"><span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", inv.status === "Overdue" ? "bg-red-50 text-red-700" : inv.status === "Due Soon" ? "bg-amber-50 text-amber-700" : inv.status === "Paid" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700")}>{inv.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Items + Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Today's Actions */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.35 }}
          className="rounded-lg border border-border bg-card p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Today's Actions</h3>
            <button
              onClick={() => nav("support")}
              className="text-[11px] text-primary hover:text-primary/80 font-medium transition-colors"
            >
              View All
            </button>
          </div>
          <div className="space-y-0">
            {actionItems.map((a, i) => (
              <button
                key={i}
                onClick={() => nav(a.navTarget)}
                className="flex items-center gap-3 py-3 border-b border-border last:border-0 w-full text-left group hover:bg-accent/50 -mx-2 px-2 rounded-md transition-colors"
              >
                <div className={cn("w-2 h-2 rounded-full shrink-0", a.color)} />
                <span className="text-[13px] text-foreground flex-1 group-hover:text-primary transition-colors">
                  {a.text}
                </span>
                <span className="text-[11px] text-muted-foreground font-medium bg-muted px-2 py-0.5 rounded-full shrink-0">
                  {a.time}
                </span>
              </button>
            ))}
            {/* AI-Generated Tasks */}
            {engineTasks.slice(0, 3).map((task) => (
              <button
                key={task.id}
                onClick={() => nav("downsell")}
                className="flex items-center gap-3 py-3 border-b border-border last:border-0 w-full text-left group hover:bg-accent/50 -mx-2 px-2 rounded-md transition-colors"
              >
                <div className="w-2 h-2 rounded-full bg-violet-500 shrink-0" />
                <span className="text-[13px] text-foreground flex-1 group-hover:text-primary transition-colors truncate">
                  <span className="text-violet-600 font-medium">AI:</span> {task.title}
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-700 font-medium shrink-0">
                  {task.account}
                </span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Account Health */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.35 }}
          className="rounded-lg border border-border bg-card p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Account Health</h3>
            <button
              onClick={() => nav("accounts")}
              className="text-[11px] text-primary hover:text-primary/80 font-medium transition-colors"
            >
              View All
            </button>
          </div>
          <div className="space-y-2">
            {ACCOUNTS.map((acc) => (
              <button
                key={acc.id}
                onClick={() => nav("accounts")}
                className="flex items-center gap-3 w-full text-left group hover:bg-accent/50 -mx-2 px-2 py-1.5 rounded-md transition-colors"
              >
                <span className="text-[13px] text-foreground w-40 truncate group-hover:text-primary transition-colors">
                  {acc.name}
                </span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${acc.health}%` }}
                    transition={{ delay: 0.4, duration: 0.6, ease: "easeOut" }}
                    className={cn("h-full rounded-full",
                      acc.health >= 85 ? "bg-emerald-500" :
                      acc.health >= 65 ? "bg-amber-500" : "bg-red-500"
                    )}
                  />
                </div>
                <span className={cn("text-xs font-semibold w-8 text-right tabular-nums", healthColor(acc.health))}>
                  {acc.health}
                </span>
              </button>
            ))}
          </div>
        </motion.div>
      </div>

      {/* SLA Urgency Widget */}
      <SLAUrgencyWidget
        onViewAll={() => nav("sla-tracker")}
        onItemClick={(id) => nav(id)}
      />

      {/* Active Projects Table */}
      {(() => {
        const kpi = getProjectKPIs(allServiceProjects);
        const active = getActiveProjectsFn();
        if (active.length === 0) return null;
        return (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32 }}
            className="rounded-lg border border-border bg-card overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <FolderKanban className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Active Projects</h3>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                  {kpi.activeCount} active
                </span>
              </div>
              <button
                onClick={() => nav("projects")}
                className="text-[11px] text-primary font-medium flex items-center gap-1 hover:text-primary/80 transition-colors"
              >
                View All <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>

            {/* Table header */}
            <div className="grid grid-cols-12 gap-2 px-5 py-2 bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold border-b border-border">
              <div className="col-span-3">Project</div>
              <div className="col-span-2">Client</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-3">Completion</div>
              <div className="col-span-1">Budget</div>
              <div className="col-span-2 text-right">Days Left</div>
            </div>

            {/* Table rows */}
            <div className="divide-y divide-border">
              {active.slice(0, 4).map((proj) => {
                const sc = projectStatusColors[proj.status];
                const budgetPct = getProjectBudgetPct(proj);
                const daysLeft = getProjectDaysRemaining(proj);
                const acct = ACCOUNTS.find(a => a.id === proj.accountId);
                return (
                  <button
                    key={proj.id}
                    onClick={() => nav("projects")}
                    className="grid grid-cols-12 gap-2 px-5 py-3 w-full text-left hover:bg-accent/30 transition-colors group items-center"
                  >
                    <div className="col-span-3 text-[13px] font-medium text-foreground truncate group-hover:text-primary transition-colors">
                      {proj.name}
                    </div>
                    <div className="col-span-2 text-[12px] text-muted-foreground truncate">
                      {acct?.name || "—"}
                    </div>
                    <div className="col-span-1">
                      <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", sc.bg, sc.text)}>
                        {proj.health === "on_track" ? "On Track" : proj.health === "at_risk" ? "At Risk" : proj.health === "off_track" ? "Off Track" : proj.status}
                      </span>
                    </div>
                    <div className="col-span-3 flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn("h-full rounded-full", proj.health === "at_risk" || proj.health === "off_track" ? "bg-amber-500" : "bg-primary")}
                          style={{ width: `${proj.completionPct}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-muted-foreground font-medium w-8 text-right tabular-nums">
                        {proj.completionPct}%
                      </span>
                    </div>
                    <div className="col-span-1 text-[12px] text-muted-foreground tabular-nums">
                      ${(proj.contractValue / 1000).toFixed(0)}K
                    </div>
                    <div className={cn("col-span-2 text-[12px] font-medium text-right tabular-nums",
                      daysLeft <= 15 ? "text-red-600" : "text-muted-foreground"
                    )}>
                      {daysLeft} days
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        );
      })()}

      {/* Renewal Urgency Widget */}
      {(() => {
        const saasAccounts = getSaaSAccountsByUrgency();
        const inWindow = saasAccounts.filter(a => isInRenewalWindow(a, renewalThresholds.renewalWindowMonths));
        const arrAtRisk = getARRAtRisk(renewalThresholds.renewalWindowMonths);
        if (saasAccounts.length === 0) return null;
        return (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="rounded-lg border border-border bg-card overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-semibold text-foreground">Upcoming Renewals</h3>
                {inWindow.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold">
                    {inWindow.length} in window
                  </span>
                )}
                {arrAtRisk > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-700 font-bold">
                    ${(arrAtRisk / 1000).toFixed(0)}K at risk
                  </span>
                )}
              </div>
              <button
                onClick={() => nav("renewals")}
                className="text-[11px] text-primary font-medium flex items-center gap-1 hover:text-primary/80 transition-colors"
              >
                View All <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
            <div className="divide-y divide-border">
              {saasAccounts.slice(0, 4).map((acc) => {
                const lic = acc.saasLicense!;
                const days = daysUntilLED(lic.licenseEndDate);
                const urgency = getLEDUrgency(acc, renewalThresholds);
                const uc = ledUrgencyColors[urgency];
                return (
                  <button
                    key={acc.id}
                    onClick={() => nav("renewals")}
                    className="flex items-center gap-3 px-5 py-3 w-full text-left hover:bg-accent/30 transition-colors group"
                  >
                    <div className={cn("w-2 h-2 rounded-full shrink-0", uc.dot, urgency === "critical" && "animate-pulse")} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium text-foreground group-hover:text-primary transition-colors">{acc.name}</span>
                        <span className={cn("text-[9px] px-1.5 py-px rounded-full font-medium", uc.text, uc.bg)}>
                          {days}d
                        </span>
                        {lic.downsellRisk !== "None" && (
                          <span className={cn("text-[9px] px-1.5 py-px rounded-full font-medium", downsellRiskColors[lic.downsellRisk])}>
                            <TrendingDown className="w-2.5 h-2.5 inline mr-0.5" />Downsell
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        LED: {formatLEDDate(lic.licenseEndDate)} · ${(lic.annualLicenseValue / 1000).toFixed(0)}K · {lic.renewalStatus}
                      </span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/0 group-hover:text-primary transition-colors shrink-0" />
                  </button>
                );
              })}
            </div>
          </motion.div>
        );
      })()}

      {/* Downsell Mitigation Alert Widget */}
      {(() => {
        const profiles = getAllRiskProfiles(downsellConfig);
        const criticalProfiles = profiles.filter(p => p.compositeScore >= (riskThresholds.medium ?? 45));
        const totalExposed = criticalProfiles.reduce((sum, p) => sum + p.arrExposed, 0);
        const activeSignals = DOWNSELL_SIGNALS.filter(s => !s.resolved && (s.severity === "critical" || s.severity === "high")).length;
        if (criticalProfiles.length === 0) return null;
        return (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-lg border border-border bg-card overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-600" />
                <h3 className="text-sm font-semibold text-foreground">Downsell Mitigation</h3>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-700 font-bold">
                  {activeSignals} high-risk signals
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold">
                  ${(totalExposed / 1000).toFixed(0)}K exposed
                </span>
              </div>
              <button
                onClick={() => nav("downsell")}
                className="text-[11px] text-primary font-medium flex items-center gap-1 hover:text-primary/80 transition-colors"
              >
                View All <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
            <div className="divide-y divide-border">
              {criticalProfiles.slice(0, 3).map((profile) => {
                const colors = riskScoreColor(profile.compositeScore, riskThresholds);
                return (
                  <button
                    key={profile.accountId}
                    onClick={() => nav("downsell")}
                    className="flex items-center gap-3 px-5 py-3 w-full text-left hover:bg-accent/30 transition-colors group"
                  >
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold", colors.bg, colors.text)}>
                      {profile.compositeScore}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium text-foreground group-hover:text-primary transition-colors">{profile.account}</span>
                        <span className={cn("text-[9px] px-1.5 py-px rounded-full font-medium", colors.bg, colors.text)}>
                          {riskScoreLabel(profile.compositeScore, riskThresholds)}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {profile.signalCount} signals · {profile.activeMitigations} mitigations · ${(profile.arrExposed / 1000).toFixed(0)}K at risk
                      </span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/0 group-hover:text-primary transition-colors shrink-0" />
                  </button>
                );
              })}
            </div>
          </motion.div>
        );
      })()}
    </div>
  );
}
