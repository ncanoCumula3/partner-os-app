/*
 * PipelineView -- Enhanced sales force automation with Board, List, and Forecast views.
 * Drag-and-drop stage management with stage-change modal, comprehensive KPIs, and deal drill-down.
 */
import { useState, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePipeline } from "@/contexts/PipelineContext";
import {
  DEAL_STAGES, dealTypeColors, forecastCategoryColors,
  getPipelineKPIs, getForecastData, getDaysInStage, getWeightedValue,
  getStageConversionRates, getAvgTimePerStage, getWinLossAnalysis, getPipelineVelocity,
  type Deal, type DealStage, type ForecastCategory,
} from "@/lib/pipeline";
import { ACCOUNTS } from "@/lib/data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import NewDealWizard from "@/components/views/NewDealWizard";
import {
  DollarSign, TrendingUp, Target, BarChart3, Clock, Users, Filter,
  Search, ChevronRight, GripVertical, ArrowUpDown, LayoutGrid, List,
  PieChart, Plus, X, AlertTriangle, CheckCircle2, XCircle,
  Calendar, Percent, Building2, ArrowRight, MessageSquare,
} from "lucide-react";

type ViewMode = "board" | "list" | "forecast";

/* ---- Stage Change Modal ---- */
function StageChangeModal({
  deal, toStage, onConfirm, onCancel,
}: {
  deal: Deal; toStage: DealStage;
  onConfirm: (reason: string, notes: string, nextSteps: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [nextSteps, setNextSteps] = useState("");
  const fromConfig = DEAL_STAGES.find(s => s.name === deal.stage);
  const toConfig = DEAL_STAGES.find(s => s.name === toStage);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onCancel}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg mx-4 rounded-2xl border border-border bg-card shadow-xl overflow-hidden"
      >
        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-foreground">Move Deal Stage</h3>
            <button onClick={onCancel} className="p-1 rounded-lg hover:bg-muted transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Stage transition visual */}
          <div className="flex items-center justify-center gap-4 py-3">
            <div className="text-center">
              <div className={cn("w-10 h-10 rounded-full mx-auto mb-1.5 flex items-center justify-center", fromConfig?.dot)} >
                <span className="text-white text-xs font-bold">{deal.probability}%</span>
              </div>
              <span className="text-xs font-medium text-muted-foreground">{deal.stage}</span>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground" />
            <div className="text-center">
              <div className={cn("w-10 h-10 rounded-full mx-auto mb-1.5 flex items-center justify-center", toConfig?.dot)} >
                <span className="text-white text-xs font-bold">{toConfig?.probability}%</span>
              </div>
              <span className="text-xs font-medium text-foreground">{toStage}</span>
            </div>
          </div>

          <div className="text-center text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{deal.name}</span> - {deal.accountName}
          </div>

          {/* Form fields */}
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Reason for stage change *</label>
              <input
                value={reason} onChange={e => setReason(e.target.value)}
                placeholder="e.g., Budget approved, proposal accepted..."
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Notes</label>
              <textarea
                value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Additional context about this transition..."
                rows={3}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Next Steps</label>
              <input
                value={nextSteps} onChange={e => setNextSteps(e.target.value)}
                placeholder="e.g., Schedule demo, send contract..."
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          {(toStage === "Closed Lost") && (
            <div className="rounded-lg border border-red-200 bg-red-50/50 p-3">
              <div className="flex items-center gap-2 text-red-700 text-xs font-medium">
                <AlertTriangle className="w-3.5 h-3.5" />
                This will mark the deal as lost. This action can be reversed by moving it back to an active stage.
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button onClick={onCancel} className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
              Cancel
            </button>
            <button
              onClick={() => { if (reason.trim()) onConfirm(reason, notes, nextSteps); else toast.error("Please provide a reason for the stage change"); }}
              className="px-5 py-2 text-xs font-semibold text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
            >
              Confirm Move
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}


/* ---- Main PipelineView ---- */
export default function PipelineView({ onSelectDeal }: { onSelectDeal?: (id: number) => void }) {
  const { deals, changeDealStage, addDeal } = usePipeline();
  const [viewMode, setViewMode] = useState<ViewMode>("board");
  const [search, setSearch] = useState("");
  const [filterStage, setFilterStage] = useState<DealStage | "all">("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"value" | "date" | "probability" | "daysInStage">("value");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [showNewDeal, setShowNewDeal] = useState(false);
  const [stageChangeTarget, setStageChangeTarget] = useState<{ deal: Deal; toStage: DealStage } | null>(null);
  const [drillDownKpi, setDrillDownKpi] = useState<string | null>(null);
  const toggleDrill = (key: string) => setDrillDownKpi(prev => prev === key ? null : key);

  // Drag state
  const dragDealRef = useRef<number | null>(null);
  const [dragOverStage, setDragOverStage] = useState<DealStage | null>(null);

  const kpis = useMemo(() => getPipelineKPIs(deals), [deals]);
  const forecast = useMemo(() => getForecastData(deals), [deals]);
  const conversionRates = useMemo(() => getStageConversionRates(deals), [deals]);
  const stageTime = useMemo(() => getAvgTimePerStage(deals), [deals]);
  const winLoss = useMemo(() => getWinLossAnalysis(deals), [deals]);
  const velocity = useMemo(() => getPipelineVelocity(deals), [deals]);

  const filteredDeals = useMemo(() => {
    let result = [...deals];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(d => d.name.toLowerCase().includes(q) || d.accountName.toLowerCase().includes(q) || d.owner.toLowerCase().includes(q));
    }
    if (filterStage !== "all") result = result.filter(d => d.stage === filterStage);
    if (filterType !== "all") result = result.filter(d => d.type === filterType);
    result.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "value") cmp = a.value - b.value;
      else if (sortBy === "date") cmp = new Date(a.expectedCloseDate).getTime() - new Date(b.expectedCloseDate).getTime();
      else if (sortBy === "probability") cmp = a.probability - b.probability;
      else cmp = getDaysInStage(a) - getDaysInStage(b);
      return sortDir === "desc" ? -cmp : cmp;
    });
    return result;
  }, [deals, search, filterStage, filterType, sortBy, sortDir]);

  const handleStageChangeConfirm = useCallback((reason: string, notes: string, nextSteps: string) => {
    if (!stageChangeTarget) return;
    changeDealStage(stageChangeTarget.deal.id, stageChangeTarget.toStage, reason, notes, nextSteps, "Jordan Davis");
    toast.success(`Deal moved to ${stageChangeTarget.toStage}`, { description: `${stageChangeTarget.deal.name} - ${reason}` });
    setStageChangeTarget(null);
  }, [stageChangeTarget, changeDealStage]);

  const handleNewDeal = useCallback((data: Omit<Deal, "id">) => {
    const deal = addDeal(data);
    toast.success("Deal created", { description: `${deal.name} added to ${deal.stage}` });
    setShowNewDeal(false);
    // Auto-navigate to the new deal detail
    onSelectDeal?.(deal.id);
  }, [addDeal, onSelectDeal]);

  const fmt = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K` : `$${n}`;

  const openStages = DEAL_STAGES.filter(s => s.name !== "Closed Won" && s.name !== "Closed Lost");

  // If wizard is open, render it as a full-page replacement
  if (showNewDeal) {
    return <NewDealWizard onSubmit={handleNewDeal} onCancel={() => setShowNewDeal(false)} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Pipeline</h2>
          <p className="text-xs text-muted-foreground mt-1">
            {kpis.openCount} open deals - {fmt(kpis.totalPipeline)} total pipeline - {fmt(kpis.weightedPipeline)} weighted
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center rounded-lg border border-border bg-card overflow-hidden">
            {([["board", LayoutGrid], ["list", List], ["forecast", PieChart]] as [ViewMode, any][]).map(([mode, Icon]) => (
              <button key={mode} onClick={() => setViewMode(mode)}
                className={cn("px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5",
                  viewMode === mode ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground hover:bg-muted/50")}>
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline capitalize">{mode}</span>
              </button>
            ))}
          </div>
          <button onClick={() => setShowNewDeal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors">
            <Plus className="w-3.5 h-3.5" /> New Deal
          </button>
        </div>
      </motion.div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Total Pipeline", value: fmt(kpis.totalPipeline), icon: DollarSign, color: "text-foreground", key: "totalPipeline" },
          { label: "Weighted Value", value: fmt(kpis.weightedPipeline), icon: TrendingUp, color: "text-primary", key: "weighted" },
          { label: "Avg Deal Size", value: fmt(kpis.avgDealSize), icon: Target, color: "text-foreground", key: "avgDeal" },
          { label: "Win Rate", value: `${kpis.winRate.toFixed(0)}%`, icon: CheckCircle2, color: "text-emerald-600", key: "winRate" },
          { label: "Avg Sales Cycle", value: `${kpis.avgSalesCycle.toFixed(0)}d`, icon: Clock, color: "text-foreground", key: "cycle" },
          { label: "Closing This Month", value: `${kpis.closingThisMonth}`, icon: Calendar, color: "text-amber-600", key: "closing" },
        ].map((k, i) => {
          const isActive = drillDownKpi === k.key;
          return (
            <motion.button key={k.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              onClick={() => toggleDrill(k.key)}
              className={cn("rounded-xl border bg-card p-3 text-left transition-all cursor-pointer hover:shadow-md hover:border-primary/40",
                isActive ? "border-primary ring-2 ring-primary/20 shadow-md" : "border-border")}>
              <div className="flex items-center gap-2 mb-1">
                <k.icon className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[10px] tracking-[0.08em] text-muted-foreground font-medium uppercase">{k.label}</span>
              </div>
              <div className={cn("text-lg font-bold font-mono", k.color)}>{k.value}</div>
              <p className="text-[8px] text-primary/60 font-medium uppercase tracking-wider mt-1">Click to drill down</p>
            </motion.button>
          );
        })}
      </div>

      {/* ── Pipeline Drill-Down Panel ── */}
      <AnimatePresence mode="wait">
        {drillDownKpi && (
          <motion.div key={drillDownKpi} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
            <div className="rounded-xl border border-primary/20 bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  {drillDownKpi === "totalPipeline" && <><DollarSign className="w-4 h-4 text-primary" /> Total Pipeline — Deal Breakdown</>}
                  {drillDownKpi === "weighted" && <><TrendingUp className="w-4 h-4 text-primary" /> Weighted Value — Probability-Adjusted</>}
                  {drillDownKpi === "avgDeal" && <><Target className="w-4 h-4 text-primary" /> Avg Deal Size — Distribution</>}
                  {drillDownKpi === "winRate" && <><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Win Rate — Win/Loss Analysis</>}
                  {drillDownKpi === "cycle" && <><Clock className="w-4 h-4 text-primary" /> Sales Cycle — Stage Timing</>}
                  {drillDownKpi === "closing" && <><Calendar className="w-4 h-4 text-amber-600" /> Closing This Month — Deals</>}
                </h3>
                <button onClick={() => setDrillDownKpi(null)} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-muted transition-colors">Close</button>
              </div>

              {/* Total Pipeline */}
              {drillDownKpi === "totalPipeline" && (() => {
                const open = deals.filter(d => d.stage !== "Closed Won" && d.stage !== "Closed Lost");
                return (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Open Deals</p><p className="text-lg font-bold font-mono text-foreground">{open.length}</p></div>
                      <div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Total Value</p><p className="text-lg font-bold font-mono text-foreground">{fmt(kpis.totalPipeline)}</p></div>
                      <div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Weighted</p><p className="text-lg font-bold font-mono text-primary">{fmt(kpis.weightedPipeline)}</p></div>
                    </div>
                    <div className="rounded-lg border border-border overflow-hidden"><table className="w-full text-xs"><thead><tr className="bg-muted/50"><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Deal</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Account</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Stage</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Value</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Prob</th></tr></thead><tbody className="divide-y divide-border">{open.sort((a, b) => b.value - a.value).map(d => (<tr key={d.id}><td className="px-3 py-2 font-medium text-foreground">{d.name}</td><td className="px-3 py-2 text-muted-foreground">{d.accountName}</td><td className="px-3 py-2"><span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", DEAL_STAGES.find(s => s.name === d.stage)?.dot, "text-white")}>{d.stage}</span></td><td className="px-3 py-2 font-mono font-medium text-foreground">{fmt(d.value)}</td><td className="px-3 py-2 font-mono text-muted-foreground">{d.probability}%</td></tr>))}</tbody></table></div>
                  </div>
                );
              })()}

              {/* Weighted Value */}
              {drillDownKpi === "weighted" && (() => {
                const open = deals.filter(d => d.stage !== "Closed Won" && d.stage !== "Closed Lost");
                return (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-border overflow-hidden"><table className="w-full text-xs"><thead><tr className="bg-muted/50"><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Deal</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Value</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Prob</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Weighted</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Forecast</th></tr></thead><tbody className="divide-y divide-border">{open.sort((a, b) => getWeightedValue(b) - getWeightedValue(a)).map(d => (<tr key={d.id}><td className="px-3 py-2 font-medium text-foreground">{d.name}</td><td className="px-3 py-2 font-mono text-foreground">{fmt(d.value)}</td><td className="px-3 py-2 font-mono text-muted-foreground">{d.probability}%</td><td className="px-3 py-2 font-mono font-medium text-primary">{fmt(getWeightedValue(d))}</td><td className="px-3 py-2"><span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", forecastCategoryColors[d.forecastCategory])}>{d.forecastCategory}</span></td></tr>))}</tbody></table></div>
                  </div>
                );
              })()}

              {/* Avg Deal Size */}
              {drillDownKpi === "avgDeal" && (() => {
                const open = deals.filter(d => d.stage !== "Closed Won" && d.stage !== "Closed Lost");
                const byType = ["New Business", "Upsell", "Cross-sell", "Renewal", "Expansion"].map(t => ({ type: t, deals: open.filter(d => d.type === t), avg: open.filter(d => d.type === t).length > 0 ? open.filter(d => d.type === t).reduce((s, d) => s + d.value, 0) / open.filter(d => d.type === t).length : 0 })).filter(t => t.deals.length > 0);
                return (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Overall Avg</p><p className="text-lg font-bold font-mono text-foreground">{fmt(kpis.avgDealSize)}</p></div>
                      <div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Largest Deal</p><p className="text-lg font-bold font-mono text-foreground">{open.length > 0 ? fmt(Math.max(...open.map(d => d.value))) : "—"}</p></div>
                      <div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Smallest Deal</p><p className="text-lg font-bold font-mono text-foreground">{open.length > 0 ? fmt(Math.min(...open.map(d => d.value))) : "—"}</p></div>
                    </div>
                    <div className="rounded-lg border border-border overflow-hidden"><table className="w-full text-xs"><thead><tr className="bg-muted/50"><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Deal Type</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Count</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Avg Size</th></tr></thead><tbody className="divide-y divide-border">{byType.map(t => (<tr key={t.type}><td className="px-3 py-2 font-medium text-foreground">{t.type}</td><td className="px-3 py-2 font-mono text-muted-foreground">{t.deals.length}</td><td className="px-3 py-2 font-mono font-medium text-foreground">{fmt(t.avg)}</td></tr>))}</tbody></table></div>
                  </div>
                );
              })()}

              {/* Win Rate */}
              {drillDownKpi === "winRate" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Win Rate</p><p className="text-lg font-bold font-mono text-emerald-600">{winLoss.winRate.toFixed(0)}%</p></div>
                    <div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Won</p><p className="text-lg font-bold font-mono text-emerald-600">{winLoss.won}</p></div>
                    <div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Lost</p><p className="text-lg font-bold font-mono text-red-600">{winLoss.lost}</p></div>
                    <div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Avg Won Value</p><p className="text-lg font-bold font-mono text-foreground">{fmt(winLoss.avgWonValue)}</p></div>
                  </div>
                  {winLoss.byType.length > 0 && (
                    <div className="rounded-lg border border-border overflow-hidden"><table className="w-full text-xs"><thead><tr className="bg-muted/50"><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Deal Type</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Win Rate</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Won</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Lost</th></tr></thead><tbody className="divide-y divide-border">{winLoss.byType.map(t => (<tr key={t.type}><td className="px-3 py-2 font-medium text-foreground">{t.type}</td><td className="px-3 py-2 font-mono font-medium"><span className={cn(t.rate >= 50 ? "text-emerald-600" : t.rate >= 25 ? "text-amber-600" : "text-red-500")}>{t.rate.toFixed(0)}%</span></td><td className="px-3 py-2 font-mono text-emerald-600">{t.won}</td><td className="px-3 py-2 font-mono text-red-500">{t.lost}</td></tr>))}</tbody></table></div>
                  )}
                </div>
              )}

              {/* Avg Sales Cycle */}
              {drillDownKpi === "cycle" && (
                <div className="space-y-3">
                  <div className="rounded-lg border border-border overflow-hidden"><table className="w-full text-xs"><thead><tr className="bg-muted/50"><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Stage</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Avg Days</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Deals</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Progress</th></tr></thead><tbody className="divide-y divide-border">{stageTime.map(st => { const maxDays = Math.max(...stageTime.map(s => s.avgDays), 1); return (<tr key={st.stage}><td className="px-3 py-2 font-medium text-foreground flex items-center gap-2"><span className={cn("w-2.5 h-2.5 rounded-full inline-block", DEAL_STAGES.find(s => s.name === st.stage)?.dot || "bg-muted")} />{st.stage}</td><td className="px-3 py-2 font-mono font-medium text-foreground">{st.avgDays}d</td><td className="px-3 py-2 font-mono text-muted-foreground">{st.dealCount}</td><td className="px-3 py-2"><div className="h-2 bg-muted/30 rounded-full overflow-hidden w-24"><div className={cn("h-full rounded-full", DEAL_STAGES.find(s => s.name === st.stage)?.dot || "bg-primary")} style={{ width: `${Math.max((st.avgDays / maxDays) * 100, 5)}%` }} /></div></td></tr>); })}</tbody></table></div>
                  <div className="rounded-lg bg-muted/50 p-3 flex items-center justify-between"><span className="text-[10px] text-muted-foreground uppercase font-medium">Total Avg. Sales Cycle</span><span className="text-sm font-bold font-mono text-primary">{Math.round(kpis.avgSalesCycle)}d</span></div>
                </div>
              )}

              {/* Closing This Month */}
              {drillDownKpi === "closing" && (() => {
                const closingDeals = deals.filter(d => { const c = new Date(d.expectedCloseDate); const n = new Date(); return d.stage !== "Closed Won" && d.stage !== "Closed Lost" && c.getMonth() === n.getMonth() && c.getFullYear() === n.getFullYear(); });
                return (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Deals Closing</p><p className="text-lg font-bold font-mono text-foreground">{closingDeals.length}</p></div>
                      <div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Total Value</p><p className="text-lg font-bold font-mono text-foreground">{fmt(closingDeals.reduce((s, d) => s + d.value, 0))}</p></div>
                      <div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Weighted</p><p className="text-lg font-bold font-mono text-primary">{fmt(closingDeals.reduce((s, d) => s + getWeightedValue(d), 0))}</p></div>
                    </div>
                    {closingDeals.length > 0 ? (
                      <div className="rounded-lg border border-border overflow-hidden"><table className="w-full text-xs"><thead><tr className="bg-muted/50"><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Deal</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Account</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Value</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Close Date</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Stage</th></tr></thead><tbody className="divide-y divide-border">{closingDeals.sort((a, b) => b.value - a.value).map(d => (<tr key={d.id}><td className="px-3 py-2 font-medium text-foreground">{d.name}</td><td className="px-3 py-2 text-muted-foreground">{d.accountName}</td><td className="px-3 py-2 font-mono font-medium text-foreground">{fmt(d.value)}</td><td className="px-3 py-2 text-muted-foreground">{new Date(d.expectedCloseDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td><td className="px-3 py-2"><span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", DEAL_STAGES.find(s => s.name === d.stage)?.dot, "text-white")}>{d.stage}</span></td></tr>))}</tbody></table></div>
                    ) : <p className="text-xs text-muted-foreground">No deals expected to close this month.</p>}
                  </div>
                );
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search deals..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <select value={filterStage} onChange={e => setFilterStage(e.target.value as any)}
          className="rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
          <option value="all">All Stages</option>
          {DEAL_STAGES.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
          <option value="all">All Types</option>
          {["New Business", "Upsell", "Cross-sell", "Renewal", "Expansion"].map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        {viewMode === "list" && (
          <button onClick={() => setSortDir(d => d === "asc" ? "desc" : "asc")}
            className="flex items-center gap-1 px-3 py-2 rounded-lg border border-border bg-card text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ArrowUpDown className="w-3.5 h-3.5" /> {sortDir === "desc" ? "High to Low" : "Low to High"}
          </button>
        )}
      </div>

      {/* ---- BOARD VIEW ---- */}
      {viewMode === "board" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {openStages.map((stage, si) => {
            const stageDeals = filteredDeals.filter(d => d.stage === stage.name);
            const stageValue = stageDeals.reduce((s, d) => s + d.value, 0);
            return (
              <motion.div key={stage.name} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + si * 0.06 }}
                className="space-y-3"
                onDragOver={e => { e.preventDefault(); setDragOverStage(stage.name); }}
                onDragLeave={() => setDragOverStage(null)}
                onDrop={() => {
                  setDragOverStage(null);
                  if (dragDealRef.current !== null) {
                    const deal = deals.find(d => d.id === dragDealRef.current);
                    if (deal && deal.stage !== stage.name) {
                      setStageChangeTarget({ deal, toStage: stage.name });
                    }
                    dragDealRef.current = null;
                  }
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2.5 h-2.5 rounded-full", stage.dot)} />
                    <h3 className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">{stage.name}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground font-mono">{fmt(stageValue)}</span>
                    <span className="text-[10px] bg-muted text-muted-foreground rounded-full px-2 py-0.5 font-mono">{stageDeals.length}</span>
                  </div>
                </div>

                <div className={cn(
                  "space-y-2 min-h-[80px] rounded-xl p-2 transition-colors",
                  dragOverStage === stage.name ? "bg-primary/10 border-2 border-dashed border-primary/40" : "border-2 border-transparent"
                )}>
                  {stageDeals.map((deal, di) => (
                    <motion.div key={deal.id}
                      initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 + di * 0.04 }}
                      draggable
                      onDragStart={() => { dragDealRef.current = deal.id; }}
                      onDragEnd={() => { dragDealRef.current = null; setDragOverStage(null); }}
                      onClick={() => onSelectDeal?.(deal.id)}
                      className={cn(
                        "rounded-xl border bg-gradient-to-b p-4 hover:border-opacity-60 transition-all cursor-pointer group",
                        stage.bgGradient, stage.color
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <GripVertical className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-60 transition-opacity cursor-grab shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-semibold text-foreground truncate">{deal.name}</div>
                          <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                            <Building2 className="w-3 h-3" /> {deal.accountName}
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", dealTypeColors[deal.type])}>{deal.type}</span>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-sm font-bold font-mono text-foreground">{fmt(deal.value)}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground font-mono">{deal.probability}%</span>
                          <span className="text-[10px] text-muted-foreground">{getDaysInStage(deal)}d</span>
                        </div>
                      </div>
                      {deal.nextStep && (
                        <div className="mt-2 pt-2 border-t border-border/30">
                          <p className="text-[10px] text-muted-foreground truncate">{deal.nextStep}</p>
                        </div>
                      )}
                    </motion.div>
                  ))}
                  {stageDeals.length === 0 && (
                    <div className="rounded-xl border border-dashed border-border p-6 text-center">
                      <span className="text-xs text-muted-foreground">No deals</span>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Closed deals summary under board */}
      {viewMode === "board" && (() => {
        const won = filteredDeals.filter(d => d.stage === "Closed Won");
        const lost = filteredDeals.filter(d => d.stage === "Closed Lost");
        if (won.length === 0 && lost.length === 0) return null;
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {won.length > 0 && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Closed Won ({won.length})</span>
                  <span className="ml-auto text-sm font-bold font-mono text-emerald-700">{fmt(won.reduce((s, d) => s + d.value, 0))}</span>
                </div>
                <div className="space-y-1.5">
                  {won.map(d => (
                    <div key={d.id} onClick={() => onSelectDeal?.(d.id)} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-emerald-100/50 cursor-pointer transition-colors">
                      <span className="text-xs font-medium text-foreground">{d.name}</span>
                      <span className="text-xs font-mono text-emerald-700">{fmt(d.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {lost.length > 0 && (
              <div className="rounded-xl border border-red-200 bg-red-50/30 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <XCircle className="w-4 h-4 text-red-600" />
                  <span className="text-xs font-semibold text-red-700 uppercase tracking-wider">Closed Lost ({lost.length})</span>
                  <span className="ml-auto text-sm font-bold font-mono text-red-700">{fmt(lost.reduce((s, d) => s + d.value, 0))}</span>
                </div>
                <div className="space-y-1.5">
                  {lost.map(d => (
                    <div key={d.id} onClick={() => onSelectDeal?.(d.id)} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-red-100/50 cursor-pointer transition-colors">
                      <span className="text-xs font-medium text-foreground">{d.name}</span>
                      <span className="text-xs font-mono text-red-700">{fmt(d.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ---- LIST VIEW ---- */}
      {viewMode === "list" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {[
                    { key: "name", label: "Deal", w: "min-w-[200px]" },
                    { key: "account", label: "Account", w: "min-w-[120px]" },
                    { key: "stage", label: "Stage", w: "min-w-[100px]" },
                    { key: "value", label: "Value", w: "min-w-[80px]" },
                    { key: "probability", label: "Prob", w: "min-w-[60px]" },
                    { key: "weighted", label: "Weighted", w: "min-w-[80px]" },
                    { key: "type", label: "Type", w: "min-w-[90px]" },
                    { key: "owner", label: "Owner", w: "min-w-[100px]" },
                    { key: "daysInStage", label: "Days in Stage", w: "min-w-[80px]" },
                    { key: "close", label: "Expected Close", w: "min-w-[100px]" },
                  ].map(col => (
                    <th key={col.key} className={cn("px-3 py-2.5 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider", col.w)}>
                      <button onClick={() => { if (["value", "probability", "daysInStage", "date"].includes(col.key)) { setSortBy(col.key === "close" ? "date" : col.key as any); setSortDir(d => d === "asc" ? "desc" : "asc"); }}}
                        className="flex items-center gap-1 hover:text-foreground transition-colors">
                        {col.label}
                        {["value", "probability", "daysInStage", "close"].includes(col.key) && <ArrowUpDown className="w-3 h-3" />}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredDeals.map((deal, i) => {
                  const stageConfig = DEAL_STAGES.find(s => s.name === deal.stage);
                  return (
                    <tr key={deal.id} onClick={() => onSelectDeal?.(deal.id)}
                      className="border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors">
                      <td className="px-3 py-3">
                        <div className="font-medium text-foreground">{deal.name}</div>
                        {deal.nextStep && <div className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[200px]">{deal.nextStep}</div>}
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">{deal.accountName}</td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-1.5">
                          <span className={cn("w-2 h-2 rounded-full", stageConfig?.dot)} />
                          <span className="font-medium text-foreground">{deal.stage}</span>
                        </span>
                      </td>
                      <td className="px-3 py-3 font-mono font-semibold text-foreground">{fmt(deal.value)}</td>
                      <td className="px-3 py-3 font-mono text-muted-foreground">{deal.probability}%</td>
                      <td className="px-3 py-3 font-mono text-primary">{fmt(getWeightedValue(deal))}</td>
                      <td className="px-3 py-3">
                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", dealTypeColors[deal.type])}>{deal.type}</span>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">{deal.owner}</td>
                      <td className="px-3 py-3">
                        <span className={cn("font-mono", getDaysInStage(deal) > 30 ? "text-red-600" : getDaysInStage(deal) > 14 ? "text-amber-600" : "text-foreground")}>
                          {getDaysInStage(deal)}d
                        </span>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground font-mono">
                        {new Date(deal.expectedCloseDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* ---- FORECAST VIEW ---- */}
      {viewMode === "forecast" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {/* Forecast summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {([
              { label: "Commit", data: forecast.commit, color: "border-emerald-500/30 bg-emerald-50/30", textColor: "text-emerald-700" },
              { label: "Best Case", data: forecast.bestCase, color: "border-blue-500/30 bg-blue-50/30", textColor: "text-blue-700" },
              { label: "Pipeline", data: forecast.pipeline, color: "border-amber-500/30 bg-amber-50/30", textColor: "text-amber-700" },
              { label: "Total", data: forecast.total, color: "border-border bg-card", textColor: "text-foreground" },
            ] as const).map(cat => (
              <div key={cat.label} className={cn("rounded-xl border p-4", cat.color)}>
                <div className="text-[10px] tracking-[0.1em] text-muted-foreground font-medium uppercase mb-2">{cat.label}</div>
                <div className={cn("text-xl font-bold font-mono", cat.textColor)}>{fmt(cat.data.value)}</div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] text-muted-foreground">{cat.data.count} deals</span>
                  <span className="text-[10px] text-muted-foreground font-mono">Weighted: {fmt(cat.data.weighted)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Pipeline by stage breakdown */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Pipeline by Stage</h3>
            <div className="space-y-3">
              {DEAL_STAGES.filter(s => s.name !== "Closed Lost").map(stage => {
                const stageDeals = deals.filter(d => d.stage === stage.name);
                const stageValue = stageDeals.reduce((s, d) => s + d.value, 0);
                const maxValue = Math.max(...DEAL_STAGES.map(s => deals.filter(d => d.stage === s.name).reduce((sum, d) => sum + d.value, 0)), 1);
                const pct = (stageValue / maxValue) * 100;
                return (
                  <div key={stage.name} className="flex items-center gap-3">
                    <div className="w-28 flex items-center gap-2 shrink-0">
                      <div className={cn("w-2.5 h-2.5 rounded-full", stage.dot)} />
                      <span className="text-xs font-medium text-foreground">{stage.name}</span>
                    </div>
                    <div className="flex-1 h-6 bg-muted/30 rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all", stage.dot)} style={{ width: `${Math.max(pct, 2)}%` }} />
                    </div>
                    <div className="w-20 text-right shrink-0">
                      <span className="text-xs font-bold font-mono text-foreground">{fmt(stageValue)}</span>
                    </div>
                    <div className="w-12 text-right shrink-0">
                      <span className="text-[10px] text-muted-foreground font-mono">{stageDeals.length}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Conversion Analytics Section ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Stage Conversion Funnel */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" /> Stage Conversion Funnel
              </h3>
              <div className="space-y-3">
                {conversionRates.map((cr, i) => {
                  const stageConfig = DEAL_STAGES.find(s => s.name === cr.fromStage);
                  return (
                    <div key={cr.fromStage} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-2.5 h-2.5 rounded-full", stageConfig?.dot || "bg-muted")} />
                          <span className="text-xs font-medium text-foreground">{cr.fromStage}</span>
                          <ArrowRight className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{cr.toStage}</span>
                        </div>
                        <span className={cn("text-xs font-bold font-mono",
                          cr.rate >= 60 ? "text-emerald-600" : cr.rate >= 30 ? "text-amber-600" : "text-red-500"
                        )}>{cr.rate.toFixed(0)}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted/30 rounded-full overflow-hidden">
                          <div className={cn("h-full rounded-full transition-all",
                            cr.rate >= 60 ? "bg-emerald-500" : cr.rate >= 30 ? "bg-amber-500" : "bg-red-400"
                          )} style={{ width: `${Math.max(cr.rate, 3)}%` }} />
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono w-16 text-right">{cr.advanced}/{cr.entered}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Average Time per Stage */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Avg. Time per Stage
              </h3>
              <div className="space-y-3">
                {stageTime.map(st => {
                  const stageConfig = DEAL_STAGES.find(s => s.name === st.stage);
                  const maxDays = Math.max(...stageTime.map(s => s.avgDays), 1);
                  return (
                    <div key={st.stage} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-2.5 h-2.5 rounded-full", stageConfig?.dot || "bg-muted")} />
                          <span className="text-xs font-medium text-foreground">{st.stage}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold font-mono text-foreground">{st.avgDays}d</span>
                          <span className="text-[10px] text-muted-foreground">({st.dealCount} deals)</span>
                        </div>
                      </div>
                      <div className="flex-1 h-2 bg-muted/30 rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full", stageConfig?.dot || "bg-primary")}
                          style={{ width: `${Math.max((st.avgDays / maxDays) * 100, 3)}%` }} />
                      </div>
                    </div>
                  );
                })}
                <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground uppercase font-medium">Total Avg. Sales Cycle</span>
                  <span className="text-xs font-bold font-mono text-primary">{Math.round(kpis.avgSalesCycle)}d</span>
                </div>
              </div>
            </div>
          </div>

          {/* Pipeline Velocity & Win/Loss KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-border bg-card p-4 text-center">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Pipeline Velocity</div>
              <div className="text-lg font-bold font-mono text-primary mt-1">{fmt(velocity.velocity)}<span className="text-[10px] text-muted-foreground font-normal">/day</span></div>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 text-center">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Win Rate</div>
              <div className={cn("text-lg font-bold font-mono mt-1",
                winLoss.winRate >= 50 ? "text-emerald-600" : winLoss.winRate >= 25 ? "text-amber-600" : "text-red-500"
              )}>{winLoss.winRate.toFixed(0)}%</div>
              <div className="text-[10px] text-muted-foreground">{winLoss.won}W / {winLoss.lost}L</div>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 text-center">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Avg Won Deal</div>
              <div className="text-lg font-bold font-mono text-emerald-600 mt-1">{fmt(winLoss.avgWonValue)}</div>
              <div className="text-[10px] text-muted-foreground">{Math.round(winLoss.avgWonCycle)}d cycle</div>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 text-center">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Closing This Month</div>
              <div className="text-lg font-bold font-mono text-foreground mt-1">{kpis.closingThisMonth}</div>
              <div className="text-[10px] text-muted-foreground">{fmt(kpis.closingThisMonthValue)} value</div>
            </div>
          </div>

          {/* Win/Loss by Deal Type */}
          {winLoss.byType.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" /> Win Rate by Deal Type
              </h3>
              <div className="space-y-3">
                {winLoss.byType.map(t => (
                  <div key={t.type} className="flex items-center gap-3">
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium w-24 text-center", dealTypeColors[t.type as keyof typeof dealTypeColors])}>{t.type}</span>
                    <div className="flex-1 h-3 bg-muted/30 rounded-full overflow-hidden flex">
                      <div className="h-full bg-emerald-500 rounded-l-full" style={{ width: `${t.rate}%` }} />
                      <div className="h-full bg-red-400 rounded-r-full" style={{ width: `${100 - t.rate}%` }} />
                    </div>
                    <span className="text-xs font-bold font-mono w-12 text-right">{t.rate.toFixed(0)}%</span>
                    <span className="text-[10px] text-muted-foreground w-16 text-right">{t.won}W / {t.lost}L</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lost Reasons */}
          {Object.keys(winLoss.lostReasons).length > 0 && (
            <div className="rounded-xl border border-red-200/50 bg-red-50/20 p-5">
              <h3 className="text-xs font-semibold text-red-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> Loss Reasons
              </h3>
              <div className="space-y-2">
                {Object.entries(winLoss.lostReasons).sort((a, b) => b[1] - a[1]).map(([reason, count]) => (
                  <div key={reason} className="flex items-center gap-3">
                    <span className="text-xs text-foreground flex-1">{reason}</span>
                    <span className="text-xs font-bold font-mono text-red-600">{count} deal{count !== 1 ? "s" : ""}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Forecast deals table */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Deals by Forecast Category</h3>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="px-4 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase">Deal</th>
                  <th className="px-4 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase">Category</th>
                  <th className="px-4 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase">Stage</th>
                  <th className="px-4 py-2 text-right text-[10px] font-semibold text-muted-foreground uppercase">Value</th>
                  <th className="px-4 py-2 text-right text-[10px] font-semibold text-muted-foreground uppercase">Weighted</th>
                  <th className="px-4 py-2 text-right text-[10px] font-semibold text-muted-foreground uppercase">Close</th>
                </tr>
              </thead>
              <tbody>
                {deals.filter(d => d.stage !== "Closed Lost").sort((a, b) => {
                  const order: ForecastCategory[] = ["Commit", "Best Case", "Pipeline", "Omitted"];
                  return order.indexOf(a.forecastCategory) - order.indexOf(b.forecastCategory);
                }).map(deal => {
                  const stageConfig = DEAL_STAGES.find(s => s.name === deal.stage);
                  return (
                    <tr key={deal.id} onClick={() => onSelectDeal?.(deal.id)}
                      className="border-b border-border/50 hover:bg-muted/20 cursor-pointer transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-foreground">{deal.name}</div>
                        <div className="text-[10px] text-muted-foreground">{deal.accountName}</div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", forecastCategoryColors[deal.forecastCategory])}>
                          {deal.forecastCategory}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-1.5">
                          <span className={cn("w-2 h-2 rounded-full", stageConfig?.dot)} />
                          {deal.stage}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-semibold">{fmt(deal.value)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-primary">{fmt(getWeightedValue(deal))}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">
                        {new Date(deal.expectedCloseDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* ---- Modals ---- */}
      <AnimatePresence>
        {stageChangeTarget && (
          <StageChangeModal
            deal={stageChangeTarget.deal}
            toStage={stageChangeTarget.toStage}
            onConfirm={handleStageChangeConfirm}
            onCancel={() => setStageChangeTarget(null)}
          />
        )}

      </AnimatePresence>
    </div>
  );
}
