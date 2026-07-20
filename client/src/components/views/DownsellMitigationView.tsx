/*
 * DownsellMitigationView — AI-powered downsell risk detection and mitigation
 * Aggregates signals from support, CSAT, outreach, usage, billing, and engagement
 * to predict and prevent ARR reduction during renewal periods.
 */
import { useState, useMemo } from "react";
import { useAdminSettings } from "@/contexts/AdminSettingsContext";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  ACCOUNTS, DOWNSELL_SIGNALS, MITIGATION_ACTIONS, AI_RECOMMENDATIONS,
  getAllRiskProfiles, riskScoreColor, riskScoreLabel,
  signalCategoryConfig, signalSeverityConfig,
  daysUntilLED, formatLEDDate, getLEDUrgency, ledUrgencyColors,
  type DownsellSignal, type MitigationAction, type AIRecommendation, type AccountRiskProfile,
  type SignalCategory, type SignalSeverity, type DownsellWeightsConfig, type RiskThresholdConfig,
} from "@/lib/data";
import ActivityNotes from "@/components/ActivityNotes";
import { useMitigationEngine } from "@/contexts/MitigationEngineContext";
import { toast } from "sonner";
import { generateExecutivePDF } from "@/lib/generateExecutivePDF";
import {
  ShieldAlert, TrendingDown, DollarSign, AlertTriangle, Activity,
  LifeBuoy, Star, Send, Receipt, UserX, ChevronRight,
  ArrowUpRight, ArrowDownRight, Minus, X, Clock, CheckCircle2,
  Sparkles, Brain, Target, Users, FileText, Zap, ArrowRight,
  Search, Filter, ChevronDown, ExternalLink, Play, Pause,
  RotateCcw, Eye, Calendar, Building2, Download,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DownsellMitigationViewProps {
  onNavigate: (id: string) => void;
}

/* ── Category Icon Map ──────────────────────────────────────── */
const categoryIcons: Record<SignalCategory, React.ElementType> = {
  support: LifeBuoy,
  csat: Star,
  outreach: Send,
  usage: Activity,
  billing: Receipt,
  engagement: UserX,
};

/* ── AI Recommendation Type Config ──────────────────────────── */
const recTypeConfig: Record<string, { label: string; Icon: React.ElementType; color: string }> = {
  retention_strategy: { label: "Retention Strategy", Icon: ShieldAlert, color: "text-red-700 bg-red-50" },
  value_demonstration: { label: "Value Demonstration", Icon: Target, color: "text-blue-700 bg-blue-50" },
  executive_engagement: { label: "Executive Engagement", Icon: Users, color: "text-violet-700 bg-violet-50" },
  service_recovery: { label: "Service Recovery", Icon: RotateCcw, color: "text-orange-700 bg-orange-50" },
  contract_restructure: { label: "Contract Restructure", Icon: FileText, color: "text-amber-700 bg-amber-50" },
  adoption_boost: { label: "Adoption Boost", Icon: Zap, color: "text-emerald-700 bg-emerald-50" },
};

/* ── Trend Icon ─────────────────────────────────────────────── */
function TrendIcon({ direction }: { direction: string }) {
  if (direction === "worsening") return <ArrowUpRight className="w-3.5 h-3.5 text-red-600" />;
  if (direction === "improving") return <ArrowDownRight className="w-3.5 h-3.5 text-emerald-600" />;
  return <Minus className="w-3.5 h-3.5 text-slate-400" />;
}

/* ── Risk Score Ring ────────────────────────────────────────── */
function RiskScoreRing({ score, size = 64, riskThresholds }: { score: number; size?: number; riskThresholds?: Partial<RiskThresholdConfig> }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const colors = riskScoreColor(score, riskThresholds);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor"
          strokeWidth={4} className="text-muted/30" />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
          strokeWidth={4} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
          className={colors.text} stroke="currentColor" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={cn("font-bold", colors.text, size >= 64 ? "text-lg" : "text-sm")}>{score}</span>
      </div>
    </div>
  );
}

/* ── Signal Card ────────────────────────────────────────────── */
function SignalCard({ signal, onClick }: { signal: DownsellSignal; onClick: () => void }) {
  const CatIcon = categoryIcons[signal.category];
  const catConfig = signalCategoryConfig[signal.category];
  const sevConfig = signalSeverityConfig[signal.severity];

  return (
    <button onClick={onClick}
      className="w-full text-left p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-accent/30 transition-all group">
      <div className="flex items-start gap-3">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", catConfig.bgColor)}>
          <CatIcon className={cn("w-4 h-4", catConfig.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded", sevConfig.bgColor, sevConfig.color)}>
              {sevConfig.label}
            </span>
            <span className="text-[10px] text-muted-foreground">{signal.detectedDate}</span>
          </div>
          <p className="text-sm font-medium text-foreground truncate">{signal.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{signal.description}</p>
          {signal.impactEstimate && (
            <div className="flex items-center gap-1 mt-1.5">
              <DollarSign className="w-3 h-3 text-red-600" />
              <span className="text-[11px] font-medium text-red-700">{signal.impactEstimate}</span>
            </div>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary shrink-0 mt-1" />
      </div>
    </button>
  );
}

/* ── Mitigation Action Row ──────────────────────────────────── */
function MitigationRow({ action, onStatusChange }: { action: MitigationAction; onStatusChange: (id: string, status: string) => void }) {
  const statusConfig: Record<string, { color: string; icon: React.ElementType }> = {
    pending: { color: "text-amber-700 bg-amber-50", icon: Clock },
    in_progress: { color: "text-blue-700 bg-blue-50", icon: Play },
    completed: { color: "text-emerald-700 bg-emerald-50", icon: CheckCircle2 },
    dismissed: { color: "text-slate-500 bg-slate-50", icon: X },
  };
  const cfg = statusConfig[action.status];
  const StatusIcon = cfg.icon;

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border border-border">
      <div className={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0", cfg.color)}>
        <StatusIcon className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground">{action.title}</p>
          {action.aiGenerated && (
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 flex items-center gap-0.5">
              <Sparkles className="w-2.5 h-2.5" /> AI
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{action.description}</p>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-[10px] text-muted-foreground">Assigned: {action.assignee}</span>
          <span className="text-[10px] text-muted-foreground">Due: {action.dueDate}</span>
        </div>
      </div>
      <div className="flex gap-1 shrink-0">
        {action.status === "pending" && (
          <button onClick={() => onStatusChange(action.id, "in_progress")}
            className="text-[10px] px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors font-medium">
            Start
          </button>
        )}
        {action.status === "in_progress" && (
          <button onClick={() => onStatusChange(action.id, "completed")}
            className="text-[10px] px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors font-medium">
            Complete
          </button>
        )}
        {(action.status === "pending" || action.status === "in_progress") && (
          <button onClick={() => onStatusChange(action.id, "dismissed")}
            className="text-[10px] px-2 py-1 rounded bg-slate-50 text-slate-500 hover:bg-slate-100 transition-colors font-medium">
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}

/* ── AI Recommendation Card ─────────────────────────────────── */
function AIRecCard({ rec, onApply }: { rec: AIRecommendation; onApply: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = recTypeConfig[rec.type] || recTypeConfig.retention_strategy;
  const TypeIcon = cfg.Icon;

  return (
    <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50/50 to-background p-4">
      <div className="flex items-start gap-3">
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", cfg.color)}>
          <TypeIcon className="w-4.5 h-4.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded", cfg.color)}>{cfg.label}</span>
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Brain className="w-3 h-3" /> {rec.confidence}% confidence
            </span>
          </div>
          <p className="text-sm font-semibold text-foreground">{rec.title}</p>
          <p className="text-xs text-muted-foreground mt-1">{rec.summary}</p>

          {expanded && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3">
              <div className="text-[11px] font-semibold text-foreground mb-2">Recommended Steps:</div>
              <div className="space-y-2">
                {rec.detailedSteps.map((step, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <p className="text-xs text-muted-foreground">{step}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 p-2 rounded-lg bg-emerald-50 border border-emerald-200">
                <div className="flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-emerald-700" />
                  <span className="text-[11px] font-semibold text-emerald-800">Estimated Impact:</span>
                </div>
                <p className="text-xs text-emerald-700 mt-0.5">{rec.estimatedImpact}</p>
              </div>
            </motion.div>
          )}

          <div className="flex items-center gap-2 mt-3">
            <button onClick={() => setExpanded(!expanded)}
              className="text-[11px] font-medium text-violet-700 hover:text-violet-900 flex items-center gap-1">
              {expanded ? "Show Less" : "View Steps"} <ChevronDown className={cn("w-3 h-3 transition-transform", expanded && "rotate-180")} />
            </button>
            <button onClick={onApply}
              className="text-[11px] font-medium px-2.5 py-1 rounded-md bg-violet-600 text-white hover:bg-violet-700 transition-colors flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Apply Strategy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Account Detail Panel ───────────────────────────────────── */
function AccountDetailPanel({
  profile, signals, mitigations, recommendations, onClose, onNavigate, riskThresholds, renewalThresholds,
}: {
  profile: AccountRiskProfile;
  signals: DownsellSignal[];
  mitigations: MitigationAction[];
  recommendations: AIRecommendation[];
  onClose: () => void;
  onNavigate: (id: string) => void;
  riskThresholds?: Partial<RiskThresholdConfig>;
  renewalThresholds?: { criticalThresholdDays: number; urgentThresholdDays: number; renewalWindowMonths: number };
}) {
  const account = ACCOUNTS.find(a => a.id === profile.accountId)!;
  const colors = riskScoreColor(profile.compositeScore, riskThresholds);
  const [activeTab, setActiveTab] = useState<"signals" | "mitigations" | "ai" | "notes">("signals");
  const [actionStatuses, setActionStatuses] = useState<Record<string, string>>({});

  const getStatus = (action: MitigationAction) => actionStatuses[action.id] || action.status;

  const handleStatusChange = (id: string, status: string) => {
    setActionStatuses(prev => ({ ...prev, [id]: status }));
    toast.success(`Action ${status === "completed" ? "completed" : status === "in_progress" ? "started" : "dismissed"} — Mitigation action updated successfully.`);
  };

  const engine = useMitigationEngine();

  const handleApplyStrategy = (rec: AIRecommendation) => {
    engine.applyStrategy(rec, profile);
    const taskCount = rec.detailedSteps.length;
    toast.success(`Strategy Applied — "${rec.title}" generated ${taskCount} tasks, scheduled calls, and created mitigation actions.`, {
      description: `Assigned to team. View in Automation Log below.`,
      duration: 5000,
    });
  };

  const tabs = [
    { id: "signals" as const, label: "Signals", count: signals.length },
    { id: "mitigations" as const, label: "Mitigations", count: mitigations.length },
    { id: "ai" as const, label: "AI Insights", count: recommendations.length },
    { id: "notes" as const, label: "Notes", count: 0 },
  ];

  const urgency = account.saasLicense ? getLEDUrgency(account, renewalThresholds) : "n/a";
  const urgencyColors = ledUrgencyColors[urgency];

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-xl p-0 bg-background">
        <SheetHeader className="sr-only"><SheetTitle>{profile.account} — Downsell Mitigation</SheetTitle></SheetHeader>
        <ScrollArea className="h-full">
          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <RiskScoreRing score={profile.compositeScore} size={72} riskThresholds={riskThresholds} />
                <div>
                  <h2 className="text-lg font-bold text-foreground">{profile.account}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", colors.bg, colors.text)}>
                      {riskScoreLabel(profile.compositeScore, riskThresholds)}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <TrendIcon direction={profile.trendDirection} />
                      {profile.trendDirection}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-md hover:bg-accent transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Key Metrics Row */}
            <div className="grid grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-accent/50 text-center">
                <div className="text-[10px] text-muted-foreground font-medium">ARR Exposed</div>
                <div className="text-sm font-bold text-red-700">${(profile.arrExposed / 1000).toFixed(0)}K</div>
              </div>
              <div className="p-3 rounded-lg bg-accent/50 text-center">
                <div className="text-[10px] text-muted-foreground font-medium">Signals</div>
                <div className="text-sm font-bold text-foreground">{profile.signalCount}</div>
              </div>
              <div className="p-3 rounded-lg bg-accent/50 text-center">
                <div className="text-[10px] text-muted-foreground font-medium">Active Actions</div>
                <div className="text-sm font-bold text-blue-700">{profile.activeMitigations}</div>
              </div>
              <div className="p-3 rounded-lg bg-accent/50 text-center">
                <div className="text-[10px] text-muted-foreground font-medium">Health</div>
                <div className={cn("text-sm font-bold", account.health >= 80 ? "text-emerald-700" : account.health >= 60 ? "text-amber-700" : "text-red-700")}>
                  {account.health}
                </div>
              </div>
            </div>

            {/* LED Info (SaaS accounts) */}
            {account.saasLicense && (
              <div className={cn("p-3 rounded-lg border", urgencyColors.border, urgencyColors.bg)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className={cn("w-4 h-4", urgencyColors.text)} />
                    <span className={cn("text-xs font-semibold", urgencyColors.text)}>
                      License End: {formatLEDDate(account.saasLicense.licenseEndDate)}
                    </span>
                  </div>
                  <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", urgencyColors.text, urgencyColors.bg)}>
                    {daysUntilLED(account.saasLicense.licenseEndDate)} days remaining
                  </span>
                </div>
                {account.saasLicense.downsellNotes && (
                  <p className="text-xs text-muted-foreground mt-2 italic">
                    <AlertTriangle className="w-3 h-3 inline mr-1 text-amber-600" />
                    {account.saasLicense.downsellNotes}
                  </p>
                )}
              </div>
            )}

            {/* Inline Actions */}
            <div className="flex flex-wrap gap-2">
              <button onClick={() => toast.success(`Escalation Created — ${profile.account} has been escalated to VP of Customer Success.`)}
                className="text-[11px] font-medium px-3 py-1.5 rounded-md bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-colors flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> Escalate
              </button>
              <button onClick={() => toast.success(`Call Scheduled — Executive call scheduled for ${profile.account}.`)}
                className="text-[11px] font-medium px-3 py-1.5 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> Schedule Exec Call
              </button>
              <button onClick={() => onNavigate("renewals")}
                className="text-[11px] font-medium px-3 py-1.5 rounded-md bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-200 transition-colors flex items-center gap-1.5">
                <ArrowRight className="w-3.5 h-3.5" /> View Renewal
              </button>
              <button onClick={() => onNavigate("accounts")}
                className="text-[11px] font-medium px-3 py-1.5 rounded-md bg-accent text-foreground hover:bg-accent/80 border border-border transition-colors flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" /> Account Detail
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-border">
              {tabs.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={cn("px-3 py-2 text-xs font-medium border-b-2 transition-colors",
                    activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                  )}>
                  {tab.label}
                  {tab.count > 0 && (
                    <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-accent">{tab.count}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
              <motion.div key={activeTab} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
                {activeTab === "signals" && (
                  <div className="space-y-2">
                    {signals.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">No active signals detected</div>
                    ) : (
                      signals.map(signal => (
                        <SignalCard key={signal.id} signal={signal} onClick={() => {
                          if (signal.category === "support") onNavigate("support");
                          else if (signal.category === "csat") onNavigate("csat");
                          else if (signal.category === "billing") onNavigate("ar");
                          else if (signal.category === "outreach") onNavigate("outreach");
                        }} />
                      ))
                    )}
                  </div>
                )}

                {activeTab === "mitigations" && (
                  <div className="space-y-2">
                    {mitigations.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-sm text-muted-foreground mb-3">No mitigation actions yet</p>
                        <button onClick={() => setActiveTab("ai")}
                          className="text-xs font-medium px-3 py-1.5 rounded-md bg-violet-600 text-white hover:bg-violet-700 transition-colors flex items-center gap-1 mx-auto">
                          <Sparkles className="w-3 h-3" /> Get AI Recommendations
                        </button>
                      </div>
                    ) : (
                      mitigations.map(action => (
                        <MitigationRow key={action.id} action={{ ...action, status: getStatus(action) as any }} onStatusChange={handleStatusChange} />
                      ))
                    )}
                  </div>
                )}

                {activeTab === "ai" && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-violet-50 border border-violet-200">
                      <Brain className="w-5 h-5 text-violet-700" />
                      <div>
                        <p className="text-xs font-semibold text-violet-800">AI-Powered Analysis</p>
                        <p className="text-[11px] text-violet-600">Recommendations generated from {signals.length} signals across {new Set(signals.map(s => s.category)).size} categories</p>
                      </div>
                    </div>
                    {recommendations.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        No AI recommendations available — risk level is low
                      </div>
                    ) : (
                      recommendations.map(rec => (
                        <AIRecCard key={rec.id} rec={rec} onApply={() => handleApplyStrategy(rec)} />
                      ))
                    )}
                  </div>
                )}

                {activeTab === "notes" && (
                  <ActivityNotes section="downsell" account={profile.account} itemRef={`downsell-${profile.account}`} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN VIEW
   ══════════════════════════════════════════════════════════════ */
export default function DownsellMitigationView({ onNavigate }: DownsellMitigationViewProps) {
  const engine = useMitigationEngine();
  const { settings } = useAdminSettings();
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<SignalCategory | "all">("all");
  const [severityFilter, setSeverityFilter] = useState<SignalSeverity | "all">("all");
  const [sortBy, setSortBy] = useState<"risk" | "signals" | "arr" | "name">("risk");
  const [drillDownKpi, setDrillDownKpi] = useState<string | null>(null);
  const toggleDrill = (key: string) => setDrillDownKpi(prev => prev === key ? null : key);

  // Build config from admin settings for risk calculations
  const downsellConfig: DownsellWeightsConfig = useMemo(() => ({
    signalWeights: settings.downsell.signalWeights,
    renewalThresholds: {
      criticalThresholdDays: settings.renewals.criticalThresholdDays,
      urgentThresholdDays: settings.renewals.urgentThresholdDays,
      renewalWindowMonths: settings.renewals.renewalWindowMonths,
    },
  }), [settings.downsell.signalWeights, settings.renewals]);

  // Map admin risk thresholds to the format used by riskScoreColor/riskScoreLabel
  const riskThresholds: Partial<RiskThresholdConfig> = useMemo(() => ({
    low: settings.downsell.riskThresholds.low,
    medium: settings.downsell.riskThresholds.medium,
    high: settings.downsell.riskThresholds.high,
  }), [settings.downsell.riskThresholds]);

  const riskProfiles = useMemo(() => getAllRiskProfiles(downsellConfig), [downsellConfig]);

  /* KPI calculations */
  const totalARRExposed = useMemo(() => riskProfiles.reduce((sum, p) => sum + p.arrExposed, 0), [riskProfiles]);
  const totalSignals = useMemo(() => DOWNSELL_SIGNALS.filter(s => !s.resolved).length, []);
  const criticalAccounts = useMemo(() => riskProfiles.filter(p => p.compositeScore >= (settings.downsell.riskThresholds.high || 75)).length, [riskProfiles, settings.downsell.riskThresholds.high]);
  const activeMitigations = useMemo(() => MITIGATION_ACTIONS.filter(m => m.status === "in_progress" || m.status === "pending").length, []);

  /* Filtered & sorted signals */
  const filteredSignals = useMemo(() => {
    let result = DOWNSELL_SIGNALS.filter(s => !s.resolved);
    if (categoryFilter !== "all") result = result.filter(s => s.category === categoryFilter);
    if (severityFilter !== "all") result = result.filter(s => s.severity === severityFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s => s.title.toLowerCase().includes(q) || s.account.toLowerCase().includes(q) || s.description.toLowerCase().includes(q));
    }
    return result;
  }, [categoryFilter, severityFilter, searchQuery]);

  /* Sorted profiles */
  const sortedProfiles = useMemo(() => {
    const profiles = [...riskProfiles];
    switch (sortBy) {
      case "risk": return profiles.sort((a, b) => b.compositeScore - a.compositeScore);
      case "signals": return profiles.sort((a, b) => b.signalCount - a.signalCount);
      case "arr": return profiles.sort((a, b) => b.arrExposed - a.arrExposed);
      case "name": return profiles.sort((a, b) => a.account.localeCompare(b.account));
      default: return profiles;
    }
  }, [riskProfiles, sortBy]);

  /* Signal category breakdown */
  const categoryBreakdown = useMemo(() => {
    const counts: Record<SignalCategory, number> = { support: 0, csat: 0, outreach: 0, usage: 0, billing: 0, engagement: 0 };
    DOWNSELL_SIGNALS.filter(s => !s.resolved).forEach(s => counts[s.category]++);
    return counts;
  }, []);

  /* Selected account data */
  const selectedProfile = selectedAccountId ? riskProfiles.find(p => p.accountId === selectedAccountId) : null;
  const selectedSignals = selectedAccountId ? DOWNSELL_SIGNALS.filter(s => s.accountId === selectedAccountId && !s.resolved) : [];
  const selectedMitigations = selectedAccountId ? MITIGATION_ACTIONS.filter(m => m.accountId === selectedAccountId) : [];
  const selectedRecommendations = selectedAccountId ? AI_RECOMMENDATIONS.filter(r => r.accountId === selectedAccountId) : [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Downsell Mitigation</h1>
              <p className="text-xs text-muted-foreground">AI-powered risk detection and prevention during renewal periods</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {engine.isAnalyzing && (
            <span className="text-xs text-violet-600 flex items-center gap-1.5 animate-pulse">
              <Brain className="w-3.5 h-3.5 animate-spin" /> Analyzing...
            </span>
          )}
          {engine.stats.totalTasksGenerated > 0 && (
            <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              {engine.stats.totalTasksGenerated} tasks generated
            </span>
          )}
          <button onClick={() => {
            engine.runAIAnalysis(riskProfiles, settings.downsell.riskThresholds.high || 75);
            toast.info("AI is scanning all accounts for new downsell signals...", { duration: 3000 });
          }}
            disabled={engine.isAnalyzing}
            className="text-xs font-medium px-4 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed">
            <Brain className="w-3.5 h-3.5" /> Run AI Analysis
          </button>
          <button onClick={() => {
            toast.info("Generating executive summary PDF...", { duration: 2000 });
            setTimeout(() => {
              generateExecutivePDF({
                tasks: engine.tasks,
                scheduledCalls: engine.scheduledCalls,
                automationLog: engine.automationLog,
                engineStats: engine.stats,
                downsellConfig: downsellConfig,
                riskThresholds: riskThresholds,
              });
              toast.success("PDF downloaded successfully", { duration: 3000 });
            }, 500);
          }}
            className="text-xs font-medium px-4 py-2 rounded-lg bg-gradient-to-r from-amber-600 to-amber-700 text-white hover:from-amber-700 hover:to-amber-800 transition-colors flex items-center gap-1.5 shadow-sm">
            <Download className="w-3.5 h-3.5" /> Export PDF
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { key: "arrRisk", label: "ARR AT RISK", value: `$${(totalARRExposed / 1000).toFixed(0)}K`, sub: `Across ${riskProfiles.filter(p => p.arrExposed > 0).length} accounts`, icon: DollarSign, iconColor: "text-red-500", valueColor: "text-red-700" },
          { key: "critical", label: "CRITICAL ACCOUNTS", value: String(criticalAccounts), sub: `Risk score ≥ ${settings.downsell.riskThresholds.high || 75}`, icon: AlertTriangle, iconColor: "text-orange-500", valueColor: "text-orange-700" },
          { key: "signals", label: "ACTIVE SIGNALS", value: String(totalSignals), sub: `${DOWNSELL_SIGNALS.filter(s => s.severity === "critical" && !s.resolved).length} critical`, icon: Activity, iconColor: "text-amber-500", valueColor: "text-foreground" },
          { key: "mitigations", label: "MITIGATIONS ACTIVE", value: String(activeMitigations), sub: `${MITIGATION_ACTIONS.filter(m => m.status === "completed").length} completed`, icon: ShieldAlert, iconColor: "text-blue-500", valueColor: "text-blue-700" },
        ].map(k => {
          const isActive = drillDownKpi === k.key;
          return (
            <button key={k.key} onClick={() => toggleDrill(k.key)}
              className={cn("p-4 rounded-xl border bg-card text-left transition-all cursor-pointer hover:shadow-md hover:border-primary/40",
                isActive ? "border-primary ring-2 ring-primary/20 shadow-md" : "border-border")}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-muted-foreground tracking-wide">{k.label}</span>
                <k.icon className={cn("w-4 h-4", k.iconColor)} />
              </div>
              <div className={cn("text-2xl font-bold", k.valueColor)}>{k.value}</div>
              <div className="text-[11px] text-muted-foreground mt-1">{k.sub}</div>
              <p className="text-[8px] text-primary/60 font-medium uppercase tracking-wider mt-1">Click to drill down</p>
            </button>
          );
        })}
      </div>

      {/* ── Downsell Drill-Down Panel ── */}
      <AnimatePresence mode="wait">
        {drillDownKpi && (
          <motion.div key={drillDownKpi} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
            <div className="rounded-xl border border-primary/20 bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  {drillDownKpi === "arrRisk" && <><DollarSign className="w-4 h-4 text-red-600" /> ARR at Risk — Account Breakdown</>}
                  {drillDownKpi === "critical" && <><AlertTriangle className="w-4 h-4 text-orange-600" /> Critical Accounts — Details</>}
                  {drillDownKpi === "signals" && <><Activity className="w-4 h-4 text-amber-600" /> Active Signals — Breakdown</>}
                  {drillDownKpi === "mitigations" && <><ShieldAlert className="w-4 h-4 text-blue-600" /> Mitigations — Status</>}
                </h3>
                <button onClick={() => setDrillDownKpi(null)} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-muted transition-colors">Close</button>
              </div>

              {/* ARR at Risk */}
              {drillDownKpi === "arrRisk" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Total Exposed</p><p className="text-lg font-bold font-mono text-red-600">${(totalARRExposed / 1000).toFixed(0)}K</p></div>
                    <div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Accounts</p><p className="text-lg font-bold font-mono text-foreground">{riskProfiles.filter(p => p.arrExposed > 0).length}</p></div>
                    <div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Avg Exposure</p><p className="text-lg font-bold font-mono text-foreground">${riskProfiles.filter(p => p.arrExposed > 0).length > 0 ? ((totalARRExposed / riskProfiles.filter(p => p.arrExposed > 0).length) / 1000).toFixed(0) : 0}K</p></div>
                  </div>
                  <div className="rounded-lg border border-border overflow-hidden"><table className="w-full text-xs"><thead><tr className="bg-muted/50"><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Account</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">ARR Exposed</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Risk Score</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Signals</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Trend</th></tr></thead><tbody className="divide-y divide-border">{riskProfiles.filter(p => p.arrExposed > 0).sort((a, b) => b.arrExposed - a.arrExposed).map(p => (<tr key={p.accountId}><td className="px-3 py-2 font-medium text-foreground">{p.account}</td><td className="px-3 py-2 font-mono font-medium text-red-600">${(p.arrExposed / 1000).toFixed(0)}K</td><td className="px-3 py-2"><span className={cn("font-bold font-mono", riskScoreColor(p.compositeScore, riskThresholds))}>{p.compositeScore}</span></td><td className="px-3 py-2 font-mono text-foreground">{p.signalCount}</td><td className="px-3 py-2"><span className={cn("text-[10px]", p.trendDirection === "improving" ? "text-emerald-600" : p.trendDirection === "worsening" ? "text-red-600" : "text-amber-600")}>{p.trendDirection === "improving" ? "↑ Improving" : p.trendDirection === "worsening" ? "↓ Worsening" : "→ Stable"}</span></td></tr>))}</tbody></table></div>
                </div>
              )}

              {/* Critical Accounts */}
              {drillDownKpi === "critical" && (
                <div className="space-y-3">
                  <div className="rounded-lg border border-border overflow-hidden"><table className="w-full text-xs"><thead><tr className="bg-muted/50"><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Account</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Risk Score</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Label</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">ARR Exposed</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Signals</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Mitigations</th></tr></thead><tbody className="divide-y divide-border">{riskProfiles.filter(p => p.compositeScore >= (settings.downsell.riskThresholds.high || 75)).sort((a, b) => b.compositeScore - a.compositeScore).map(p => (<tr key={p.accountId}><td className="px-3 py-2 font-medium text-foreground">{p.account}</td><td className="px-3 py-2"><span className={cn("font-bold font-mono", riskScoreColor(p.compositeScore, riskThresholds))}>{p.compositeScore}</span></td><td className="px-3 py-2"><span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-red-50 text-red-700">{riskScoreLabel(p.compositeScore, riskThresholds)}</span></td><td className="px-3 py-2 font-mono text-red-600">${(p.arrExposed / 1000).toFixed(0)}K</td><td className="px-3 py-2 font-mono text-foreground">{p.signalCount}</td><td className="px-3 py-2 text-foreground">{p.activeMitigations} active / {p.completedMitigations} done</td></tr>))}</tbody></table></div>
                </div>
              )}

              {/* Active Signals */}
              {drillDownKpi === "signals" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                    {(Object.entries(categoryBreakdown) as [SignalCategory, number][]).map(([cat, count]) => (
                      <div key={cat} className="rounded-lg bg-muted/50 p-3 text-center">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{signalCategoryConfig[cat].label}</p>
                        <p className={cn("text-lg font-bold font-mono", count > 0 ? "text-foreground" : "text-muted-foreground")}>{count}</p>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-lg border border-border overflow-hidden"><table className="w-full text-xs"><thead><tr className="bg-muted/50"><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Signal</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Account</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Category</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Severity</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Impact</th></tr></thead><tbody className="divide-y divide-border">{DOWNSELL_SIGNALS.filter(s => !s.resolved).map(s => (<tr key={s.id}><td className="px-3 py-2 text-foreground">{s.title}</td><td className="px-3 py-2 text-muted-foreground">{s.account}</td><td className="px-3 py-2"><span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", signalCategoryConfig[s.category].bgColor, signalCategoryConfig[s.category].color)}>{signalCategoryConfig[s.category].label}</span></td><td className="px-3 py-2"><span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", signalSeverityConfig[s.severity].bgColor, signalSeverityConfig[s.severity].color)}>{s.severity}</span></td><td className="px-3 py-2 text-muted-foreground">{s.impactEstimate || "—"}</td></tr>))}</tbody></table></div>
                </div>
              )}

              {/* Mitigations */}
              {drillDownKpi === "mitigations" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Pending</p><p className="text-lg font-bold font-mono text-amber-600">{MITIGATION_ACTIONS.filter(m => m.status === "pending").length}</p></div>
                    <div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">In Progress</p><p className="text-lg font-bold font-mono text-blue-600">{MITIGATION_ACTIONS.filter(m => m.status === "in_progress").length}</p></div>
                    <div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Completed</p><p className="text-lg font-bold font-mono text-emerald-600">{MITIGATION_ACTIONS.filter(m => m.status === "completed").length}</p></div>
                    <div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Dismissed</p><p className="text-lg font-bold font-mono text-muted-foreground">{MITIGATION_ACTIONS.filter(m => m.status === "dismissed").length}</p></div>
                  </div>
                  <div className="rounded-lg border border-border overflow-hidden"><table className="w-full text-xs"><thead><tr className="bg-muted/50"><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Action</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Account</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Owner</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Status</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Due</th></tr></thead><tbody className="divide-y divide-border">{MITIGATION_ACTIONS.map(m => (<tr key={m.id} className={m.status === "completed" || m.status === "dismissed" ? "opacity-50" : ""}><td className="px-3 py-2 text-foreground">{m.title}</td><td className="px-3 py-2 text-muted-foreground">{m.account}</td><td className="px-3 py-2 text-muted-foreground">{m.assignee}</td><td className="px-3 py-2"><span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", m.status === "completed" ? "bg-emerald-50 text-emerald-700" : m.status === "in_progress" ? "bg-blue-50 text-blue-700" : m.status === "pending" ? "bg-amber-50 text-amber-700" : "bg-gray-50 text-gray-700")}>{m.status.replace("_", " ")}</span></td><td className="px-3 py-2 text-muted-foreground">{m.dueDate || "—"}</td></tr>))}</tbody></table></div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Two-column layout: Risk Matrix + Signal Breakdown */}
      <div className="grid grid-cols-5 gap-4">
        {/* Account Risk Matrix — 3 cols */}
        <div className="col-span-3 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">Account Risk Matrix</h2>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">Sort:</span>
              {(["risk", "arr", "signals", "name"] as const).map(s => (
                <button key={s} onClick={() => setSortBy(s)}
                  className={cn("text-[10px] px-2 py-0.5 rounded-full transition-colors",
                    sortBy === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
                  )}>
                  {s === "risk" ? "Risk" : s === "arr" ? "ARR" : s === "signals" ? "Signals" : "Name"}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {sortedProfiles.map(profile => {
              const colors = riskScoreColor(profile.compositeScore, riskThresholds);
              const account = ACCOUNTS.find(a => a.id === profile.accountId)!;
              return (
                <button key={profile.accountId} onClick={() => setSelectedAccountId(profile.accountId)}
                  className="w-full flex items-center gap-4 p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-accent/30 transition-all text-left group">
                  <RiskScoreRing score={profile.compositeScore} size={44} riskThresholds={riskThresholds} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{profile.account}</span>
                      <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full", colors.bg, colors.text)}>
                        {riskScoreLabel(profile.compositeScore, riskThresholds)}
                      </span>
                      <TrendIcon direction={profile.trendDirection} />
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] text-muted-foreground">{profile.signalCount} signals</span>
                      <span className="text-[10px] text-muted-foreground">{profile.activeMitigations} mitigations</span>
                      {account.saasLicense && (
                        <span className="text-[10px] text-muted-foreground">LED: {formatLEDDate(account.saasLicense.licenseEndDate)}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-red-700">${(profile.arrExposed / 1000).toFixed(0)}K</div>
                    <div className="text-[10px] text-muted-foreground">at risk</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary shrink-0" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Signal Category Breakdown — 2 cols */}
        <div className="col-span-2 space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground mb-3">Signal Breakdown</h2>
            <div className="space-y-2">
              {(Object.entries(categoryBreakdown) as [SignalCategory, number][])
                .sort(([, a], [, b]) => b - a)
                .map(([cat, count]) => {
                  const cfg = signalCategoryConfig[cat];
                  const CatIcon = categoryIcons[cat];
                  const maxCount = Math.max(...Object.values(categoryBreakdown), 1);
                  return (
                    <button key={cat} onClick={() => setCategoryFilter(cat === categoryFilter ? "all" : cat)}
                      className={cn("w-full flex items-center gap-3 p-2.5 rounded-lg transition-all text-left",
                        categoryFilter === cat ? "bg-accent border border-primary/30" : "hover:bg-accent/50"
                      )}>
                      <div className={cn("w-7 h-7 rounded-md flex items-center justify-center", cfg.bgColor)}>
                        <CatIcon className={cn("w-3.5 h-3.5", cfg.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-foreground">{cfg.label}</span>
                          <span className="text-xs font-bold text-foreground">{count}</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-muted/50 mt-1.5">
                          <div className={cn("h-full rounded-full transition-all", cfg.bgColor.replace("bg-", "bg-").replace("50", "400"))}
                            style={{ width: `${(count / maxCount) * 100}%`, backgroundColor: cfg.color.includes("red") ? "#ef4444" : cfg.color.includes("amber") ? "#f59e0b" : cfg.color.includes("blue") ? "#3b82f6" : cfg.color.includes("violet") ? "#8b5cf6" : cfg.color.includes("orange") ? "#f97316" : "#64748b" }} />
                        </div>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>

          {/* AI Recommendations Summary */}
          <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50/30 to-background p-4">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-4 h-4 text-violet-700" />
              <h2 className="text-sm font-semibold text-foreground">AI Recommendations</h2>
            </div>
            <div className="space-y-2">
              {AI_RECOMMENDATIONS.slice(0, 3).map(rec => {
                const cfg = recTypeConfig[rec.type];
                return (
                  <button key={rec.id} onClick={() => setSelectedAccountId(rec.accountId)}
                    className="w-full text-left p-2.5 rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded", cfg.color)}>{cfg.label}</span>
                      <span className="text-[10px] text-muted-foreground">{rec.confidence}% confidence</span>
                    </div>
                    <p className="text-xs font-medium text-foreground">{rec.title}</p>
                    <p className="text-[11px] text-emerald-700 mt-0.5">{rec.estimatedImpact}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Signal Feed */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground">Signal Feed</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search signals..." className="pl-8 pr-3 py-1.5 text-xs rounded-md border border-border bg-background w-48 focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value as any)}
              className="text-xs px-2 py-1.5 rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary">
              <option value="all">All Severity</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="info">Info</option>
            </select>
            {(categoryFilter !== "all" || severityFilter !== "all" || searchQuery) && (
              <button onClick={() => { setCategoryFilter("all"); setSeverityFilter("all"); setSearchQuery(""); }}
                className="text-[10px] px-2 py-1 rounded-md bg-accent text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          {filteredSignals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">No signals match your filters</div>
          ) : (
            filteredSignals.map(signal => (
              <SignalCard key={signal.id} signal={signal} onClick={() => setSelectedAccountId(signal.accountId)} />
            ))
          )}
        </div>
        <div className="text-[10px] text-muted-foreground mt-3 text-right">{filteredSignals.length} of {totalSignals} signals</div>
      </div>

      {/* ── Automation Engine Results ── */}
      {(engine.stats.totalTasksGenerated > 0 || engine.stats.callsScheduled > 0 || engine.automationLog.length > 0) && (
        <div className="grid grid-cols-2 gap-4">
          {/* Generated Tasks */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-600" />
                <h2 className="text-sm font-semibold text-foreground">Auto-Generated Tasks</h2>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700">
                  {engine.stats.tasksPending} pending
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground">{engine.stats.tasksCompleted}/{engine.stats.totalTasksGenerated} completed</span>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {engine.getPendingTasks().slice(0, 8).map(task => {
                const prioColors: Record<string, string> = {
                  critical: "bg-red-50 text-red-700 border-red-200",
                  high: "bg-orange-50 text-orange-700 border-orange-200",
                  normal: "bg-blue-50 text-blue-700 border-blue-200",
                  low: "bg-slate-50 text-slate-600 border-slate-200",
                };
                const catIcons: Record<string, React.ElementType> = {
                  call: Users, email: Send, meeting: Users, document: FileText,
                  review: Eye, outreach: Send, escalation: AlertTriangle, general: Zap,
                };
                const CatIcon = catIcons[task.category] || Zap;
                return (
                  <div key={task.id} className="flex items-start gap-3 p-2.5 rounded-lg border border-border hover:bg-accent/30 transition-colors">
                    <div className={cn("w-7 h-7 rounded-md flex items-center justify-center shrink-0",
                      task.priority === "critical" ? "bg-red-50" : task.priority === "high" ? "bg-orange-50" : "bg-blue-50")}>
                      <CatIcon className={cn("w-3.5 h-3.5",
                        task.priority === "critical" ? "text-red-600" : task.priority === "high" ? "text-orange-600" : "text-blue-600")} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded border", prioColors[task.priority])}>
                          {task.priority}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 flex items-center gap-0.5">
                          <Sparkles className="w-2.5 h-2.5" /> AI
                        </span>
                      </div>
                      <p className="text-xs font-medium text-foreground truncate">{task.title}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] text-muted-foreground">{task.assignee}</span>
                        <span className="text-[10px] text-muted-foreground">Due: {task.dueDate}</span>
                        <span className="text-[10px] text-muted-foreground">{task.account}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {task.status === "pending" && (
                        <button onClick={() => engine.updateTaskStatus(task.id, "in_progress")}
                          className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium">Start</button>
                      )}
                      {task.status === "in_progress" && (
                        <button onClick={() => engine.updateTaskStatus(task.id, "completed")}
                          className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium">Done</button>
                      )}
                    </div>
                  </div>
                );
              })}
              {engine.getPendingTasks().length === 0 && (
                <div className="text-center py-6 text-muted-foreground text-xs">No pending tasks — click Apply Strategy or Run AI Analysis to generate</div>
              )}
            </div>
          </div>

          {/* Scheduled Calls + Automation Log */}
          <div className="space-y-4">
            {/* Scheduled Calls */}
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-semibold text-foreground">Scheduled Calls</h2>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700">
                  {engine.stats.callsScheduled} upcoming
                </span>
              </div>
              <div className="space-y-2">
                {engine.getUpcomingCalls().slice(0, 4).map(call => {
                  const typeColors: Record<string, string> = {
                    executive: "text-violet-700 bg-violet-50",
                    stakeholder: "text-blue-700 bg-blue-50",
                    qbr: "text-emerald-700 bg-emerald-50",
                    escalation: "text-red-700 bg-red-50",
                    discovery: "text-amber-700 bg-amber-50",
                    value_review: "text-indigo-700 bg-indigo-50",
                  };
                  return (
                    <div key={call.id} className="p-2.5 rounded-lg border border-border">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded", typeColors[call.callType])}>
                            {call.callType.replace("_", " ")}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{call.duration}min</span>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => engine.updateCallStatus(call.id, "completed")}
                            className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium">Done</button>
                          <button onClick={() => engine.updateCallStatus(call.id, "cancelled")}
                            className="text-[10px] px-2 py-0.5 rounded bg-slate-50 text-slate-500 hover:bg-slate-100 font-medium">Cancel</button>
                        </div>
                      </div>
                      <p className="text-xs font-medium text-foreground truncate">{call.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-muted-foreground">{call.account}</span>
                        <span className="text-[10px] text-muted-foreground">{call.participants.join(", ")}</span>
                      </div>
                      {call.agenda && call.agenda.length > 0 && (
                        <div className="mt-1.5 pl-2 border-l-2 border-blue-200">
                          {call.agenda.slice(0, 3).map((item, i) => (
                            <p key={i} className="text-[10px] text-muted-foreground">{item}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                {engine.getUpcomingCalls().length === 0 && (
                  <div className="text-center py-4 text-muted-foreground text-xs">No calls scheduled yet</div>
                )}
              </div>
            </div>

            {/* Automation Log */}
            <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50/30 to-background p-4">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-violet-600" />
                <h2 className="text-sm font-semibold text-foreground">Automation Log</h2>
              </div>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {engine.getRecentEvents(6).map(evt => {
                  const evtIcons: Record<string, React.ElementType> = {
                    strategy_applied: Sparkles,
                    ai_analysis_run: Brain,
                    task_generated: Zap,
                    call_scheduled: Calendar,
                    escalation_created: AlertTriangle,
                    mitigation_created: ShieldAlert,
                    notification_sent: Send,
                  };
                  const EvtIcon = evtIcons[evt.type] || Activity;
                  return (
                    <div key={evt.id} className="flex items-start gap-2 p-1.5 rounded">
                      <EvtIcon className="w-3 h-3 text-violet-500 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium text-foreground truncate">{evt.title}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{evt.description}</p>
                      </div>
                      <span className="text-[9px] text-muted-foreground shrink-0">
                        {new Date(evt.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  );
                })}
                {engine.automationLog.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground text-xs">
                    No automation events yet — Apply a strategy or run AI analysis to begin
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Panel */}
      {selectedProfile && (
        <AccountDetailPanel
          profile={selectedProfile}
          signals={selectedSignals}
          mitigations={selectedMitigations}
          recommendations={selectedRecommendations}
          onClose={() => setSelectedAccountId(null)}
          onNavigate={onNavigate}
          riskThresholds={riskThresholds}
          renewalThresholds={{
            criticalThresholdDays: settings.renewals.criticalThresholdDays,
            urgentThresholdDays: settings.renewals.urgentThresholdDays,
            renewalWindowMonths: settings.renewals.renewalWindowMonths,
          }}
        />
      )}
    </div>
  );
}
