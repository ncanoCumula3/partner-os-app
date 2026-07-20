/*
 * ProjectsView — Implementation & Services Project Management
 * Portfolio overview with KPIs, filtering, project list, and drill-down navigation.
 * Warm adaptive "Golden Hour" theme
 */
import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getProjectKPIs, getProjectBudgetPct, getProjectDaysRemaining,
  getProjectElapsedPct,
  projectTypeLabels, projectTypeColors, billingModelLabels,
  projectStatusLabels, projectStatusColors, healthColors,
  taskStatusLabels, taskStatusColors, taskPriorityColors,
  milestoneStatusColors,
  type ServiceProject, type ProjectType, type ProjectStatus, type ProjectHealth,
  type BillingModel, type ProjectTask,
} from "@/lib/projects";
import { useProjects } from "@/contexts/ProjectsContext";
import NewProjectForm from "./NewProjectForm";
import { ACCOUNTS } from "@/lib/data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  FolderKanban, Search, Filter, RotateCcw, ChevronRight, ChevronDown,
  DollarSign, Clock, AlertTriangle, CheckCircle2, TrendingUp, Users,
  Calendar, Target, Briefcase, ArrowUpDown, ArrowUp, ArrowDown,
  BarChart3, CircleDot, Layers, Pause, X, Eye,
} from "lucide-react";

/* ── Helpers ────────────────────────────────────────────────── */

function fmtCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtDateShort(d: string): string {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/* ── Phase Progress Mini Bar ────────────────────────────────── */

function PhaseBar({ phases }: { phases: ServiceProject["phases"] }) {
  return (
    <div className="flex gap-0.5 w-full h-2 rounded-full overflow-hidden bg-muted/50">
      {phases.map((ph) => (
        <div
          key={ph.id}
          className={cn(
            "h-full transition-all",
            ph.status === "completed" ? "bg-emerald-500" :
            ph.status === "in_progress" ? "bg-blue-500" :
            "bg-muted-foreground/15"
          )}
          style={{ flex: 1 }}
          title={`${ph.name}: ${ph.completionPct}%`}
        />
      ))}
    </div>
  );
}

/* ── Budget Bar ─────────────────────────────────────────────── */

function BudgetBar({ consumed, total }: { consumed: number; total: number }) {
  const pct = total > 0 ? Math.round((consumed / total) * 100) : 0;
  const color = pct >= 90 ? "bg-red-500" : pct >= 75 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-muted/50 overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className={cn("text-[10px] font-mono font-semibold", pct >= 90 ? "text-red-600" : pct >= 75 ? "text-amber-600" : "text-emerald-600")}>
        {pct}%
      </span>
    </div>
  );
}

/* ── KPI Card ───────────────────────────────────────────────── */

function KPICard({ icon: Icon, label, value, sub, accent, onClick, isActive }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; accent?: string;
  onClick?: () => void; isActive?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-card rounded-xl border px-4 py-3 flex items-start gap-3 min-w-0 transition-all",
        onClick && "cursor-pointer hover:shadow-md hover:border-primary/40",
        isActive ? "border-primary ring-2 ring-primary/20 shadow-md" : "border-border",
      )}
    >
      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", accent || "bg-primary/10")}>
        <Icon className={cn("w-4.5 h-4.5", accent ? "text-white" : "text-primary")} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
        <p className="text-lg font-bold text-foreground leading-tight">{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
        {onClick && <p className="text-[8px] text-primary/60 font-medium uppercase tracking-wider mt-0.5">Click to drill down</p>}
      </div>
    </div>
  );
}

/* ── Sort Types ─────────────────────────────────────────────── */

type SortKey = "name" | "account" | "health" | "completion" | "budget" | "endDate";
type SortDir = "asc" | "desc";

/* ── Main Component ─────────────────────────────────────────── */

interface ProjectsViewProps {
  onSelectProject?: (projectId: number) => void;
  initialAccountFilter?: number;
}

export default function ProjectsView({ onSelectProject, initialAccountFilter }: ProjectsViewProps) {
  const { projects: allProjects, addProject } = useProjects();
  const [showNewForm, setShowNewForm] = useState(false);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<ProjectType | null>(null);
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | null>(null);
  const [healthFilter, setHealthFilter] = useState<ProjectHealth | null>(null);
  const [accountFilter, setAccountFilter] = useState<number | null>(initialAccountFilter ?? null);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [showFilters, setShowFilters] = useState(false);
  const [drillDownKpi, setDrillDownKpi] = useState<string | null>(null);
  const toggleDrill = (key: string) => setDrillDownKpi(prev => prev === key ? null : key);

  const accountMap = useMemo(() => {
    const m: Record<number, string> = {};
    ACCOUNTS.forEach(a => { m[a.id] = a.name; });
    return m;
  }, []);

  const handleSort = useCallback((key: SortKey) => {
    if (sortKey === key) {
      if (sortDir === "asc") setSortDir("desc");
      else { setSortKey(null); setSortDir("asc"); }
    } else { setSortKey(key); setSortDir("asc"); }
  }, [sortKey, sortDir]);

  const hasAnyFilter = query.trim() || typeFilter || statusFilter || healthFilter || accountFilter || sortKey;

  const clearAll = useCallback(() => {
    setQuery(""); setTypeFilter(null); setStatusFilter(null);
    setHealthFilter(null); setAccountFilter(null);
    setSortKey(null); setSortDir("asc");
  }, []);

  const projects = useMemo(() => {
    let list = [...allProjects];
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        accountMap[p.accountId]?.toLowerCase().includes(q) ||
        p.projectManager.toLowerCase().includes(q) ||
        p.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    if (typeFilter) list = list.filter(p => p.type === typeFilter);
    if (statusFilter) list = list.filter(p => p.status === statusFilter);
    if (healthFilter) list = list.filter(p => p.health === healthFilter);
    if (accountFilter) list = list.filter(p => p.accountId === accountFilter);

    if (sortKey) {
      list.sort((a, b) => {
        let cmp = 0;
        switch (sortKey) {
          case "name": cmp = a.name.localeCompare(b.name); break;
          case "account": cmp = (accountMap[a.accountId] || "").localeCompare(accountMap[b.accountId] || ""); break;
          case "health": {
            const order: Record<ProjectHealth, number> = { off_track: 0, at_risk: 1, on_track: 2 };
            cmp = order[a.health] - order[b.health]; break;
          }
          case "completion": cmp = a.completionPct - b.completionPct; break;
          case "budget": cmp = getProjectBudgetPct(a) - getProjectBudgetPct(b); break;
          case "endDate": cmp = new Date(a.targetEndDate).getTime() - new Date(b.targetEndDate).getTime(); break;
        }
        return sortDir === "desc" ? -cmp : cmp;
      });
    }
    return list;
  }, [query, typeFilter, statusFilter, healthFilter, accountFilter, sortKey, sortDir, accountMap, allProjects]);

  const kpis = useMemo(() => getProjectKPIs(allProjects), [allProjects]);

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown className="w-3 h-3 text-muted-foreground/40" />;
    return sortDir === "asc" ? <ArrowUp className="w-3 h-3 text-primary" /> : <ArrowDown className="w-3 h-3 text-primary" />;
  };

  if (showNewForm) {
    return (
      <NewProjectForm
        onCancel={() => setShowNewForm(false)}
        onSubmit={(data) => {
          const newProject = addProject(data);
          setShowNewForm(false);
          toast.success(`Project "${newProject.name}" created successfully`, {
            description: `ID: PRJ-${newProject.id} · ${projectTypeLabels[newProject.type]} · ${billingModelLabels[newProject.billingModel]}`,
          });
          onSelectProject?.(newProject.id);
        }}
      />
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <FolderKanban className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Projects & Services</h2>
            <p className="text-xs text-muted-foreground">Implementation, enhancement, and consulting project management</p>
          </div>
        </div>
        <button
          onClick={() => setShowNewForm(true)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors"
        >
          + New Project
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        <KPICard icon={Briefcase} label="Active Projects" value={kpis.activeCount} sub={`${kpis.completedCount} completed`} onClick={() => toggleDrill("active")} isActive={drillDownKpi === "active"} />
        <KPICard icon={DollarSign} label="Total Contract Value" value={fmtCurrency(kpis.totalContractValue)} sub={`${fmtCurrency(kpis.totalBudgetConsumed)} consumed`} onClick={() => toggleDrill("contract")} isActive={drillDownKpi === "contract"} />
        <KPICard icon={Target} label="Budget Utilization" value={`${kpis.budgetUtilization}%`} sub={`${fmtCurrency(kpis.totalContractValue - kpis.totalBudgetConsumed)} remaining`} onClick={() => toggleDrill("budget")} isActive={drillDownKpi === "budget"} />
        <KPICard icon={CheckCircle2} label="On Track" value={kpis.onTrack} sub={`${kpis.atRisk} at risk · ${kpis.offTrack} off track`} accent={kpis.offTrack > 0 ? "bg-red-500" : undefined} onClick={() => toggleDrill("track")} isActive={drillDownKpi === "track"} />
        <KPICard icon={Clock} label="Hours Logged" value={kpis.totalHoursLogged.toLocaleString()} sub={`of ${kpis.totalHoursEstimated.toLocaleString()} estimated`} onClick={() => toggleDrill("hours")} isActive={drillDownKpi === "hours"} />
        <KPICard icon={AlertTriangle} label="Overdue Tasks" value={kpis.overdueTasks} sub={`across all projects`} accent={kpis.overdueTasks > 0 ? "bg-amber-500" : undefined} onClick={() => toggleDrill("overdue")} isActive={drillDownKpi === "overdue"} />
      </div>

      {/* ── Projects Drill-Down Panel ── */}
      <AnimatePresence mode="wait">
        {drillDownKpi && (
          <motion.div key={drillDownKpi} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden mb-5">
            <div className="rounded-xl border border-primary/20 bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  {drillDownKpi === "active" && <><Briefcase className="w-4 h-4 text-primary" /> Active Projects — Details</>}
                  {drillDownKpi === "contract" && <><DollarSign className="w-4 h-4 text-primary" /> Contract Value — Breakdown</>}
                  {drillDownKpi === "budget" && <><Target className="w-4 h-4 text-primary" /> Budget Utilization — Per Project</>}
                  {drillDownKpi === "track" && <><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Project Health — Status</>}
                  {drillDownKpi === "hours" && <><Clock className="w-4 h-4 text-primary" /> Hours Logged — Breakdown</>}
                  {drillDownKpi === "overdue" && <><AlertTriangle className="w-4 h-4 text-amber-600" /> Overdue Tasks — Details</>}
                </h3>
                <button onClick={() => setDrillDownKpi(null)} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-muted transition-colors">Close</button>
              </div>

              {/* Active Projects */}
              {drillDownKpi === "active" && (
                <div className="space-y-3">
                  <div className="rounded-lg border border-border overflow-hidden"><table className="w-full text-xs"><thead><tr className="bg-muted/50"><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Project</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Account</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Type</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Status</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Health</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Completion</th></tr></thead><tbody className="divide-y divide-border">{allProjects.filter(p => p.status === "in_progress" || p.status === "planning").map(p => (<tr key={p.id}><td className="px-3 py-2 font-medium text-foreground">{p.name}</td><td className="px-3 py-2 text-muted-foreground">{accountMap[p.accountId] || "—"}</td><td className="px-3 py-2"><span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", projectTypeColors[p.type])}>{projectTypeLabels[p.type]}</span></td><td className="px-3 py-2"><span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", projectStatusColors[p.status])}>{p.status}</span></td><td className="px-3 py-2"><span className={cn("font-medium", healthColors[p.health]?.text)}>{p.health}</span></td><td className="px-3 py-2 font-mono text-foreground">{p.completionPct}%</td></tr>))}</tbody></table></div>
                </div>
              )}

              {/* Contract Value */}
              {drillDownKpi === "contract" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Total Value</p><p className="text-lg font-bold font-mono text-foreground">{fmtCurrency(kpis.totalContractValue)}</p></div>
                    <div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Consumed</p><p className="text-lg font-bold font-mono text-amber-600">{fmtCurrency(kpis.totalBudgetConsumed)}</p></div>
                    <div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Remaining</p><p className="text-lg font-bold font-mono text-emerald-600">{fmtCurrency(kpis.totalContractValue - kpis.totalBudgetConsumed)}</p></div>
                  </div>
                  <div className="rounded-lg border border-border overflow-hidden"><table className="w-full text-xs"><thead><tr className="bg-muted/50"><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Project</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Contract Value</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Consumed</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Billing</th></tr></thead><tbody className="divide-y divide-border">{allProjects.sort((a, b) => b.contractValue - a.contractValue).map(p => (<tr key={p.id}><td className="px-3 py-2 font-medium text-foreground">{p.name}</td><td className="px-3 py-2 font-mono text-foreground">{fmtCurrency(p.contractValue)}</td><td className="px-3 py-2 font-mono text-muted-foreground">{fmtCurrency(p.budgetConsumed)}</td><td className="px-3 py-2 text-muted-foreground">{billingModelLabels[p.billingModel]}</td></tr>))}</tbody></table></div>
                </div>
              )}

              {/* Budget Utilization */}
              {drillDownKpi === "budget" && (
                <div className="space-y-3">
                  <div className="rounded-lg border border-border overflow-hidden"><table className="w-full text-xs"><thead><tr className="bg-muted/50"><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Project</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Budget %</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Consumed</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Total</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Bar</th></tr></thead><tbody className="divide-y divide-border">{allProjects.map(p => { const pct = getProjectBudgetPct(p); return (<tr key={p.id}><td className="px-3 py-2 font-medium text-foreground">{p.name}</td><td className="px-3 py-2 font-mono font-medium"><span className={cn(pct > 90 ? "text-red-600" : pct > 70 ? "text-amber-600" : "text-emerald-600")}>{pct}%</span></td><td className="px-3 py-2 font-mono text-muted-foreground">{fmtCurrency(p.budgetConsumed)}</td><td className="px-3 py-2 font-mono text-foreground">{fmtCurrency(p.contractValue)}</td><td className="px-3 py-2"><div className="h-2 bg-muted/30 rounded-full overflow-hidden w-24"><div className={cn("h-full rounded-full", pct > 90 ? "bg-red-500" : pct > 70 ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${Math.min(pct, 100)}%` }} /></div></td></tr>); })}</tbody></table></div>
                </div>
              )}

              {/* On Track */}
              {drillDownKpi === "track" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">On Track</p><p className="text-lg font-bold font-mono text-emerald-600">{kpis.onTrack}</p></div>
                    <div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">At Risk</p><p className="text-lg font-bold font-mono text-amber-600">{kpis.atRisk}</p></div>
                    <div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Off Track</p><p className="text-lg font-bold font-mono text-red-600">{kpis.offTrack}</p></div>
                  </div>
                  <div className="rounded-lg border border-border overflow-hidden"><table className="w-full text-xs"><thead><tr className="bg-muted/50"><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Project</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Health</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Completion</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Days Left</th></tr></thead><tbody className="divide-y divide-border">{allProjects.filter(p => p.status === "in_progress" || p.status === "planning").map(p => (<tr key={p.id}><td className="px-3 py-2 font-medium text-foreground">{p.name}</td><td className="px-3 py-2"><span className={cn("font-medium", healthColors[p.health]?.text)}>{p.health}</span></td><td className="px-3 py-2 font-mono text-foreground">{p.completionPct}%</td><td className="px-3 py-2 font-mono text-muted-foreground">{getProjectDaysRemaining(p)}d</td></tr>))}</tbody></table></div>
                </div>
              )}

              {/* Hours Logged */}
              {drillDownKpi === "hours" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Total Logged</p><p className="text-lg font-bold font-mono text-foreground">{kpis.totalHoursLogged.toLocaleString()}h</p></div>
                    <div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Estimated</p><p className="text-lg font-bold font-mono text-foreground">{kpis.totalHoursEstimated.toLocaleString()}h</p></div>
                    <div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Utilization</p><p className="text-lg font-bold font-mono text-foreground">{kpis.totalHoursEstimated > 0 ? ((kpis.totalHoursLogged / kpis.totalHoursEstimated) * 100).toFixed(0) : 0}%</p></div>
                  </div>
                  <div className="rounded-lg border border-border overflow-hidden"><table className="w-full text-xs"><thead><tr className="bg-muted/50"><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Project</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Logged</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Estimated</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">%</th></tr></thead><tbody className="divide-y divide-border">{allProjects.map(p => (<tr key={p.id}><td className="px-3 py-2 font-medium text-foreground">{p.name}</td><td className="px-3 py-2 font-mono text-foreground">{p.hoursLogged}h</td><td className="px-3 py-2 font-mono text-muted-foreground">{p.hoursEstimated}h</td><td className="px-3 py-2 font-mono"><span className={cn(p.hoursEstimated > 0 && (p.hoursLogged / p.hoursEstimated) > 0.9 ? "text-red-600" : "text-foreground")}>{p.hoursEstimated > 0 ? ((p.hoursLogged / p.hoursEstimated) * 100).toFixed(0) : 0}%</span></td></tr>))}</tbody></table></div>
                </div>
              )}

              {/* Overdue Tasks */}
              {drillDownKpi === "overdue" && (
                <div className="space-y-3">
                  <div className="rounded-lg bg-amber-50/50 border border-amber-200 p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-amber-700">{kpis.overdueTasks} Overdue Tasks</p>
                        <p className="text-xs text-amber-600 mt-1">Tasks past their due date across all active projects. Review and reassign as needed.</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border overflow-hidden"><table className="w-full text-xs"><thead><tr className="bg-muted/50"><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Project</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Account</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Status</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Health</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Completion</th></tr></thead><tbody className="divide-y divide-border">{allProjects.filter(p => (p.status === "in_progress" || p.status === "planning") && p.health === "off_track").map(p => (<tr key={p.id}><td className="px-3 py-2 font-medium text-foreground">{p.name}</td><td className="px-3 py-2 text-muted-foreground">{accountMap[p.accountId] || "—"}</td><td className="px-3 py-2"><span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", projectStatusColors[p.status])}>{p.status}</span></td><td className="px-3 py-2"><span className={cn("font-medium", healthColors[p.health]?.text)}>{p.health}</span></td><td className="px-3 py-2 font-mono text-foreground">{p.completionPct}%</td></tr>))}</tbody></table></div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search & Filters */}
      <div className="bg-card rounded-xl border border-border mb-5">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2 flex-1 bg-muted/50 rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search projects, accounts, managers, tags..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors",
              showFilters ? "bg-primary/10 text-primary" : "bg-muted/50 text-muted-foreground hover:text-foreground"
            )}
          >
            <Filter className="w-3.5 h-3.5" /> Filters
            {(typeFilter || statusFilter || healthFilter || accountFilter) && (
              <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] flex items-center justify-center font-bold">
                {[typeFilter, statusFilter, healthFilter, accountFilter].filter(Boolean).length}
              </span>
            )}
          </button>
          {hasAnyFilter && (
            <button onClick={clearAll} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <RotateCcw className="w-3 h-3" /> Clear
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-4 py-3 flex flex-wrap gap-4 border-b border-border">
                {/* Type Filter */}
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-medium">Type</p>
                  <div className="flex gap-1.5">
                    {(["implementation", "enhancement", "migration", "consulting"] as ProjectType[]).map(t => (
                      <button
                        key={t}
                        onClick={() => setTypeFilter(typeFilter === t ? null : t)}
                        className={cn(
                          "text-[10px] px-2 py-1 rounded-md border font-medium transition-colors",
                          typeFilter === t
                            ? `${projectTypeColors[t].bg} ${projectTypeColors[t].text} ${projectTypeColors[t].border}`
                            : "bg-muted/30 text-muted-foreground border-transparent hover:bg-muted/60"
                        )}
                      >
                        {projectTypeLabels[t]}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Status Filter */}
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-medium">Status</p>
                  <div className="flex gap-1.5">
                    {(["planning", "in_progress", "on_hold", "completed"] as ProjectStatus[]).map(s => (
                      <button
                        key={s}
                        onClick={() => setStatusFilter(statusFilter === s ? null : s)}
                        className={cn(
                          "text-[10px] px-2 py-1 rounded-md border font-medium transition-colors flex items-center gap-1",
                          statusFilter === s
                            ? `${projectStatusColors[s].bg} ${projectStatusColors[s].text} border-current/20`
                            : "bg-muted/30 text-muted-foreground border-transparent hover:bg-muted/60"
                        )}
                      >
                        <div className={cn("w-1.5 h-1.5 rounded-full", projectStatusColors[s].dot)} />
                        {projectStatusLabels[s]}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Health Filter */}
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-medium">Health</p>
                  <div className="flex gap-1.5">
                    {(["on_track", "at_risk", "off_track"] as ProjectHealth[]).map(h => (
                      <button
                        key={h}
                        onClick={() => setHealthFilter(healthFilter === h ? null : h)}
                        className={cn(
                          "text-[10px] px-2 py-1 rounded-md border font-medium transition-colors flex items-center gap-1",
                          healthFilter === h
                            ? `${healthColors[h].bg} ${healthColors[h].text} border-current/20`
                            : "bg-muted/30 text-muted-foreground border-transparent hover:bg-muted/60"
                        )}
                      >
                        <div className={cn("w-1.5 h-1.5 rounded-full", healthColors[h].dot)} />
                        {healthColors[h].label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Account Filter */}
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-medium">Account</p>
                  <select
                    value={accountFilter ?? ""}
                    onChange={e => setAccountFilter(e.target.value ? Number(e.target.value) : null)}
                    className="text-[11px] px-2 py-1 rounded-md border border-border bg-card text-foreground"
                  >
                    <option value="">All Accounts</option>
                    {ACCOUNTS.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Column Headers */}
        <div className="grid grid-cols-[2fr_1.2fr_0.8fr_0.6fr_1fr_1fr_0.8fr_0.3fr] gap-3 px-5 py-2.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium border-b border-border">
          <button onClick={() => handleSort("name")} className="flex items-center gap-1 hover:text-foreground transition-colors text-left">
            Project <SortIcon k="name" />
          </button>
          <button onClick={() => handleSort("account")} className="flex items-center gap-1 hover:text-foreground transition-colors text-left">
            Account <SortIcon k="account" />
          </button>
          <span>Type / Billing</span>
          <button onClick={() => handleSort("health")} className="flex items-center gap-1 hover:text-foreground transition-colors text-left">
            Health <SortIcon k="health" />
          </button>
          <button onClick={() => handleSort("completion")} className="flex items-center gap-1 hover:text-foreground transition-colors text-left">
            Progress <SortIcon k="completion" />
          </button>
          <button onClick={() => handleSort("budget")} className="flex items-center gap-1 hover:text-foreground transition-colors text-left">
            Budget <SortIcon k="budget" />
          </button>
          <button onClick={() => handleSort("endDate")} className="flex items-center gap-1 hover:text-foreground transition-colors text-left">
            Timeline <SortIcon k="endDate" />
          </button>
          <span />
        </div>

        {/* Project Rows */}
        <AnimatePresence mode="popLayout">
          {projects.map((p, i) => {
            const daysLeft = getProjectDaysRemaining(p);
            const budgetPct = getProjectBudgetPct(p);
            const doneTasks = p.tasks.filter(t => t.status === "done").length;
            const blockedTasks = p.tasks.filter(t => t.status === "blocked").length;
            const hc = healthColors[p.health];
            const sc = projectStatusColors[p.status];

            return (
              <motion.div
                key={p.id}
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8, height: 0, paddingTop: 0, paddingBottom: 0 }}
                transition={{ duration: 0.2, delay: i * 0.03 }}
                onClick={() => onSelectProject?.(p.id)}
                className="grid grid-cols-[2fr_1.2fr_0.8fr_0.6fr_1fr_1fr_0.8fr_0.3fr] gap-3 px-5 py-3.5 items-center border-b border-border last:border-0 hover:bg-primary/[0.04] transition-all cursor-pointer group"
              >
                {/* Project Name & PM */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0", sc.bg, sc.text)}>
                      {p.status === "completed" ? <CheckCircle2 className="w-3.5 h-3.5" /> :
                       p.status === "on_hold" ? <Pause className="w-3.5 h-3.5" /> :
                       <Layers className="w-3.5 h-3.5" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                        {p.name}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-0.5">
                          <Users className="w-3 h-3" /> {p.projectManager}
                        </span>
                        <span>·</span>
                        <span>{p.platform}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Account */}
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{accountMap[p.accountId]}</p>
                  <p className="text-[10px] text-muted-foreground">{doneTasks}/{p.tasks.length} tasks done</p>
                </div>

                {/* Type & Billing */}
                <div className="flex flex-col gap-1">
                  <span className={cn("text-[9px] px-1.5 py-0.5 rounded border font-medium w-fit", projectTypeColors[p.type].bg, projectTypeColors[p.type].text, projectTypeColors[p.type].border)}>
                    {projectTypeLabels[p.type]}
                  </span>
                  <span className="text-[9px] text-muted-foreground">{billingModelLabels[p.billingModel]}</span>
                </div>

                {/* Health */}
                <div className="flex items-center gap-1.5">
                  <div className={cn("w-2 h-2 rounded-full shrink-0", hc.dot, p.health === "off_track" && "animate-pulse")} />
                  <span className={cn("text-[11px] font-semibold", hc.text)}>{hc.label}</span>
                </div>

                {/* Progress */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono font-semibold text-foreground">{p.completionPct}%</span>
                    {blockedTasks > 0 && (
                      <span className="text-[9px] text-red-600 font-medium">{blockedTasks} blocked</span>
                    )}
                  </div>
                  <PhaseBar phases={p.phases} />
                </div>

                {/* Budget */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-mono font-semibold text-foreground">{fmtCurrency(p.budgetConsumed)}</span>
                    <span className="text-[10px] text-muted-foreground">/ {fmtCurrency(p.contractValue)}</span>
                  </div>
                  <BudgetBar consumed={p.budgetConsumed} total={p.contractValue} />
                </div>

                {/* Timeline */}
                <div>
                  <p className="text-[11px] font-mono font-semibold text-foreground">
                    {p.status === "completed" ? "Completed" : daysLeft > 0 ? `${daysLeft}d left` : `${Math.abs(daysLeft)}d over`}
                  </p>
                  <p className="text-[9px] text-muted-foreground">
                    {fmtDateShort(p.startDate)} → {fmtDateShort(p.targetEndDate)}
                  </p>
                </div>

                {/* Arrow */}
                <div className="flex items-center justify-end">
                  <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Empty State */}
        {projects.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-12 text-center">
            <Search className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No projects match your filters</p>
            <button onClick={clearAll} className="mt-3 text-xs text-primary hover:text-primary/80 transition-colors font-medium">
              Clear all filters
            </button>
          </motion.div>
        )}
      </div>
    </>
  );
}
