/*
 * Reporting & Analytics Dashboard
 * Pre-built dashboards with interactive Recharts, report tabs, date range, and CSV export
 * Uses the shared ChartContainer primitives and warm adaptive theme tokens
 */
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  BarChart3, TrendingUp, Users, DollarSign, Clock, Download,
  ChevronDown, Filter, Calendar, ArrowUpRight, ArrowDownRight,
  Activity, Target, Zap, FileText, PieChart as PieChartIcon,
} from "lucide-react";
import { ACCOUNTS, TICKETS, INVOICES, OUTREACH } from "@/lib/data";
import { toast } from "sonner";

/* ─── Report Tabs ─── */
type ReportTab = "overview" | "revenue" | "health" | "support" | "pipeline";

const TABS: { id: ReportTab; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "revenue", label: "Revenue", icon: DollarSign },
  { id: "health", label: "Health & CSAT", icon: Activity },
  { id: "support", label: "Support", icon: Clock },
  { id: "pipeline", label: "Pipeline", icon: Target },
];

/* ─── Date Range ─── */
type DateRange = "7d" | "30d" | "90d" | "12m";
const DATE_RANGES: { id: DateRange; label: string }[] = [
  { id: "7d", label: "7 Days" },
  { id: "30d", label: "30 Days" },
  { id: "90d", label: "90 Days" },
  { id: "12m", label: "12 Months" },
];

/* ─── Chart Colors (warm palette) ─── */
const COLORS = {
  primary: "#C75B2A",
  secondary: "#D4A843",
  tertiary: "#6B8F71",
  quaternary: "#B87333",
  muted: "#94a3b8",
  danger: "#dc2626",
  warning: "#d97706",
  success: "#16a34a",
};

const PIE_COLORS = ["#C75B2A", "#D4A843", "#6B8F71", "#B87333", "#94a3b8"];

/* ─── Mock Time-Series Data ─── */
const generateMonthlyData = () => [
  { month: "Nov", arr: 245000, newArr: 18000, churn: 4000, health: 78, tickets: 22, resolved: 18, csat: 4.1, pipeline: 320000 },
  { month: "Dec", arr: 259000, newArr: 21000, churn: 7000, health: 76, tickets: 28, resolved: 24, csat: 3.9, pipeline: 290000 },
  { month: "Jan", arr: 268000, newArr: 16000, churn: 7000, health: 79, tickets: 19, resolved: 17, csat: 4.2, pipeline: 340000 },
  { month: "Feb", arr: 278000, newArr: 15000, churn: 5000, health: 81, tickets: 16, resolved: 15, csat: 4.3, pipeline: 380000 },
  { month: "Mar", arr: 285000, newArr: 12000, churn: 5000, health: 80, tickets: 14, resolved: 12, csat: 4.4, pipeline: 410000 },
  { month: "Apr", arr: 285000, newArr: 8000, churn: 8000, health: 79, tickets: 12, resolved: 9, csat: 4.2, pipeline: 450000 },
];

const MONTHLY_DATA = generateMonthlyData();

/* ─── Derived Metrics ─── */
const totalARR = ACCOUNTS.reduce((s, a) => s + a.arr, 0);
const avgHealth = Math.round(ACCOUNTS.reduce((s, a) => s + a.health, 0) / ACCOUNTS.length);
const openTickets = TICKETS.filter((t) => t.status !== "Resolved").length;
const overdueInvoices = INVOICES.filter((i) => i.status === "Overdue").length;

/* ─── Tier Distribution ─── */
const tierData = [
  { name: "Gold", value: ACCOUNTS.filter((a) => a.tier === "Gold").length, arr: ACCOUNTS.filter((a) => a.tier === "Gold").reduce((s, a) => s + a.arr, 0) },
  { name: "Silver", value: ACCOUNTS.filter((a) => a.tier === "Silver").length, arr: ACCOUNTS.filter((a) => a.tier === "Silver").reduce((s, a) => s + a.arr, 0) },
  { name: "Bronze", value: ACCOUNTS.filter((a) => a.tier === "Bronze").length, arr: ACCOUNTS.filter((a) => a.tier === "Bronze").reduce((s, a) => s + a.arr, 0) },
];

/* ─── Stage Distribution ─── */
const stageData = [
  { name: "Expansion", value: ACCOUNTS.filter((a) => a.stage === "Expansion").length },
  { name: "Stable", value: ACCOUNTS.filter((a) => a.stage === "Stable").length },
  { name: "At Risk", value: ACCOUNTS.filter((a) => a.stage === "At Risk").length },
  { name: "Upsell Ready", value: ACCOUNTS.filter((a) => a.stage === "Upsell Ready").length },
];

/* ─── Priority Distribution ─── */
const priorityData = [
  { name: "Critical", value: TICKETS.filter((t) => t.priority === "Critical").length },
  { name: "High", value: TICKETS.filter((t) => t.priority === "High").length },
  { name: "Medium", value: TICKETS.filter((t) => t.priority === "Medium").length },
  { name: "Low", value: TICKETS.filter((t) => t.priority === "Low").length },
];

/* ─── Platform Distribution ─── */
const platformData = ACCOUNTS.reduce<{ name: string; accounts: number; arr: number }[]>((acc, a) => {
  const existing = acc.find((p) => p.name === a.platform);
  if (existing) { existing.accounts++; existing.arr += a.arr; }
  else acc.push({ name: a.platform, accounts: 1, arr: a.arr });
  return acc;
}, []);

/* ─── Stat Card ─── */
function StatCard({ label, value, change, changeLabel, icon: Icon, color, isActive, onClick }: {
  label: string; value: string; change?: number; changeLabel?: string;
  icon: React.ElementType; color: string; isActive?: boolean; onClick?: () => void;
}) {
  const isPositive = (change ?? 0) >= 0;
  return (
    <button onClick={onClick} className={`bg-card border rounded-xl p-5 text-left transition-all cursor-pointer hover:shadow-md hover:border-primary/40 ${isActive ? "border-primary ring-2 ring-primary/20 shadow-md" : "border-border"}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}18` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
      </div>
      <div className="text-2xl font-bold text-foreground mb-1">{value}</div>
      {change !== undefined && (
        <div className="flex items-center gap-1">
          {isPositive ? <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" /> : <ArrowDownRight className="w-3.5 h-3.5 text-red-500" />}
          <span className={`text-xs font-medium ${isPositive ? "text-emerald-600" : "text-red-500"}`}>
            {isPositive ? "+" : ""}{change}%
          </span>
          <span className="text-xs text-muted-foreground ml-1">{changeLabel || "vs last period"}</span>
        </div>
      )}
      <p className="text-[8px] text-primary/60 font-medium uppercase tracking-wider mt-1">Click to drill down</p>
    </button>
  );
}

/* ─── Drill-Down Panel Wrapper ─── */
function DrillPanel({ drillKey, onClose, children }: { drillKey: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <AnimatePresence mode="wait">
      {drillKey && (
        <motion.div key={drillKey} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
          <div className="rounded-xl border border-primary/20 bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Source Data</h3>
              <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-muted transition-colors">Close</button>
            </div>
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─── Chart Wrapper ─── */
function ChartCard({ title, subtitle, children, className = "" }: {
  title: string; subtitle?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`bg-card border border-border rounded-xl p-5 ${className}`}>
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

/* ─── Custom Tooltip ─── */
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="font-medium text-foreground mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium text-foreground">
            {typeof entry.value === "number" && entry.value > 1000
              ? `$${(entry.value / 1000).toFixed(0)}K`
              : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ─── Export Helper ─── */
function exportCSV(data: Record<string, any>[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(","),
    ...data.map((row) => headers.map((h) => JSON.stringify(row[h] ?? "")).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success(`Exported ${filename}.csv`);
}

/* ═══════════════════════════════════════════════════════════════
   MAIN VIEW
   ═══════════════════════════════════════════════════════════════ */
export default function ReportingView() {
  const [tab, setTab] = useState<ReportTab>("overview");
  const [dateRange, setDateRange] = useState<DateRange>("90d");
  const [showDatePicker, setShowDatePicker] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Reporting & Analytics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Real-time insights across accounts, revenue, health, and support
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Date Range Selector */}
          <div className="relative">
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-accent transition-colors"
            >
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              {DATE_RANGES.find((r) => r.id === dateRange)?.label}
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </button>
            <AnimatePresence>
              {showDatePicker && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg z-20 py-1 min-w-[120px]"
                >
                  {DATE_RANGES.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => { setDateRange(r.id); setShowDatePicker(false); }}
                      className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                        dateRange === r.id
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-foreground hover:bg-accent"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Export Button */}
          <button
            onClick={() => {
              if (tab === "revenue") exportCSV(MONTHLY_DATA.map(d => ({ Month: d.month, ARR: d.arr, NewARR: d.newArr, Churn: d.churn })), "revenue_report");
              else if (tab === "support") exportCSV(TICKETS.map(t => ({ ...t })), "support_report");
              else if (tab === "health") exportCSV(ACCOUNTS.map(a => ({ Account: a.name, Health: a.health, Tier: a.tier, Stage: a.stage })), "health_report");
              else if (tab === "pipeline") exportCSV(OUTREACH.map(o => ({ ...o })), "pipeline_report");
              else exportCSV(ACCOUNTS.map(a => ({ ...a })), "overview_report");
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-accent transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex items-center gap-1 bg-card border border-border rounded-xl p-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="report-tab"
                  className="absolute inset-0 bg-primary/10 rounded-lg"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <Icon className="w-3.5 h-3.5 relative z-10" />
              <span className="relative z-10 hidden sm:inline">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
        >
          {tab === "overview" && <OverviewTab />}
          {tab === "revenue" && <RevenueTab />}
          {tab === "health" && <HealthTab />}
          {tab === "support" && <SupportTab />}
          {tab === "pipeline" && <PipelineTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ═══ OVERVIEW TAB ═══ */
function OverviewTab() {
  const [drill, setDrill] = useState<string | null>(null);
  const toggle = (k: string) => setDrill(p => p === k ? null : k);
  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total ARR" value={`$${(totalARR / 1000).toFixed(0)}K`} change={5.2} icon={DollarSign} color={COLORS.primary} isActive={drill === "arr"} onClick={() => toggle("arr")} />
        <StatCard label="Avg Health" value={`${avgHealth}%`} change={2.1} icon={Activity} color={COLORS.tertiary} isActive={drill === "health"} onClick={() => toggle("health")} />
        <StatCard label="Open Tickets" value={`${openTickets}`} change={-14} changeLabel="vs last month" icon={Clock} color={COLORS.warning} isActive={drill === "tickets"} onClick={() => toggle("tickets")} />
        <StatCard label="Active Accounts" value={`${ACCOUNTS.length}`} change={8} icon={Users} color={COLORS.secondary} isActive={drill === "accounts"} onClick={() => toggle("accounts")} />
      </div>
      {drill && <DrillPanel drillKey={drill} onClose={() => setDrill(null)}>
        {drill === "arr" && <div className="rounded-lg border border-border overflow-hidden"><table className="w-full text-xs"><thead><tr className="bg-muted/50"><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Account</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">ARR</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Tier</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Platform</th></tr></thead><tbody className="divide-y divide-border">{[...ACCOUNTS].sort((a, b) => b.arr - a.arr).map(a => (<tr key={a.id}><td className="px-3 py-2 font-medium text-foreground">{a.name}</td><td className="px-3 py-2 font-mono font-bold text-foreground">${(a.arr / 1000).toFixed(0)}K</td><td className="px-3 py-2 text-muted-foreground">{a.tier}</td><td className="px-3 py-2 text-muted-foreground">{a.platform}</td></tr>))}</tbody></table></div>}
        {drill === "health" && <div className="rounded-lg border border-border overflow-hidden"><table className="w-full text-xs"><thead><tr className="bg-muted/50"><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Account</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Health</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Stage</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">ARR</th></tr></thead><tbody className="divide-y divide-border">{[...ACCOUNTS].sort((a, b) => a.health - b.health).map(a => (<tr key={a.id}><td className="px-3 py-2 font-medium text-foreground">{a.name}</td><td className="px-3 py-2 font-mono font-bold" style={{ color: a.health >= 85 ? COLORS.success : a.health >= 70 ? COLORS.warning : COLORS.danger }}>{a.health}%</td><td className="px-3 py-2 text-muted-foreground">{a.stage}</td><td className="px-3 py-2 font-mono text-foreground">${(a.arr / 1000).toFixed(0)}K</td></tr>))}</tbody></table></div>}
        {drill === "tickets" && <div className="rounded-lg border border-border overflow-hidden"><table className="w-full text-xs"><thead><tr className="bg-muted/50"><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Ticket</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Account</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Issue</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Priority</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Status</th></tr></thead><tbody className="divide-y divide-border">{TICKETS.filter(t => t.status !== "Resolved").map(t => (<tr key={t.id}><td className="px-3 py-2 font-mono font-medium text-primary">{t.id}</td><td className="px-3 py-2 text-foreground">{t.account}</td><td className="px-3 py-2 text-muted-foreground truncate max-w-[200px]">{t.issue}</td><td className="px-3 py-2 text-muted-foreground">{t.priority}</td><td className="px-3 py-2 text-muted-foreground">{t.status}</td></tr>))}</tbody></table></div>}
        {drill === "accounts" && <div className="rounded-lg border border-border overflow-hidden"><table className="w-full text-xs"><thead><tr className="bg-muted/50"><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Account</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Tier</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Platform</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Health</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">ARR</th></tr></thead><tbody className="divide-y divide-border">{ACCOUNTS.map(a => (<tr key={a.id}><td className="px-3 py-2 font-medium text-foreground">{a.name}</td><td className="px-3 py-2 text-muted-foreground">{a.tier}</td><td className="px-3 py-2 text-muted-foreground">{a.platform}</td><td className="px-3 py-2 font-mono">{a.health}%</td><td className="px-3 py-2 font-mono text-foreground">${(a.arr / 1000).toFixed(0)}K</td></tr>))}</tbody></table></div>}
      </DrillPanel>}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ARR Trend */}
        <ChartCard title="ARR Trend" subtitle="Monthly recurring revenue over 6 months">
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MONTHLY_DATA}>
                <defs>
                  <linearGradient id="arrGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS.primary} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={COLORS.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v / 1000}K`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="arr" name="ARR" stroke={COLORS.primary} fill="url(#arrGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Tier Distribution */}
        <ChartCard title="Revenue by Tier" subtitle="ARR distribution across account tiers">
          <div className="h-[260px] flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={tierData} dataKey="arr" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={55} paddingAngle={4} strokeWidth={0}>
                  {tierData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend formatter={(value) => <span className="text-xs text-foreground">{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Account Stage */}
        <ChartCard title="Account Stages" subtitle="Current lifecycle distribution">
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageData} layout="vertical" barSize={18}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={85} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Accounts" fill={COLORS.primary} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Platform Mix */}
        <ChartCard title="Platform Mix" subtitle="Accounts by connected platform">
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={platformData} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="accounts" name="Accounts" fill={COLORS.secondary} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Quick Stats Table */}
        <ChartCard title="Top Accounts by ARR" subtitle="Highest revenue accounts">
          <div className="space-y-3">
            {[...ACCOUNTS].sort((a, b) => b.arr - a.arr).map((a, i) => (
              <div key={a.id} className="flex items-center gap-3">
                <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{a.name}</p>
                  <p className="text-[10px] text-muted-foreground">{a.platform} · {a.tier}</p>
                </div>
                <span className="text-xs font-semibold text-foreground">${(a.arr / 1000).toFixed(0)}K</span>
                <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${(a.arr / 120000) * 100}%`, backgroundColor: COLORS.primary }} />
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

/* ═══ REVENUE TAB ═══ */
function RevenueTab() {
  const [drill, setDrill] = useState<string | null>(null);
  const toggle = (k: string) => setDrill(p => p === k ? null : k);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total ARR" value={`$${(totalARR / 1000).toFixed(0)}K`} change={5.2} icon={DollarSign} color={COLORS.primary} isActive={drill === "arr"} onClick={() => toggle("arr")} />
        <StatCard label="New ARR (6mo)" value={`$${(MONTHLY_DATA.reduce((s, d) => s + d.newArr, 0) / 1000).toFixed(0)}K`} change={12} icon={TrendingUp} color={COLORS.tertiary} isActive={drill === "newArr"} onClick={() => toggle("newArr")} />
        <StatCard label="Churn (6mo)" value={`$${(MONTHLY_DATA.reduce((s, d) => s + d.churn, 0) / 1000).toFixed(0)}K`} change={-8} changeLabel="improvement" icon={ArrowDownRight} color={COLORS.danger} isActive={drill === "churn"} onClick={() => toggle("churn")} />
        <StatCard label="Net Retention" value="113%" change={3.5} icon={Zap} color={COLORS.secondary} isActive={drill === "retention"} onClick={() => toggle("retention")} />
      </div>
      {drill && <DrillPanel drillKey={drill} onClose={() => setDrill(null)}>
        {drill === "arr" && <div className="rounded-lg border border-border overflow-hidden"><table className="w-full text-xs"><thead><tr className="bg-muted/50"><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Account</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">ARR</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Tier</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Stage</th></tr></thead><tbody className="divide-y divide-border">{[...ACCOUNTS].sort((a, b) => b.arr - a.arr).map(a => (<tr key={a.id}><td className="px-3 py-2 font-medium text-foreground">{a.name}</td><td className="px-3 py-2 font-mono font-bold text-foreground">${(a.arr / 1000).toFixed(0)}K</td><td className="px-3 py-2 text-muted-foreground">{a.tier}</td><td className="px-3 py-2 text-muted-foreground">{a.stage}</td></tr>))}</tbody></table></div>}
        {drill === "newArr" && <div className="rounded-lg border border-border overflow-hidden"><table className="w-full text-xs"><thead><tr className="bg-muted/50"><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Month</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">New ARR</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Total ARR</th></tr></thead><tbody className="divide-y divide-border">{MONTHLY_DATA.map(d => (<tr key={d.month}><td className="px-3 py-2 font-medium text-foreground">{d.month}</td><td className="px-3 py-2 font-mono font-bold text-emerald-600">${(d.newArr / 1000).toFixed(0)}K</td><td className="px-3 py-2 font-mono text-foreground">${(d.arr / 1000).toFixed(0)}K</td></tr>))}</tbody></table></div>}
        {drill === "churn" && <div className="rounded-lg border border-border overflow-hidden"><table className="w-full text-xs"><thead><tr className="bg-muted/50"><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Month</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Churn</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Total ARR</th></tr></thead><tbody className="divide-y divide-border">{MONTHLY_DATA.map(d => (<tr key={d.month}><td className="px-3 py-2 font-medium text-foreground">{d.month}</td><td className="px-3 py-2 font-mono font-bold text-red-600">${(d.churn / 1000).toFixed(0)}K</td><td className="px-3 py-2 font-mono text-foreground">${(d.arr / 1000).toFixed(0)}K</td></tr>))}</tbody></table></div>}
        {drill === "retention" && <div className="rounded-lg border border-border overflow-hidden"><table className="w-full text-xs"><thead><tr className="bg-muted/50"><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Month</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">New ARR</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Churn</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Net</th></tr></thead><tbody className="divide-y divide-border">{MONTHLY_DATA.map(d => (<tr key={d.month}><td className="px-3 py-2 font-medium text-foreground">{d.month}</td><td className="px-3 py-2 font-mono text-emerald-600">${(d.newArr / 1000).toFixed(0)}K</td><td className="px-3 py-2 font-mono text-red-600">${(d.churn / 1000).toFixed(0)}K</td><td className="px-3 py-2 font-mono font-bold text-foreground">${((d.newArr - d.churn) / 1000).toFixed(0)}K</td></tr>))}</tbody></table></div>}
      </DrillPanel>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="ARR Growth" subtitle="Monthly ARR with new revenue and churn breakdown">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MONTHLY_DATA} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v / 1000}K`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend formatter={(v) => <span className="text-xs">{v}</span>} />
                <Bar dataKey="newArr" name="New ARR" fill={COLORS.tertiary} radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="churn" name="Churn" fill={COLORS.danger} radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Cumulative ARR" subtitle="Total ARR trajectory over time">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MONTHLY_DATA}>
                <defs>
                  <linearGradient id="arrGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS.secondary} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={COLORS.secondary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v / 1000}K`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="arr" name="Total ARR" stroke={COLORS.secondary} fill="url(#arrGrad2)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Revenue by Tier */}
      <ChartCard title="Revenue Concentration" subtitle="ARR breakdown by tier and platform">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={tierData} dataKey="arr" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={45} paddingAngle={4} strokeWidth={0}>
                  {tierData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend formatter={(v) => <span className="text-xs">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3 flex flex-col justify-center">
            {tierData.map((t, i) => (
              <div key={t.name} className="flex items-center gap-3">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: PIE_COLORS[i] }} />
                <span className="text-xs font-medium text-foreground flex-1">{t.name} Tier</span>
                <span className="text-xs text-muted-foreground">{t.value} accounts</span>
                <span className="text-xs font-semibold text-foreground">${(t.arr / 1000).toFixed(0)}K</span>
              </div>
            ))}
            <div className="border-t border-border pt-2 mt-1 flex items-center gap-3">
              <div className="w-3 h-3" />
              <span className="text-xs font-semibold text-foreground flex-1">Total</span>
              <span className="text-xs text-muted-foreground">{ACCOUNTS.length} accounts</span>
              <span className="text-xs font-bold text-foreground">${(totalARR / 1000).toFixed(0)}K</span>
            </div>
          </div>
        </div>
      </ChartCard>
    </div>
  );
}

/* ═══ HEALTH TAB ═══ */
function HealthTab() {
  const [drill, setDrill] = useState<string | null>(null);
  const toggle = (k: string) => setDrill(p => p === k ? null : k);
  const healthDist = [
    { range: "90-100", count: ACCOUNTS.filter((a) => a.health >= 90).length, color: COLORS.success },
    { range: "70-89", count: ACCOUNTS.filter((a) => a.health >= 70 && a.health < 90).length, color: COLORS.secondary },
    { range: "50-69", count: ACCOUNTS.filter((a) => a.health >= 50 && a.health < 70).length, color: COLORS.warning },
    { range: "0-49", count: ACCOUNTS.filter((a) => a.health < 50).length, color: COLORS.danger },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Avg Health Score" value={`${avgHealth}%`} change={2.1} icon={Activity} color={COLORS.tertiary} isActive={drill === "avgHealth"} onClick={() => toggle("avgHealth")} />
        <StatCard label="Healthy (≥85)" value={`${ACCOUNTS.filter((a) => a.health >= 85).length}`} icon={Target} color={COLORS.success} isActive={drill === "healthy"} onClick={() => toggle("healthy")} />
        <StatCard label="At Risk (<70)" value={`${ACCOUNTS.filter((a) => a.health < 70).length}`} change={-1} changeLabel="vs last month" icon={Zap} color={COLORS.danger} isActive={drill === "atRisk"} onClick={() => toggle("atRisk")} />
        <StatCard label="Avg CSAT" value="4.2" change={1.8} icon={Users} color={COLORS.secondary} isActive={drill === "csat"} onClick={() => toggle("csat")} />
      </div>
      {drill && <DrillPanel drillKey={drill} onClose={() => setDrill(null)}>
        {drill === "avgHealth" && <div className="rounded-lg border border-border overflow-hidden"><table className="w-full text-xs"><thead><tr className="bg-muted/50"><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Account</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Health</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Stage</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">ARR</th></tr></thead><tbody className="divide-y divide-border">{[...ACCOUNTS].sort((a, b) => a.health - b.health).map(a => (<tr key={a.id}><td className="px-3 py-2 font-medium text-foreground">{a.name}</td><td className="px-3 py-2 font-mono font-bold" style={{ color: a.health >= 85 ? COLORS.success : a.health >= 70 ? COLORS.warning : COLORS.danger }}>{a.health}%</td><td className="px-3 py-2 text-muted-foreground">{a.stage}</td><td className="px-3 py-2 font-mono text-foreground">${(a.arr / 1000).toFixed(0)}K</td></tr>))}</tbody></table></div>}
        {drill === "healthy" && <div className="rounded-lg border border-border overflow-hidden"><table className="w-full text-xs"><thead><tr className="bg-muted/50"><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Account</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Health</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Tier</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">ARR</th></tr></thead><tbody className="divide-y divide-border">{ACCOUNTS.filter(a => a.health >= 85).sort((a, b) => b.health - a.health).map(a => (<tr key={a.id}><td className="px-3 py-2 font-medium text-foreground">{a.name}</td><td className="px-3 py-2 font-mono font-bold text-emerald-600">{a.health}%</td><td className="px-3 py-2 text-muted-foreground">{a.tier}</td><td className="px-3 py-2 font-mono text-foreground">${(a.arr / 1000).toFixed(0)}K</td></tr>))}</tbody></table></div>}
        {drill === "atRisk" && <div className="rounded-lg border border-border overflow-hidden"><table className="w-full text-xs"><thead><tr className="bg-muted/50"><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Account</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Health</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Stage</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">ARR</th></tr></thead><tbody className="divide-y divide-border">{ACCOUNTS.filter(a => a.health < 70).sort((a, b) => a.health - b.health).map(a => (<tr key={a.id}><td className="px-3 py-2 font-medium text-foreground">{a.name}</td><td className="px-3 py-2 font-mono font-bold text-red-600">{a.health}%</td><td className="px-3 py-2 text-muted-foreground">{a.stage}</td><td className="px-3 py-2 font-mono text-foreground">${(a.arr / 1000).toFixed(0)}K</td></tr>))}</tbody></table></div>}
        {drill === "csat" && <div className="rounded-lg border border-border overflow-hidden"><table className="w-full text-xs"><thead><tr className="bg-muted/50"><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Month</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">CSAT</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Tickets</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Resolved</th></tr></thead><tbody className="divide-y divide-border">{MONTHLY_DATA.map(d => (<tr key={d.month}><td className="px-3 py-2 font-medium text-foreground">{d.month}</td><td className="px-3 py-2 font-mono font-bold" style={{ color: d.csat >= 4.0 ? COLORS.success : COLORS.warning }}>{d.csat}</td><td className="px-3 py-2 font-mono text-foreground">{d.tickets}</td><td className="px-3 py-2 font-mono text-emerald-600">{d.resolved}</td></tr>))}</tbody></table></div>}
      </DrillPanel>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Health Score Trend" subtitle="Average health score over 6 months">
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={MONTHLY_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis domain={[70, 90]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="health" name="Health Score" stroke={COLORS.tertiary} strokeWidth={2.5} dot={{ r: 4, fill: COLORS.tertiary }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="CSAT Trend" subtitle="Customer satisfaction score over 6 months">
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={MONTHLY_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis domain={[3.5, 5]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="csat" name="CSAT Score" stroke={COLORS.secondary} strokeWidth={2.5} dot={{ r: 4, fill: COLORS.secondary }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Health Distribution */}
      <ChartCard title="Health Distribution" subtitle="Account distribution by health score range">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={healthDist} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="range" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Accounts" radius={[6, 6, 0, 0]}>
                  {healthDist.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3 flex flex-col justify-center">
            {ACCOUNTS.sort((a, b) => a.health - b.health).map((a) => (
              <div key={a.id} className="flex items-center gap-3">
                <div className="w-full max-w-[140px]">
                  <p className="text-xs font-medium text-foreground truncate">{a.name}</p>
                </div>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${a.health}%`,
                      backgroundColor: a.health >= 85 ? COLORS.success : a.health >= 65 ? COLORS.warning : COLORS.danger,
                    }}
                  />
                </div>
                <span className="text-xs font-semibold text-foreground w-8 text-right">{a.health}</span>
              </div>
            ))}
          </div>
        </div>
      </ChartCard>
    </div>
  );
}

/* ═══ SUPPORT TAB ═══ */
function SupportTab() {
  const [drill, setDrill] = useState<string | null>(null);
  const toggle = (k: string) => setDrill(p => p === k ? null : k);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Open Tickets" value={`${openTickets}`} change={-14} changeLabel="vs last month" icon={Clock} color={COLORS.warning} isActive={drill === "open"} onClick={() => toggle("open")} />
        <StatCard label="Avg Resolution" value="4.2d" change={-18} changeLabel="faster" icon={Zap} color={COLORS.tertiary} isActive={drill === "resolution"} onClick={() => toggle("resolution")} />
        <StatCard label="First Response" value="2.1h" change={-22} changeLabel="faster" icon={Activity} color={COLORS.primary} isActive={drill === "firstResponse"} onClick={() => toggle("firstResponse")} />
        <StatCard label="Resolution Rate" value="87%" change={5} icon={Target} color={COLORS.success} isActive={drill === "rate"} onClick={() => toggle("rate")} />
      </div>
      {drill && <DrillPanel drillKey={drill} onClose={() => setDrill(null)}>
        {drill === "open" && <div className="rounded-lg border border-border overflow-hidden"><table className="w-full text-xs"><thead><tr className="bg-muted/50"><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Ticket</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Account</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Issue</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Priority</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Status</th></tr></thead><tbody className="divide-y divide-border">{TICKETS.filter(t => t.status !== "Resolved").map(t => (<tr key={t.id}><td className="px-3 py-2 font-mono font-medium text-primary">{t.id}</td><td className="px-3 py-2 text-foreground">{t.account}</td><td className="px-3 py-2 text-muted-foreground truncate max-w-[200px]">{t.issue}</td><td className="px-3 py-2 text-muted-foreground">{t.priority}</td><td className="px-3 py-2 text-muted-foreground">{t.status}</td></tr>))}</tbody></table></div>}
        {drill === "resolution" && <div className="rounded-lg border border-border overflow-hidden"><table className="w-full text-xs"><thead><tr className="bg-muted/50"><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Month</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Tickets</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Resolved</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Resolution %</th></tr></thead><tbody className="divide-y divide-border">{MONTHLY_DATA.map(d => (<tr key={d.month}><td className="px-3 py-2 font-medium text-foreground">{d.month}</td><td className="px-3 py-2 font-mono text-foreground">{d.tickets}</td><td className="px-3 py-2 font-mono text-emerald-600">{d.resolved}</td><td className="px-3 py-2 font-mono font-bold text-foreground">{d.tickets > 0 ? Math.round((d.resolved / d.tickets) * 100) : 0}%</td></tr>))}</tbody></table></div>}
        {drill === "firstResponse" && <div className="rounded-lg border border-border overflow-hidden"><table className="w-full text-xs"><thead><tr className="bg-muted/50"><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Month</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Tickets</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">CSAT</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Health</th></tr></thead><tbody className="divide-y divide-border">{MONTHLY_DATA.map(d => (<tr key={d.month}><td className="px-3 py-2 font-medium text-foreground">{d.month}</td><td className="px-3 py-2 font-mono text-foreground">{d.tickets}</td><td className="px-3 py-2 font-mono" style={{ color: d.csat >= 4.0 ? COLORS.success : COLORS.warning }}>{d.csat}</td><td className="px-3 py-2 font-mono text-foreground">{d.health}%</td></tr>))}</tbody></table></div>}
        {drill === "rate" && <div className="rounded-lg border border-border overflow-hidden"><table className="w-full text-xs"><thead><tr className="bg-muted/50"><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Month</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Tickets</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Resolved</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Rate</th></tr></thead><tbody className="divide-y divide-border">{MONTHLY_DATA.map(d => (<tr key={d.month}><td className="px-3 py-2 font-medium text-foreground">{d.month}</td><td className="px-3 py-2 font-mono text-foreground">{d.tickets}</td><td className="px-3 py-2 font-mono text-emerald-600">{d.resolved}</td><td className="px-3 py-2 font-mono font-bold" style={{ color: d.tickets > 0 && (d.resolved / d.tickets) >= 0.85 ? COLORS.success : COLORS.warning }}>{d.tickets > 0 ? Math.round((d.resolved / d.tickets) * 100) : 0}%</td></tr>))}</tbody></table></div>}
      </DrillPanel>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Ticket Volume" subtitle="Opened vs resolved tickets over 6 months">
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MONTHLY_DATA} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend formatter={(v) => <span className="text-xs">{v}</span>} />
                <Bar dataKey="tickets" name="Opened" fill={COLORS.warning} radius={[4, 4, 0, 0]} barSize={18} />
                <Bar dataKey="resolved" name="Resolved" fill={COLORS.tertiary} radius={[4, 4, 0, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Priority Breakdown" subtitle="Current open tickets by priority level">
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={priorityData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={55} paddingAngle={4} strokeWidth={0}>
                  <Cell fill={COLORS.danger} />
                  <Cell fill={COLORS.warning} />
                  <Cell fill={COLORS.secondary} />
                  <Cell fill={COLORS.tertiary} />
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend formatter={(v) => <span className="text-xs">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Ticket Table */}
      <ChartCard title="Recent Tickets" subtitle="All active and recent support tickets">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-2 text-muted-foreground font-medium">ID</th>
                <th className="text-left py-2 px-2 text-muted-foreground font-medium">Account</th>
                <th className="text-left py-2 px-2 text-muted-foreground font-medium">Issue</th>
                <th className="text-left py-2 px-2 text-muted-foreground font-medium">Priority</th>
                <th className="text-left py-2 px-2 text-muted-foreground font-medium">Status</th>
                <th className="text-left py-2 px-2 text-muted-foreground font-medium">Age</th>
              </tr>
            </thead>
            <tbody>
              {TICKETS.map((t) => (
                <tr key={t.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                  <td className="py-2.5 px-2 font-mono font-medium text-foreground">{t.id}</td>
                  <td className="py-2.5 px-2 text-foreground">{t.account}</td>
                  <td className="py-2.5 px-2 text-muted-foreground max-w-[200px] truncate">{t.issue}</td>
                  <td className="py-2.5 px-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      t.priority === "Critical" ? "bg-red-100 text-red-700" :
                      t.priority === "High" ? "bg-orange-100 text-orange-700" :
                      t.priority === "Medium" ? "bg-amber-100 text-amber-700" :
                      "bg-emerald-100 text-emerald-700"
                    }`}>{t.priority}</span>
                  </td>
                  <td className="py-2.5 px-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      t.status === "Open" ? "bg-red-100 text-red-700" :
                      t.status === "In Progress" ? "bg-amber-100 text-amber-700" :
                      "bg-emerald-100 text-emerald-700"
                    }`}>{t.status}</span>
                  </td>
                  <td className="py-2.5 px-2 text-muted-foreground">{t.age}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}

/* ═══ PIPELINE TAB ═══ */
function PipelineTab() {
  const [drill, setDrill] = useState<string | null>(null);
  const toggle = (k: string) => setDrill(p => p === k ? null : k);
  const pipelineStages = [
    { stage: "Prospecting", value: 180000, deals: 8 },
    { stage: "Discovery", value: 120000, deals: 5 },
    { stage: "Proposal", value: 95000, deals: 3 },
    { stage: "Negotiation", value: 55000, deals: 2 },
    { stage: "Closed Won", value: 45000, deals: 2 },
  ];

  const totalPipeline = pipelineStages.reduce((s, p) => s + p.value, 0);
  const winRate = Math.round((pipelineStages[4].deals / pipelineStages.reduce((s, p) => s + p.deals, 0)) * 100);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Pipeline" value={`$${(totalPipeline / 1000).toFixed(0)}K`} change={12} icon={Target} color={COLORS.primary} isActive={drill === "pipeline"} onClick={() => toggle("pipeline")} />
        <StatCard label="Weighted Value" value={`$${(totalPipeline * 0.35 / 1000).toFixed(0)}K`} icon={DollarSign} color={COLORS.secondary} isActive={drill === "weighted"} onClick={() => toggle("weighted")} />
        <StatCard label="Win Rate" value={`${winRate}%`} change={3} icon={TrendingUp} color={COLORS.tertiary} isActive={drill === "winRate"} onClick={() => toggle("winRate")} />
        <StatCard label="Avg Deal Size" value={`$${Math.round(totalPipeline / pipelineStages.reduce((s, p) => s + p.deals, 0) / 1000)}K`} icon={Zap} color={COLORS.quaternary} isActive={drill === "dealSize"} onClick={() => toggle("dealSize")} />
      </div>
      {drill && <DrillPanel drillKey={drill} onClose={() => setDrill(null)}>
        {(drill === "pipeline" || drill === "weighted" || drill === "dealSize") && <div className="rounded-lg border border-border overflow-hidden"><table className="w-full text-xs"><thead><tr className="bg-muted/50"><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Stage</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Value</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Deals</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Avg Deal</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">% of Total</th></tr></thead><tbody className="divide-y divide-border">{pipelineStages.map(s => (<tr key={s.stage}><td className="px-3 py-2 font-medium text-foreground">{s.stage}</td><td className="px-3 py-2 font-mono font-bold text-foreground">${(s.value / 1000).toFixed(0)}K</td><td className="px-3 py-2 font-mono text-foreground">{s.deals}</td><td className="px-3 py-2 font-mono text-muted-foreground">${Math.round(s.value / s.deals / 1000)}K</td><td className="px-3 py-2 font-mono text-muted-foreground">{Math.round((s.value / totalPipeline) * 100)}%</td></tr>))}</tbody></table></div>}
        {drill === "winRate" && <div className="space-y-3"><div className="grid grid-cols-1 md:grid-cols-3 gap-3"><div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Total Deals</p><p className="text-lg font-bold font-mono text-foreground">{pipelineStages.reduce((s, p) => s + p.deals, 0)}</p></div><div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Won</p><p className="text-lg font-bold font-mono text-emerald-600">{pipelineStages[4].deals}</p></div><div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Win Rate</p><p className="text-lg font-bold font-mono text-foreground">{winRate}%</p></div></div><div className="w-full bg-muted/30 rounded-full h-3 overflow-hidden"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${winRate}%` }} /></div></div>}
      </DrillPanel>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pipeline Funnel */}
        <ChartCard title="Pipeline Funnel" subtitle="Deal value by stage">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipelineStages} layout="vertical" barSize={24}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v / 1000}K`} />
                <YAxis type="category" dataKey="stage" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={90} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Pipeline Value" radius={[0, 6, 6, 0]}>
                  {pipelineStages.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Pipeline Trend */}
        <ChartCard title="Pipeline Trend" subtitle="Total pipeline value over 6 months">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MONTHLY_DATA}>
                <defs>
                  <linearGradient id="pipeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS.quaternary} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={COLORS.quaternary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v / 1000}K`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="pipeline" name="Pipeline" stroke={COLORS.quaternary} fill="url(#pipeGrad)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Engagement Hub Activity */}
      <ChartCard title="Active Engagement Sequences" subtitle="Current engagement campaigns and their status">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-2 text-muted-foreground font-medium">Account</th>
                <th className="text-left py-2 px-2 text-muted-foreground font-medium">Sequence</th>
                <th className="text-left py-2 px-2 text-muted-foreground font-medium">Status</th>
                <th className="text-left py-2 px-2 text-muted-foreground font-medium">Opens</th>
                <th className="text-left py-2 px-2 text-muted-foreground font-medium">Progress</th>
                <th className="text-left py-2 px-2 text-muted-foreground font-medium">Next</th>
              </tr>
            </thead>
            <tbody>
              {OUTREACH.map((o, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                  <td className="py-2.5 px-2 font-medium text-foreground">{o.account}</td>
                  <td className="py-2.5 px-2 text-foreground">{o.type}</td>
                  <td className="py-2.5 px-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      o.status === "Active" ? "bg-emerald-100 text-emerald-700" :
                      o.status === "Scheduled" ? "bg-blue-100 text-blue-700" :
                      "bg-slate-100 text-slate-600"
                    }`}>{o.status}</span>
                  </td>
                  <td className="py-2.5 px-2 text-muted-foreground">{o.opens}</td>
                  <td className="py-2.5 px-2 text-muted-foreground">{o.step}</td>
                  <td className="py-2.5 px-2 text-muted-foreground">{o.nextDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}
