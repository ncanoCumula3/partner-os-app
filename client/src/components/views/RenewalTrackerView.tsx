/*
 * RenewalTrackerView — License End Date (LED) renewal management dashboard
 * Shows SaaS accounts sorted by LED urgency, renewal pipeline, ARR at risk,
 * downsell warnings, and renewal workflow status.
 * Warm adaptive theme
 */
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ACCOUNTS, daysUntilLED, getLEDUrgency, formatLEDDate,
  ledUrgencyColors, ledUrgencyLabels, getLEDUrgencyLabels, renewalStatusColors,
  customerTypeColors, downsellRiskColors, healthColor,
  tierColors, getSaaSAccountsByUrgency, getARRAtRisk, getDownsellRiskARR,
  isInRenewalWindow, type RenewalThresholds,
} from "@/lib/data";
import type { Account, RenewalStatus, LEDUrgency } from "@/lib/data";
import { useAdminSettings } from "@/contexts/AdminSettingsContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  CalendarClock, AlertTriangle, TrendingDown, DollarSign,
  Shield, ChevronRight, Search, ArrowUpDown, ArrowUp, ArrowDown,
  X, Building2, Package, Users, Calendar, Clock, User,
  AlertOctagon, CheckCircle2, Play, Phone, Mail,
  FileText, Zap, BarChart3, Target,
} from "lucide-react";
import ActivityNotes from "@/components/ActivityNotes";

/* ── KPI Card ─── */
function KPICard({ label, value, sub, icon, color, onClick, isActive }: {
  label: string; value: string; sub?: string; icon: React.ReactNode; color: string;
  onClick?: () => void; isActive?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-xl border bg-card p-4 space-y-1 transition-all",
        onClick && "cursor-pointer hover:shadow-md hover:border-primary/40",
        isActive ? "border-primary ring-2 ring-primary/20 shadow-md" : "border-border",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">{label}</span>
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", color)}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold text-foreground font-mono">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
      {onClick && <p className="text-[8px] text-primary/60 font-medium uppercase tracking-wider mt-0.5">Click to drill down</p>}
    </div>
  );
}

/* ── LED Progress Bar ─── */
function LEDProgressBar({ account, renewalThresholds }: { account: Account; renewalThresholds?: Partial<RenewalThresholds> }) {
  if (!account.saasLicense) return null;
  const lic = account.saasLicense;
  const totalDays = lic.contractTermMonths * 30;
  const daysLeft = daysUntilLED(lic.licenseEndDate);
  const elapsed = Math.max(0, totalDays - daysLeft);
  const pct = Math.min(100, Math.round((elapsed / totalDays) * 100));
  const urgency = getLEDUrgency(account, renewalThresholds);
  const windowMonths = renewalThresholds?.renewalWindowMonths ?? 6;
  const windowDays = windowMonths * 30;
  const barColor = urgency === "critical" ? "bg-red-500" : urgency === "warning" ? "bg-orange-500" : urgency === "approaching" ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
        <span>{lic.lastRenewalDate ? formatLEDDate(lic.lastRenewalDate) : "Start"}</span>
        <span className="font-semibold">{pct}% elapsed</span>
        <span>{formatLEDDate(lic.licenseEndDate)}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={cn("h-full rounded-full", barColor)}
        />
      </div>
      {/* Renewal window marker */}
      {totalDays > windowDays && (
        <div className="relative h-3">
          <div
            className="absolute top-0 w-px h-3 bg-amber-500/60"
            style={{ left: `${Math.max(0, Math.min(100, ((totalDays - windowDays) / totalDays) * 100))}%` }}
          />
          <span
            className="absolute top-3 text-[8px] text-amber-600 -translate-x-1/2"
            style={{ left: `${Math.max(0, Math.min(100, ((totalDays - windowDays) / totalDays) * 100))}%` }}
          >
            {windowMonths}mo window
          </span>
        </div>
      )}
    </div>
  );
}

/* ── Renewal Detail Panel ─── */
function RenewalDetail({ account, onClose, onNavigate, renewalThresholds, dynamicLabels }: {
  account: Account; onClose: () => void; onNavigate: (id: string) => void;
  renewalThresholds?: Partial<RenewalThresholds>;
  dynamicLabels?: Record<LEDUrgency, string>;
}) {
  const lic = account.saasLicense!;
  const days = daysUntilLED(lic.licenseEndDate);
  const urgency = getLEDUrgency(account, renewalThresholds);
  const uc = ledUrgencyColors[urgency];
  const labels = dynamicLabels ?? ledUrgencyLabels;

  const renewalSteps = [
    { label: "Initial Assessment", desc: "Review account health, usage, and satisfaction", done: lic.renewalStatus !== "Not Started" },
    { label: "Stakeholder Mapping", desc: "Identify decision-makers and influencers", done: ["Discovery", "Negotiation", "Committed", "Renewed"].includes(lic.renewalStatus) },
    { label: "Value Review Meeting", desc: "Present ROI analysis and usage metrics", done: ["Negotiation", "Committed", "Renewed"].includes(lic.renewalStatus) },
    { label: "Proposal & Negotiation", desc: "Present renewal terms, address downsell risks", done: ["Committed", "Renewed"].includes(lic.renewalStatus) },
    { label: "Executive Alignment", desc: "Secure executive sponsor commitment", done: ["Committed", "Renewed"].includes(lic.renewalStatus) },
    { label: "Contract Execution", desc: "Finalize and sign renewal agreement", done: lic.renewalStatus === "Renewed" },
  ];

  const completedSteps = renewalSteps.filter((s) => s.done).length;

  return (
    <Sheet open onOpenChange={() => onClose()}>
      <SheetContent side="right" className="w-[520px] sm:max-w-[520px] p-0 border-l border-border bg-card">
        <ScrollArea className="h-full">
          <div className="p-6 space-y-5">
            <SheetHeader className="space-y-0">
              <div className="flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold", uc.bg, uc.text)}>
                  {account.name.charAt(0)}
                </div>
                <div>
                  <SheetTitle className="text-base font-bold text-foreground">{account.name}</SheetTitle>
                  <SheetDescription className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                    <span className={cn("text-[10px] px-1.5 py-px rounded border font-medium", customerTypeColors[account.customerType])}>
                      {account.customerType}
                    </span>
                    <span className={cn("text-[10px] px-1.5 py-px rounded border font-medium", tierColors[account.tier])}>
                      {account.tier}
                    </span>
                    <span className="text-muted-foreground">{account.platform}</span>
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            {/* LED Countdown Hero */}
            <div className={cn("rounded-xl border p-4 space-y-3", uc.border, uc.bg)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarClock className={cn("w-5 h-5", uc.text)} />
                  <div>
                    <p className="text-sm font-semibold text-foreground">License End Date</p>
                    <p className={cn("text-lg font-mono font-bold", uc.text)}>
                      {formatLEDDate(lic.licenseEndDate)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className={cn("text-3xl font-bold font-mono", uc.text)}>{days}</div>
                  <div className="text-[10px] text-muted-foreground">days remaining</div>
                </div>
              </div>
              <div className={cn("text-[10px] px-2 py-1 rounded font-semibold text-center", uc.text, "border", uc.border)}>
                {urgency === "critical" && <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse mr-1.5" />}
                {labels[urgency]}
              </div>
              <LEDProgressBar account={account} renewalThresholds={renewalThresholds} />
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border bg-card p-3">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">License ARR</div>
                <div className="text-lg font-bold font-mono text-foreground">${(lic.annualLicenseValue / 1000).toFixed(0)}K</div>
              </div>
              <div className="rounded-lg border border-border bg-card p-3">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Health Score</div>
                <div className={cn("text-lg font-bold font-mono", healthColor(account.health))}>{account.health}</div>
              </div>
              <div className="rounded-lg border border-border bg-card p-3">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Seats</div>
                <div className="text-lg font-bold font-mono text-foreground">{lic.seats}</div>
              </div>
              <div className="rounded-lg border border-border bg-card p-3">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Term</div>
                <div className="text-lg font-bold font-mono text-foreground">{lic.contractTermMonths}mo</div>
              </div>
            </div>

            {/* Active Modules */}
            <section>
              <h3 className="text-[11px] tracking-[0.1em] uppercase text-muted-foreground font-medium mb-2">Active Modules</h3>
              <div className="flex flex-wrap gap-1.5">
                {lic.modules.map((m) => (
                  <span key={m} className="text-[10px] px-2 py-1 rounded-lg bg-muted border border-border text-foreground font-medium">
                    {m}
                  </span>
                ))}
              </div>
            </section>

            <Separator className="bg-border/40" />

            {/* Renewal Status & Risk */}
            <section>
              <h3 className="text-[11px] tracking-[0.1em] uppercase text-muted-foreground font-medium mb-3">Renewal Status</h3>
              <div className="flex items-center gap-2 mb-3">
                <span className={cn("text-xs px-2.5 py-1 rounded font-medium", renewalStatusColors[lic.renewalStatus])}>
                  {lic.renewalStatus}
                </span>
                <span className={cn("text-xs px-2.5 py-1 rounded font-medium", downsellRiskColors[lic.downsellRisk])}>
                  Downsell Risk: {lic.downsellRisk}
                </span>
              </div>

              {/* Downsell warning */}
              {lic.downsellRisk !== "None" && lic.downsellNotes && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 mb-3">
                  <AlertOctagon className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-red-700">Downsell Alert</p>
                    <p className="text-[11px] text-red-600/80 leading-relaxed mt-0.5">{lic.downsellNotes}</p>
                  </div>
                </div>
              )}

              {/* Renewal progress steps */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                  <span>Renewal Progress</span>
                  <span className="font-mono font-semibold">{completedSteps}/{renewalSteps.length}</span>
                </div>
                {renewalSteps.map((step, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                      step.done ? "bg-emerald-100 text-emerald-600" : "bg-muted text-muted-foreground"
                    )}>
                      {step.done ? <CheckCircle2 className="w-3 h-3" /> : <span className="text-[9px] font-mono">{i + 1}</span>}
                    </div>
                    <div>
                      <p className={cn("text-xs font-medium", step.done ? "text-foreground" : "text-muted-foreground")}>
                        {step.label}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <Separator className="bg-border/40" />

            {/* Inline Actions */}
            <section>
              <h3 className="text-[11px] tracking-[0.1em] uppercase text-muted-foreground font-medium mb-3">Actions</h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { toast.success(`Renewal status advanced for ${account.name}`); }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-primary/5 hover:border-primary/30 transition-all"
                >
                  <Play className="w-3.5 h-3.5 text-emerald-600" /> Advance Stage
                </button>
                <button
                  onClick={() => { toast.success(`Escalation created for ${account.name} renewal`); }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-primary/5 hover:border-primary/30 transition-all"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-orange-500" /> Escalate
                </button>
                <button
                  onClick={() => { toast.success(`Renewal call scheduled for ${account.name}`); }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-primary/5 hover:border-primary/30 transition-all"
                >
                  <Phone className="w-3.5 h-3.5 text-blue-500" /> Schedule Call
                </button>
                <button
                  onClick={() => { toast.success(`Renewal proposal sent to ${account.contact}`); }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-primary/5 hover:border-primary/30 transition-all"
                >
                  <Mail className="w-3.5 h-3.5 text-violet-500" /> Send Proposal
                </button>
                <button
                  onClick={() => { onNavigate("accounts"); onClose(); }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-primary/5 hover:border-primary/30 transition-all"
                >
                  <Building2 className="w-3.5 h-3.5 text-primary" /> View Account
                </button>
                <button
                  onClick={() => { onNavigate("playbooks"); onClose(); }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-primary/5 hover:border-primary/30 transition-all"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-600" /> Renewal Playbook
                </button>
              </div>
            </section>

            <Separator className="bg-border/40" />

            {/* Notes */}
            <ActivityNotes
              account={account.name}
              section="renewals"
              itemRef={`renewal-${account.id}`}
            />
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN VIEW
   ═══════════════════════════════════════════════════════════════ */
type SortKey = "name" | "led" | "arr" | "health" | "risk";
type SortDir = "asc" | "desc";

interface RenewalTrackerViewProps {
  onNavigate: (id: string) => void;
}

export default function RenewalTrackerView({ onNavigate }: RenewalTrackerViewProps) {
  const { settings } = useAdminSettings();
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("led");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [statusFilter, setStatusFilter] = useState<RenewalStatus | "all">("all");
  const [urgencyFilter, setUrgencyFilter] = useState<LEDUrgency | "all">("all");
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [drillDownKpi, setDrillDownKpi] = useState<string | null>(null);
  const toggleDrill = (key: string) => setDrillDownKpi(prev => prev === key ? null : key);

  // Admin-configured renewal thresholds
  const renewalThresholds: Partial<RenewalThresholds> = useMemo(() => ({
    criticalThresholdDays: settings.renewals.criticalThresholdDays,
    urgentThresholdDays: settings.renewals.urgentThresholdDays,
    renewalWindowMonths: settings.renewals.renewalWindowMonths,
  }), [settings.renewals]);

  // Dynamic labels that reflect admin thresholds
  const dynamicLabels = useMemo(() => getLEDUrgencyLabels(renewalThresholds), [renewalThresholds]);

  const saasAccounts = useMemo(() => getSaaSAccountsByUrgency(), []);
  const arrAtRisk = useMemo(() => getARRAtRisk(settings.renewals.renewalWindowMonths), [settings.renewals.renewalWindowMonths]);
  const downsellARR = useMemo(() => getDownsellRiskARR(), []);
  const inWindow = useMemo(() => saasAccounts.filter(a => isInRenewalWindow(a, settings.renewals.renewalWindowMonths)).length, [saasAccounts, settings.renewals.renewalWindowMonths]);

  const RISK_ORDER: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };

  const processed = useMemo(() => {
    let list = [...saasAccounts];
    if (statusFilter !== "all") list = list.filter((a) => a.saasLicense?.renewalStatus === statusFilter);
    if (urgencyFilter !== "all") list = list.filter((a) => getLEDUrgency(a, renewalThresholds) === urgencyFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((a) =>
        a.name.toLowerCase().includes(q) ||
        a.platform.toLowerCase().includes(q) ||
        a.contact.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name": cmp = a.name.localeCompare(b.name); break;
        case "led": cmp = daysUntilLED(a.saasLicense!.licenseEndDate) - daysUntilLED(b.saasLicense!.licenseEndDate); break;
        case "arr": cmp = a.saasLicense!.annualLicenseValue - b.saasLicense!.annualLicenseValue; break;
        case "health": cmp = a.health - b.health; break;
        case "risk": cmp = (RISK_ORDER[a.saasLicense!.renewalRisk] || 0) - (RISK_ORDER[b.saasLicense!.renewalRisk] || 0); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [saasAccounts, query, sortKey, sortDir, statusFilter, urgencyFilter]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const SortIcon = ({ colKey }: { colKey: SortKey }) => {
    if (sortKey !== colKey) return <ArrowUpDown className="w-3 h-3 text-muted-foreground/40" />;
    return sortDir === "asc" ? <ArrowUp className="w-3 h-3 text-primary" /> : <ArrowDown className="w-3 h-3 text-primary" />;
  };

  const statusOptions: RenewalStatus[] = ["Not Started", "Discovery", "Negotiation", "Committed", "Renewed", "Churned"];
  const urgencyOptions: LEDUrgency[] = ["critical", "warning", "approaching", "safe"];

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard label="SaaS Accounts" value={String(saasAccounts.length)} sub={`${inWindow} in renewal window`} icon={<Building2 className="w-4 h-4 text-primary" />} color="bg-primary/10" onClick={() => toggleDrill("accounts")} isActive={drillDownKpi === "accounts"} />
        <KPICard label="ARR at Risk" value={`$${(arrAtRisk / 1000).toFixed(0)}K`} sub="High/Critical renewal risk" icon={<AlertTriangle className="w-4 h-4 text-red-600" />} color="bg-red-50" onClick={() => toggleDrill("arrRisk")} isActive={drillDownKpi === "arrRisk"} />
        <KPICard label="Downsell Exposure" value={`$${(downsellARR / 1000).toFixed(0)}K`} sub="Est. 30% reduction impact" icon={<TrendingDown className="w-4 h-4 text-orange-600" />} color="bg-orange-50" onClick={() => toggleDrill("downsell")} isActive={drillDownKpi === "downsell"} />
        <KPICard label="Nearest LED" value={saasAccounts.length > 0 ? `${daysUntilLED(saasAccounts[0].saasLicense!.licenseEndDate)}d` : "—"} sub={saasAccounts.length > 0 ? saasAccounts[0].name : ""} icon={<CalendarClock className="w-4 h-4 text-amber-600" />} color="bg-amber-50" onClick={() => toggleDrill("led")} isActive={drillDownKpi === "led"} />
      </div>

      {/* ── Renewal Drill-Down Panel ── */}
      <AnimatePresence mode="wait">
        {drillDownKpi && (
          <motion.div key={drillDownKpi} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
            <div className="rounded-xl border border-primary/20 bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  {drillDownKpi === "accounts" && <><Building2 className="w-4 h-4 text-primary" /> SaaS Accounts — Overview</>}
                  {drillDownKpi === "arrRisk" && <><AlertTriangle className="w-4 h-4 text-red-600" /> ARR at Risk — Breakdown</>}
                  {drillDownKpi === "downsell" && <><TrendingDown className="w-4 h-4 text-orange-600" /> Downsell Exposure — Details</>}
                  {drillDownKpi === "led" && <><CalendarClock className="w-4 h-4 text-amber-600" /> Nearest LED — Timeline</>}
                </h3>
                <button onClick={() => setDrillDownKpi(null)} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-muted transition-colors">Close</button>
              </div>

              {/* SaaS Accounts */}
              {drillDownKpi === "accounts" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Total SaaS</p><p className="text-lg font-bold font-mono text-foreground">{saasAccounts.length}</p></div>
                    <div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">In Window</p><p className="text-lg font-bold font-mono text-amber-600">{inWindow}</p></div>
                    <div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Total License ARR</p><p className="text-lg font-bold font-mono text-foreground">${(saasAccounts.reduce((s, a) => s + (a.saasLicense?.annualLicenseValue || 0), 0) / 1000).toFixed(0)}K</p></div>
                    <div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Avg Health</p><p className="text-lg font-bold font-mono text-foreground">{(saasAccounts.reduce((s, a) => s + a.health, 0) / saasAccounts.length).toFixed(0)}</p></div>
                  </div>
                  <div className="rounded-lg border border-border overflow-hidden"><table className="w-full text-xs"><thead><tr className="bg-muted/50"><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Account</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Tier</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">License ARR</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">LED</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Status</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Health</th></tr></thead><tbody className="divide-y divide-border">{saasAccounts.map(a => { const lic = a.saasLicense!; const urg = getLEDUrgency(a, renewalThresholds); const uc = ledUrgencyColors[urg]; return (<tr key={a.id}><td className="px-3 py-2 font-medium text-foreground">{a.name}</td><td className="px-3 py-2 text-muted-foreground">{lic.subscriptionTier}</td><td className="px-3 py-2 font-mono text-foreground">${(lic.annualLicenseValue / 1000).toFixed(0)}K</td><td className="px-3 py-2"><span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", uc.bg, uc.text)}>{daysUntilLED(lic.licenseEndDate)}d</span></td><td className="px-3 py-2"><span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", renewalStatusColors[lic.renewalStatus])}>{lic.renewalStatus}</span></td><td className="px-3 py-2"><span className={cn("font-medium", healthColor(a.health))}>{a.health}</span></td></tr>); })}</tbody></table></div>
                </div>
              )}

              {/* ARR at Risk */}
              {drillDownKpi === "arrRisk" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Total at Risk</p><p className="text-lg font-bold font-mono text-red-600">${(arrAtRisk / 1000).toFixed(0)}K</p></div>
                    <div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Critical Risk</p><p className="text-lg font-bold font-mono text-red-600">{saasAccounts.filter(a => a.saasLicense?.renewalRisk === "Critical").length} accounts</p></div>
                    <div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">High Risk</p><p className="text-lg font-bold font-mono text-orange-600">{saasAccounts.filter(a => a.saasLicense?.renewalRisk === "High").length} accounts</p></div>
                  </div>
                  <div className="rounded-lg border border-border overflow-hidden"><table className="w-full text-xs"><thead><tr className="bg-muted/50"><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Account</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">License ARR</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Risk</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">LED</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Health</th></tr></thead><tbody className="divide-y divide-border">{saasAccounts.filter(a => a.saasLicense?.renewalRisk === "High" || a.saasLicense?.renewalRisk === "Critical").map(a => { const lic = a.saasLicense!; return (<tr key={a.id}><td className="px-3 py-2 font-medium text-foreground">{a.name}</td><td className="px-3 py-2 font-mono text-foreground">${(lic.annualLicenseValue / 1000).toFixed(0)}K</td><td className="px-3 py-2"><span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", lic.renewalRisk === "Critical" ? "bg-red-50 text-red-700" : "bg-orange-50 text-orange-700")}>{lic.renewalRisk}</span></td><td className="px-3 py-2 text-muted-foreground">{formatLEDDate(lic.licenseEndDate)}</td><td className="px-3 py-2"><span className={cn("font-medium", healthColor(a.health))}>{a.health}</span></td></tr>); })}</tbody></table></div>
                </div>
              )}

              {/* Downsell Exposure */}
              {drillDownKpi === "downsell" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Downsell Exposure</p><p className="text-lg font-bold font-mono text-orange-600">${(downsellARR / 1000).toFixed(0)}K</p></div>
                    <div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Accounts at Risk</p><p className="text-lg font-bold font-mono text-foreground">{saasAccounts.filter(a => a.saasLicense?.downsellRisk !== "None").length}</p></div>
                    <div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">High Downsell</p><p className="text-lg font-bold font-mono text-red-600">{saasAccounts.filter(a => a.saasLicense?.downsellRisk === "High").length}</p></div>
                  </div>
                  <div className="rounded-lg border border-border overflow-hidden"><table className="w-full text-xs"><thead><tr className="bg-muted/50"><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Account</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Downsell Risk</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">License ARR</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Notes</th></tr></thead><tbody className="divide-y divide-border">{saasAccounts.filter(a => a.saasLicense?.downsellRisk !== "None").map(a => { const lic = a.saasLicense!; return (<tr key={a.id}><td className="px-3 py-2 font-medium text-foreground">{a.name}</td><td className="px-3 py-2"><span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", downsellRiskColors[lic.downsellRisk])}>{lic.downsellRisk}</span></td><td className="px-3 py-2 font-mono text-foreground">${(lic.annualLicenseValue / 1000).toFixed(0)}K</td><td className="px-3 py-2 text-muted-foreground text-[11px] italic">{lic.downsellNotes || "—"}</td></tr>); })}</tbody></table></div>
                </div>
              )}

              {/* Nearest LED */}
              {drillDownKpi === "led" && (
                <div className="space-y-3">
                  <div className="rounded-lg border border-border overflow-hidden"><table className="w-full text-xs"><thead><tr className="bg-muted/50"><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Account</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">LED</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Days Left</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Urgency</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">License ARR</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Status</th></tr></thead><tbody className="divide-y divide-border">{saasAccounts.map(a => { const lic = a.saasLicense!; const days = daysUntilLED(lic.licenseEndDate); const urg = getLEDUrgency(a, renewalThresholds); const uc = ledUrgencyColors[urg]; return (<tr key={a.id}><td className="px-3 py-2 font-medium text-foreground">{a.name}</td><td className="px-3 py-2 text-muted-foreground">{formatLEDDate(lic.licenseEndDate)}</td><td className="px-3 py-2"><span className={cn("font-bold font-mono", uc.text)}>{days}d</span></td><td className="px-3 py-2"><span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", uc.bg, uc.text)}>{dynamicLabels[urg]}</span></td><td className="px-3 py-2 font-mono text-foreground">${(lic.annualLicenseValue / 1000).toFixed(0)}K</td><td className="px-3 py-2"><span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", renewalStatusColors[lic.renewalStatus])}>{lic.renewalStatus}</span></td></tr>); })}</tbody></table></div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search & Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search accounts..."
            className="w-full h-9 pl-9 pr-8 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as RenewalStatus | "all")}
          className="h-9 px-3 rounded-lg border border-border bg-card text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="all">All Statuses</option>
          {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <select
          value={urgencyFilter}
          onChange={(e) => setUrgencyFilter(e.target.value as LEDUrgency | "all")}
          className="h-9 px-3 rounded-lg border border-border bg-card text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="all">All Urgency</option>
          {urgencyOptions.map((u) => <option key={u} value={u}>{dynamicLabels[u]}</option>)}
        </select>

        {(query || statusFilter !== "all" || urgencyFilter !== "all") && (
          <button
            onClick={() => { setQuery(""); setStatusFilter("all"); setUrgencyFilter("all"); }}
            className="h-9 px-3 rounded-lg border border-border bg-card text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Reset
          </button>
        )}

        <span className="text-[11px] text-muted-foreground ml-auto">
          {processed.length} of {saasAccounts.length} accounts
        </span>
      </div>

      {/* Renewal Table */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-border bg-card overflow-hidden"
      >
        {/* Header */}
        <div className="grid grid-cols-[2fr_1.2fr_0.8fr_0.7fr_0.8fr_0.8fr_0.3fr] gap-3 px-5 py-3 border-b border-border">
          {[
            { key: "name" as SortKey, label: "Account" },
            { key: "led" as SortKey, label: "License End Date" },
            { key: "arr" as SortKey, label: "License ARR" },
            { key: "health" as SortKey, label: "Health" },
            { key: "risk" as SortKey, label: "Risk" },
            { key: null, label: "Status" },
            { key: null, label: "" },
          ].map((col, idx) => (
            <button
              key={idx}
              onClick={() => col.key && toggleSort(col.key)}
              disabled={!col.key}
              className={cn(
                "flex items-center gap-1 text-[11px] uppercase tracking-wider font-medium",
                col.key ? "text-muted-foreground hover:text-foreground cursor-pointer" : "text-muted-foreground cursor-default"
              )}
            >
              {col.label}
              {col.key && <SortIcon colKey={col.key} />}
            </button>
          ))}
        </div>

        {/* Rows */}
        <AnimatePresence mode="popLayout">
          {processed.map((acc, i) => {
            const lic = acc.saasLicense!;
            const days = daysUntilLED(lic.licenseEndDate);
            const urgency = getLEDUrgency(acc, renewalThresholds);
            const uc = ledUrgencyColors[urgency];
            return (
              <motion.div
                key={acc.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.2, delay: i * 0.03 }}
                onClick={() => setSelectedAccount(acc)}
                className="grid grid-cols-[2fr_1.2fr_0.8fr_0.7fr_0.8fr_0.8fr_0.3fr] gap-3 px-5 py-3.5 items-center border-b border-border last:border-0 hover:bg-primary/[0.04] transition-all cursor-pointer group"
              >
                {/* Account */}
                <div className="flex items-center gap-2">
                  <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold", uc.bg, uc.text)}>
                    {acc.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold text-foreground group-hover:text-primary transition-colors">
                      {acc.name}
                    </div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                      {acc.platform} · {lic.subscriptionTier}
                    </div>
                  </div>
                </div>

                {/* LED */}
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full shrink-0", uc.dot, urgency === "critical" && "animate-pulse")} />
                  <div>
                    <span className={cn("text-xs font-mono font-bold block leading-tight", uc.text)}>
                      {days}d — {formatLEDDate(lic.licenseEndDate)}
                    </span>
                    <span className={cn("text-[9px] font-medium", uc.text)}>
                      {dynamicLabels[urgency]}
                    </span>
                  </div>
                </div>

                {/* ARR */}
                <span className="text-xs font-mono font-semibold text-foreground">
                  ${(lic.annualLicenseValue / 1000).toFixed(0)}K
                </span>

                {/* Health */}
                <div className="flex items-center gap-1.5">
                  <div className={cn("w-2 h-2 rounded-full", acc.health >= 85 ? "bg-emerald-600" : acc.health >= 65 ? "bg-amber-500" : "bg-red-500")} />
                  <span className={cn("text-xs font-mono font-semibold", healthColor(acc.health))}>{acc.health}</span>
                </div>

                {/* Risk */}
                <div className="flex flex-col gap-0.5">
                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium w-fit",
                    lic.renewalRisk === "Critical" ? "text-red-700 bg-red-50" :
                    lic.renewalRisk === "High" ? "text-orange-700 bg-orange-50" :
                    lic.renewalRisk === "Medium" ? "text-amber-700 bg-amber-50" :
                    "text-emerald-700 bg-emerald-50"
                  )}>
                    {lic.renewalRisk}
                  </span>
                  {lic.downsellRisk !== "None" && (
                    <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-medium w-fit", downsellRiskColors[lic.downsellRisk])}>
                      ↓ {lic.downsellRisk}
                    </span>
                  )}
                </div>

                {/* Status */}
                <span className={cn("text-[10px] px-2 py-0.5 rounded font-medium w-fit", renewalStatusColors[lic.renewalStatus])}>
                  {lic.renewalStatus}
                </span>

                {/* Arrow */}
                <div className="flex items-center justify-end">
                  <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary transition-all" />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {processed.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <CalendarClock className="w-10 h-10 mb-3 opacity-20" />
            <p className="text-sm font-medium">No matching renewals</p>
            <p className="text-xs mt-1">Adjust your filters to see results</p>
          </div>
        )}
      </motion.div>

      {/* Detail Panel */}
      {selectedAccount && (
        <RenewalDetail
          account={selectedAccount}
          onClose={() => setSelectedAccount(null)}
          onNavigate={onNavigate}
          renewalThresholds={renewalThresholds}
          dynamicLabels={dynamicLabels}
        />
      )}
    </div>
  );
}
