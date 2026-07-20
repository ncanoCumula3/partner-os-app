/*
 * MomentInTimeView — Full customer snapshot model
 * A comprehensive "Moment in Time" view showing every data metric and
 * actionable activity for a selected account in one place.
 *
 * Sections:
 *  1. Account Header — identity, health gauge, tier, stage, contact
 *  2. Key Metrics Strip — ARR, CSAT, Risk Score, Renewal Countdown, Open Tickets, Outreach
 *  3. Signals & Risk — downsell signals, risk breakdown, AI recommendations
 *  4. Actionable Activities — tasks, scheduled calls, mitigations, invoices
 *  5. Activity Timeline — recent history
 */
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAdminSettings } from "@/contexts/AdminSettingsContext";
import { useMitigationEngine } from "@/contexts/MitigationEngineContext";
import {
  getProjectBudgetPct, getProjectDaysRemaining,
  healthColors as projectHealthColors, projectStatusColors, projectStatusLabels,
  projectTypeLabels, projectTypeColors, billingModelLabels,
  taskStatusLabels, noteCategoryLabels, noteCategoryColors,
  type ServiceProject,
} from "@/lib/projects";
import { useProjects } from "@/contexts/ProjectsContext";
import { usePipeline } from "@/contexts/PipelineContext";
import { DEAL_STAGES, dealTypeColors, getDaysInStage, getWeightedValue } from "@/lib/pipeline";
import {
  ACCOUNTS, TICKETS, OUTREACH, INVOICES,
  DOWNSELL_SIGNALS, MITIGATION_ACTIONS, AI_RECOMMENDATIONS,
  healthColor, healthBg, tierColors, statusColors, priorityColors,
  customerTypeColors, downsellRiskColors, renewalStatusColors,
  daysUntilLED, getLEDUrgency, formatLEDDate,
  ledUrgencyColors, getLEDUrgencyLabels,
  signalCategoryConfig, signalSeverityConfig,
  calculateAccountRiskProfile, riskScoreColor, riskScoreLabel,
  type Account, type DownsellWeightsConfig, type RiskThresholdConfig,
} from "@/lib/data";
import {
  Building2, Globe, Shield, TrendingUp, AlertTriangle, Star,
  CalendarClock, Receipt, Send, LifeBuoy, Clock, Phone, Mail,
  User, ChevronRight, ChevronDown, Activity, UserX, Sparkles,
  Package, Users, AlertOctagon, TrendingDown, CheckCircle2,
  Circle, ArrowUpRight, Zap, Brain, Calendar, MessageSquare,
  Search, Eye, Target, Lightbulb, ArrowLeft,  FolderKanban, Layers, Pause, FileText, DollarSign, Handshake,} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

/* ── CSAT data (mirrored from CSATView for snapshot) ──────── */
interface CSATSnapshot {
  score: number;
  previousScore: number;
  trend: "up" | "down" | "stable";
  sentiment: "positive" | "neutral" | "negative";
  surveyDate: string;
  comment: string;
}

const CSAT_BY_ACCOUNT: Record<string, CSATSnapshot> = {
  "Driftwood Capital": { score: 5, previousScore: 4, trend: "up", sentiment: "positive", surveyDate: "Apr 8, 2026", comment: "Team is incredibly responsive." },
  "Apex Manufacturing": { score: 4, previousScore: 4, trend: "stable", sentiment: "neutral", surveyDate: "Apr 5, 2026", comment: "Good support, could improve documentation." },
  "BlueWave Logistics": { score: 2, previousScore: 3, trend: "down", sentiment: "negative", surveyDate: "Apr 9, 2026", comment: "Multi-currency issue unresolved for 3 days." },
  "ClearPath Retail": { score: 4, previousScore: 3, trend: "up", sentiment: "neutral", surveyDate: "Apr 3, 2026", comment: "Onboarding was smooth." },
  "Edgeline Foods": { score: 3, previousScore: 2, trend: "up", sentiment: "neutral", surveyDate: "Apr 7, 2026", comment: "Support response improved but needs work." },
};

/* ── Contact details ──────────────────────────────────────── */
interface ContactDetail {
  email: string;
  phone: string;
  role: string;
  department: string;
  location: string;
}

const CONTACT_DETAILS: Record<number, ContactDetail> = {
  1: { email: "dana.reyes@apexmfg.com", phone: "+1 (415) 555-0142", role: "VP of Operations", department: "Operations", location: "San Francisco, CA" },
  2: { email: "marcus.lin@bluewave.io", phone: "+1 (312) 555-0198", role: "Director of IT", department: "Information Technology", location: "Chicago, IL" },
  3: { email: "priya.nair@clearpath.com", phone: "+1 (646) 555-0173", role: "Head of E-Commerce", department: "Digital Commerce", location: "New York, NY" },
  4: { email: "tom.hargrove@driftwood.com", phone: "+1 (512) 555-0156", role: "CFO", department: "Finance", location: "Austin, TX" },
  5: { email: "sofia.ruiz@edgeline.co", phone: "+1 (305) 555-0134", role: "Operations Manager", department: "Supply Chain", location: "Miami, FL" },
};

/* ── Activity timeline data ───────────────────────────────── */
interface ActivityEvent {
  id: string;
  type: "call" | "email" | "meeting" | "ticket" | "milestone" | "note";
  title: string;
  description: string;
  date: string;
  time: string;
}

const ACTIVITY_TIMELINE: Record<number, ActivityEvent[]> = {
  1: [
    { id: "a1", type: "meeting", title: "QBR Prep Call", description: "Reviewed Q1 metrics and expansion targets with Dana", date: "Apr 10", time: "2:00 PM" },
    { id: "a2", type: "email", title: "Expansion Proposal Sent", description: "Sent pricing for 3 additional modules", date: "Apr 8", time: "10:30 AM" },
    { id: "a3", type: "milestone", title: "Health Score Hit 92", description: "Crossed the 90-point threshold", date: "Apr 5", time: "—" },
    { id: "a4", type: "call", title: "Monthly Check-in", description: "Discussed inventory module performance", date: "Mar 28", time: "3:00 PM" },
  ],
  2: [
    { id: "b1", type: "call", title: "Health Check Scheduled", description: "Booked urgent health check with Marcus for Apr 12", date: "Apr 9", time: "4:00 PM" },
    { id: "b2", type: "ticket", title: "Ticket T-1041 Escalated", description: "Revenue recognition module errors — critical", date: "Apr 7", time: "11:00 AM" },
    { id: "b3", type: "email", title: "Follow-up on Integration Issues", description: "Sent troubleshooting guide for Salesforce sync", date: "Apr 3", time: "2:30 PM" },
    { id: "b4", type: "meeting", title: "Escalation Review", description: "Internal meeting to discuss risk mitigation", date: "Mar 30", time: "10:00 AM" },
  ],
  3: [
    { id: "c1", type: "email", title: "Check-in Reminder Sent", description: "Sent agenda for upcoming Apr 22 check-in", date: "Apr 10", time: "9:00 AM" },
    { id: "c2", type: "milestone", title: "Ticket T-1035 Resolved", description: "Email sequence issue fixed", date: "Apr 6", time: "—" },
    { id: "c3", type: "call", title: "Quarterly Review", description: "Reviewed HubSpot adoption metrics", date: "Mar 22", time: "1:00 PM" },
  ],
  4: [
    { id: "d1", type: "meeting", title: "Upsell Discovery Call", description: "Deep dive into reporting needs", date: "Apr 11", time: "11:00 AM" },
    { id: "d2", type: "email", title: "ROI Report Delivered", description: "Sent custom ROI analysis showing 340% return", date: "Apr 7", time: "3:00 PM" },
    { id: "d3", type: "milestone", title: "Health Score Hit 95", description: "Highest health score in portfolio", date: "Apr 4", time: "—" },
    { id: "d4", type: "call", title: "Executive Sponsor Intro", description: "Connected Tom with VP of Customer Success", date: "Mar 25", time: "2:00 PM" },
  ],
  5: [
    { id: "e1", type: "call", title: "Escalation Call Scheduled", description: "Urgent call with Sofia re: declining health", date: "Apr 10", time: "10:00 AM" },
    { id: "e2", type: "email", title: "Recovery Plan Sent", description: "Shared 30-day recovery plan", date: "Apr 8", time: "1:30 PM" },
    { id: "e3", type: "meeting", title: "Internal Risk Review", description: "Team meeting to assess churn probability", date: "Apr 4", time: "9:00 AM" },
    { id: "e4", type: "note", title: "Budget Concerns Flagged", description: "Sofia mentioned potential budget cuts", date: "Mar 29", time: "—" },
  ],
};

const activityIcon: Record<string, React.ReactNode> = {
  call: <Phone className="w-3.5 h-3.5" />,
  email: <Send className="w-3.5 h-3.5" />,
  meeting: <Calendar className="w-3.5 h-3.5" />,
  ticket: <AlertTriangle className="w-3.5 h-3.5" />,
  milestone: <Sparkles className="w-3.5 h-3.5" />,
  note: <MessageSquare className="w-3.5 h-3.5" />,
};

const activityColor: Record<string, string> = {
  call: "text-sky-700 bg-sky-50 border-sky-200",
  email: "text-indigo-700 bg-indigo-50 border-indigo-200",
  meeting: "text-violet-700 bg-violet-50 border-violet-200",
  ticket: "text-amber-700 bg-amber-50 border-amber-200",
  milestone: "text-emerald-700 bg-emerald-50 border-emerald-200",
  note: "text-slate-600 bg-slate-50 border-slate-200",
};

const sentimentConfig: Record<string, { bg: string; text: string }> = {
  positive: { bg: "bg-emerald-50", text: "text-emerald-700" },
  neutral: { bg: "bg-amber-50", text: "text-amber-600" },
  negative: { bg: "bg-red-50", text: "text-red-600" },
};

const categoryIcons: Record<string, React.ElementType> = {
  support: LifeBuoy,
  csat: Star,
  outreach: Send,
  usage: Activity,
  billing: Receipt,
  engagement: UserX,
};

/* ── Props ────────────────────────────────────────────────── */
interface MomentInTimeViewProps {
  accountId?: number;
  onNavigate?: (id: string) => void;
  onBack?: () => void;
}

/* ── Main Component ───────────────────────────────────────── */
export default function MomentInTimeView({ accountId, onNavigate, onBack }: MomentInTimeViewProps) {
  const { settings } = useAdminSettings();
  const engine = useMitigationEngine();
  const { getProjectsForAccount, getNotesForAccount } = useProjects();
  const { getDealsForAccount } = usePipeline();
  const [selectedAccountId, setSelectedAccountId] = useState<number>(accountId || ACCOUNTS[0].id);
  const [expandedSignals, setExpandedSignals] = useState(false);
  const [expandedRecs, setExpandedRecs] = useState(false);
  const [drillDownMetric, setDrillDownMetric] = useState<string | null>(null);

  const account = useMemo(() => ACCOUNTS.find(a => a.id === selectedAccountId) || ACCOUNTS[0], [selectedAccountId]);

  // Admin thresholds
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
    signalWeights: settings.downsell.signalWeights,
    renewalThresholds,
  }), [settings.downsell.signalWeights, renewalThresholds]);

  // Derived data
  const riskProfile = useMemo(() => calculateAccountRiskProfile(account.id, downsellConfig), [account.id, downsellConfig]);
  const riskColors = useMemo(() => riskScoreColor(riskProfile.compositeScore, riskThresholds), [riskProfile.compositeScore, riskThresholds]);
  const riskLabel = useMemo(() => riskScoreLabel(riskProfile.compositeScore, riskThresholds), [riskProfile.compositeScore, riskThresholds]);
  const csatData = CSAT_BY_ACCOUNT[account.name];
  const contact = CONTACT_DETAILS[account.id];
  const timeline = ACTIVITY_TIMELINE[account.id] || [];

  const signals = useMemo(() => DOWNSELL_SIGNALS.filter(s => s.accountId === account.id), [account.id]);
  const mitigations = useMemo(() => MITIGATION_ACTIONS.filter(m => m.accountId === account.id), [account.id]);
  const recommendations = useMemo(() => AI_RECOMMENDATIONS.filter(r => r.accountId === account.id), [account.id]);
  const tickets = useMemo(() => TICKETS.filter(t => t.account === account.name), [account.name]);
  const outreach = useMemo(() => OUTREACH.filter(o => o.account === account.name), [account.name]);
  const invoices = useMemo(() => INVOICES.filter(inv => inv.account === account.name), [account.name]);

  // Engine tasks & calls
  const engineTasks = useMemo(() => engine.getTasksForAccount(account.id), [engine, account.id]);
  const engineCalls = useMemo(() => engine.getCallsForAccount(account.id), [engine, account.id]);

  // Renewal data
  const lic = account.saasLicense;
  const daysLeft = lic ? daysUntilLED(lic.licenseEndDate) : null;
  const urgency = getLEDUrgency(account, renewalThresholds);
  const uc = ledUrgencyColors[urgency];
  const urgencyLabels = getLEDUrgencyLabels(renewalThresholds);

  // Snapshot timestamp
  const snapshotTime = new Date().toLocaleString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    hour: "numeric", minute: "2-digit",
  });

  return (
    <div className="space-y-6">
      {/* ── Page Header ─────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <ArrowLeft className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              <h1 className="text-xl font-bold text-foreground tracking-tight">Moment in Time</h1>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Complete customer snapshot · {snapshotTime}
            </p>
          </div>
        </div>

        {/* Account selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Account:</span>
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(Number(e.target.value))}
            className="text-sm font-medium bg-card border border-border rounded-lg px-3 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {ACCOUNTS.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Account Identity Header ─────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-border bg-card overflow-hidden"
      >
        <div className="p-5">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-xl font-bold text-primary shrink-0">
              {account.name.charAt(0)}
            </div>

            {/* Identity */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-foreground">{account.name}</h2>
                <span className={cn("text-[10px] px-1.5 py-px rounded border font-medium", tierColors[account.tier])}>{account.tier}</span>
                <span className={cn("text-[10px] px-1.5 py-px rounded font-medium", statusColors[account.stage] || "text-muted-foreground bg-muted")}>{account.stage}</span>
                <span className={cn("text-[10px] px-1.5 py-px rounded border font-medium", customerTypeColors[account.customerType])}>{account.customerType}</span>
              </div>
              <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> {account.platform}</span>
                <span className="flex items-center gap-1"><User className="w-3 h-3" /> {account.contact}</span>
                {contact && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {contact.email}</span>}
                {contact && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> {contact.location}</span>}
              </div>
            </div>

            {/* Health Score Gauge */}
            <div className="text-center shrink-0">
              <div className={cn("w-16 h-16 rounded-full border-4 flex items-center justify-center text-xl font-bold font-mono",
                account.health >= 85 ? "border-emerald-400 text-emerald-700 bg-emerald-50" :
                account.health >= 65 ? "border-amber-400 text-amber-700 bg-amber-50" :
                "border-red-400 text-red-700 bg-red-50"
              )}>
                {account.health}
              </div>
              <span className="text-[10px] text-muted-foreground mt-1 block">Health</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Key Metrics Strip ───────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3"
      >
        {/* ARR */}
        <MetricTile
          icon={<TrendingUp className="w-4 h-4" />}
          label="Total ARR"
          value={`$${(account.arr / 1000).toFixed(0)}K`}
          color="text-foreground"
          onClick={() => setDrillDownMetric(drillDownMetric === "arr" ? null : "arr")}
          isActive={drillDownMetric === "arr"}
        />
        {/* CSAT */}
        <MetricTile
          icon={<Star className="w-4 h-4" />}
          label="CSAT Score"
          value={csatData ? `${csatData.score}/5` : "N/A"}
          color={csatData ? (csatData.score >= 4 ? "text-emerald-700" : csatData.score >= 3 ? "text-amber-600" : "text-red-600") : "text-muted-foreground"}
          sub={csatData ? `${csatData.trend === "up" ? "↑" : csatData.trend === "down" ? "↓" : "→"} from ${csatData.previousScore}` : undefined}
          onClick={() => setDrillDownMetric(drillDownMetric === "csat" ? null : "csat")}
          isActive={drillDownMetric === "csat"}
        />
        {/* Risk Score */}
        <MetricTile
          icon={<Shield className="w-4 h-4" />}
          label="Risk Score"
          value={`${riskProfile.compositeScore}`}
          color={riskColors.text}
          sub={riskLabel}
          onClick={() => setDrillDownMetric(drillDownMetric === "risk" ? null : "risk")}
          isActive={drillDownMetric === "risk"}
        />
        {/* Renewal */}
        <MetricTile
          icon={<CalendarClock className="w-4 h-4" />}
          label="Renewal"
          value={daysLeft !== null ? `${daysLeft}d` : "N/A"}
          color={uc.text.replace("text-", "text-")}
          sub={lic ? urgencyLabels[urgency] : "No license"}
          onClick={() => setDrillDownMetric(drillDownMetric === "renewal" ? null : "renewal")}
          isActive={drillDownMetric === "renewal"}
        />
        {/* Open Tickets */}
        <MetricTile
          icon={<AlertTriangle className="w-4 h-4" />}
          label="Open Tickets"
          value={String(tickets.filter(t => t.status !== "Resolved").length)}
          color={tickets.some(t => t.priority === "Critical" && t.status !== "Resolved") ? "text-red-600" : "text-foreground"}
          sub={tickets.some(t => t.priority === "Critical" && t.status !== "Resolved") ? "Has critical" : ""}
          onClick={() => setDrillDownMetric(drillDownMetric === "tickets" ? null : "tickets")}
          isActive={drillDownMetric === "tickets"}
        />
        {/* Active Signals */}
        <MetricTile
          icon={<Activity className="w-4 h-4" />}
          label="Active Signals"
          value={String(signals.filter(s => !s.resolved).length)}
          color={signals.some(s => s.severity === "critical" && !s.resolved) ? "text-red-600" : "text-foreground"}
          sub={`${mitigations.filter(m => m.status === "in_progress").length} mitigations active`}
          onClick={() => setDrillDownMetric(drillDownMetric === "signals" ? null : "signals")}
          isActive={drillDownMetric === "signals"}
        />
      </motion.div>

      {/* ── Drill-Down Panel ───────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {drillDownMetric && (
          <motion.div
            key={drillDownMetric}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-primary/20 bg-card p-5 shadow-sm">
              {/* Close button */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  {drillDownMetric === "arr" && <><TrendingUp className="w-4 h-4 text-primary" /> Total ARR — Source Data</>}
                  {drillDownMetric === "csat" && <><Star className="w-4 h-4 text-primary" /> CSAT Score — Survey Details</>}
                  {drillDownMetric === "risk" && <><Shield className="w-4 h-4 text-primary" /> Risk Score — Factor Breakdown</>}
                  {drillDownMetric === "renewal" && <><CalendarClock className="w-4 h-4 text-primary" /> Renewal — License Details</>}
                  {drillDownMetric === "tickets" && <><AlertTriangle className="w-4 h-4 text-primary" /> Open Tickets — Ticket Details</>}
                  {drillDownMetric === "signals" && <><Activity className="w-4 h-4 text-primary" /> Active Signals — Signal Details</>}
                </h3>
                <button
                  onClick={() => setDrillDownMetric(null)}
                  className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-muted transition-colors"
                >
                  Close
                </button>
              </div>

              {/* ARR Drill-Down */}
              {drillDownMetric === "arr" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Contract ARR</p>
                      <p className="text-lg font-bold font-mono text-foreground">${(account.arr / 1000).toFixed(0)}K</p>
                    </div>
                    {lic && (
                      <div className="rounded-lg bg-muted/50 p-3">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">License Value</p>
                        <p className="text-lg font-bold font-mono text-foreground">${(lic.annualLicenseValue / 1000).toFixed(0)}K</p>
                      </div>
                    )}
                    {lic && (
                      <div className="rounded-lg bg-muted/50 p-3">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">ARR at Risk</p>
                        <p className="text-lg font-bold font-mono text-red-600">${(riskProfile.arrExposed / 1000).toFixed(0)}K</p>
                      </div>
                    )}
                  </div>
                  {lic && (
                    <div className="rounded-lg border border-border overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Detail</th>
                            <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          <tr><td className="px-3 py-2 text-foreground">Subscription Tier</td><td className="px-3 py-2 font-medium text-foreground">{lic.subscriptionTier}</td></tr>
                          <tr><td className="px-3 py-2 text-foreground">Licensed Seats</td><td className="px-3 py-2 font-medium text-foreground">{lic.seats}</td></tr>
                          <tr><td className="px-3 py-2 text-foreground">Contract Term</td><td className="px-3 py-2 font-medium text-foreground">{lic.contractTermMonths} months</td></tr>
                          <tr><td className="px-3 py-2 text-foreground">Active Modules</td><td className="px-3 py-2 font-medium text-foreground">{lic.modules.join(", ")}</td></tr>
                          <tr><td className="px-3 py-2 text-foreground">Renewal Risk</td><td className={cn("px-3 py-2 font-medium", lic.renewalRisk === "High" || lic.renewalRisk === "Critical" ? "text-red-600" : lic.renewalRisk === "Medium" ? "text-amber-600" : "text-emerald-600")}>{lic.renewalRisk}</td></tr>
                          <tr><td className="px-3 py-2 text-foreground">Downsell Risk</td><td className={cn("px-3 py-2 font-medium", lic.downsellRisk === "High" ? "text-red-600" : lic.downsellRisk === "Medium" ? "text-amber-600" : "text-emerald-600")}>{lic.downsellRisk}</td></tr>
                          {lic.downsellNotes && <tr><td className="px-3 py-2 text-foreground">Downsell Notes</td><td className="px-3 py-2 text-muted-foreground italic">{lic.downsellNotes}</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {!lic && <p className="text-xs text-muted-foreground">No SaaS license data available for this account (Services-only customer).</p>}
                </div>
              )}

              {/* CSAT Drill-Down */}
              {drillDownMetric === "csat" && (
                <div className="space-y-3">
                  {csatData ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="rounded-lg bg-muted/50 p-3">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Current Score</p>
                          <p className={cn("text-lg font-bold font-mono", csatData.score >= 4 ? "text-emerald-700" : csatData.score >= 3 ? "text-amber-600" : "text-red-600")}>{csatData.score}/5</p>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-3">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Previous Score</p>
                          <p className="text-lg font-bold font-mono text-foreground">{csatData.previousScore}/5</p>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-3">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Trend</p>
                          <p className={cn("text-lg font-bold", csatData.trend === "up" ? "text-emerald-700" : csatData.trend === "down" ? "text-red-600" : "text-amber-600")}>
                            {csatData.trend === "up" ? "↑ Improving" : csatData.trend === "down" ? "↓ Declining" : "→ Stable"}
                          </p>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-3">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Survey Date</p>
                          <p className="text-lg font-bold font-mono text-foreground">{csatData.surveyDate}</p>
                        </div>
                      </div>
                      <div className="rounded-lg border border-border p-3">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Sentiment</p>
                        <span className={cn("text-xs px-2 py-0.5 rounded font-medium", sentimentConfig[csatData.sentiment].bg, sentimentConfig[csatData.sentiment].text)}>
                          {csatData.sentiment.charAt(0).toUpperCase() + csatData.sentiment.slice(1)}
                        </span>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mt-3 mb-1">Customer Comment</p>
                        <p className="text-sm text-foreground italic">"{csatData.comment}"</p>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">No CSAT survey data available for this account.</p>
                  )}
                </div>
              )}

              {/* Risk Score Drill-Down */}
              {drillDownMetric === "risk" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Composite Score</p>
                      <p className={cn("text-lg font-bold font-mono", riskColors.text)}>{riskProfile.compositeScore}/100</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Active Signals</p>
                      <p className="text-lg font-bold font-mono text-foreground">{riskProfile.signalCount}</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Critical Signals</p>
                      <p className={cn("text-lg font-bold font-mono", riskProfile.criticalSignals > 0 ? "text-red-600" : "text-emerald-600")}>{riskProfile.criticalSignals}</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Trend</p>
                      <p className={cn("text-lg font-bold", riskProfile.trendDirection === "improving" ? "text-emerald-700" : riskProfile.trendDirection === "worsening" ? "text-red-600" : "text-amber-600")}>
                        {riskProfile.trendDirection === "improving" ? "↑ Improving" : riskProfile.trendDirection === "worsening" ? "↓ Worsening" : "→ Stable"}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="rounded-lg border border-border p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">ARR Exposed</p>
                      <p className="text-xl font-bold font-mono text-red-600">${(riskProfile.arrExposed / 1000).toFixed(1)}K</p>
                      <p className="text-[10px] text-muted-foreground mt-1">Based on composite risk score applied to license value</p>
                    </div>
                    <div className="rounded-lg border border-border p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Mitigations</p>
                      <p className="text-sm text-foreground">
                        <span className="font-bold text-primary">{riskProfile.activeMitigations}</span> active &middot;
                        <span className="font-bold text-emerald-600 ml-1">{riskProfile.completedMitigations}</span> completed
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">Last assessed: {riskProfile.lastAssessment}</p>
                    </div>
                  </div>
                  {signals.filter(s => !s.resolved).length > 0 && (
                    <div className="rounded-lg border border-border overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Signal</th>
                            <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Category</th>
                            <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Severity</th>
                            <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Impact</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {signals.filter(s => !s.resolved).map(s => (
                            <tr key={s.id}>
                              <td className="px-3 py-2 text-foreground">{s.title}</td>
                              <td className="px-3 py-2"><span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", signalCategoryConfig[s.category].bgColor, signalCategoryConfig[s.category].color)}>{signalCategoryConfig[s.category].label}</span></td>
                              <td className="px-3 py-2"><span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", signalSeverityConfig[s.severity].bgColor, signalSeverityConfig[s.severity].color)}>{s.severity}</span></td>
                              <td className="px-3 py-2 text-muted-foreground">{s.impactEstimate || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Renewal Drill-Down */}
              {drillDownMetric === "renewal" && (
                <div className="space-y-3">
                  {lic ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="rounded-lg bg-muted/50 p-3">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">License End Date</p>
                          <p className="text-lg font-bold font-mono text-foreground">{formatLEDDate(lic.licenseEndDate)}</p>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-3">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Days Remaining</p>
                          <p className={cn("text-lg font-bold font-mono", uc.text)}>{daysLeft}d</p>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-3">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Renewal Risk</p>
                          <p className={cn("text-lg font-bold", lic.renewalRisk === "High" || lic.renewalRisk === "Critical" ? "text-red-600" : lic.renewalRisk === "Medium" ? "text-amber-600" : "text-emerald-600")}>{lic.renewalRisk}</p>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-3">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Renewal Status</p>
                          <p className="text-lg font-bold text-foreground">{lic.renewalStatus}</p>
                        </div>
                      </div>
                      <div className="rounded-lg border border-border overflow-hidden">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-muted/50">
                              <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Detail</th>
                              <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Value</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            <tr><td className="px-3 py-2 text-foreground">Annual License Value</td><td className="px-3 py-2 font-medium font-mono text-foreground">${lic.annualLicenseValue.toLocaleString()}</td></tr>
                            <tr><td className="px-3 py-2 text-foreground">Subscription Tier</td><td className="px-3 py-2 font-medium text-foreground">{lic.subscriptionTier}</td></tr>
                            <tr><td className="px-3 py-2 text-foreground">Licensed Seats</td><td className="px-3 py-2 font-medium text-foreground">{lic.seats}</td></tr>
                            <tr><td className="px-3 py-2 text-foreground">Contract Term</td><td className="px-3 py-2 font-medium text-foreground">{lic.contractTermMonths} months</td></tr>
                            <tr><td className="px-3 py-2 text-foreground">Urgency Level</td><td className={cn("px-3 py-2 font-medium", uc.text)}>{urgencyLabels[urgency]}</td></tr>
                            <tr><td className="px-3 py-2 text-foreground">Active Modules</td><td className="px-3 py-2 font-medium text-foreground">{lic.modules.join(", ")}</td></tr>
                          </tbody>
                        </table>
                      </div>
                      {/* Renewal progress bar */}
                      <div className="rounded-lg border border-border p-3">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Contract Progress</p>
                        <div className="relative h-3 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn("absolute inset-y-0 left-0 rounded-full transition-all",
                              urgency === "critical" ? "bg-red-500" :
                              urgency === "warning" ? "bg-orange-500" :
                              urgency === "approaching" ? "bg-amber-500" : "bg-emerald-500"
                            )}
                            style={{ width: `${Math.max(5, Math.min(100, ((lic.contractTermMonths * 30 - (daysLeft || 0)) / (lic.contractTermMonths * 30)) * 100))}%` }}
                          />
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className="text-[10px] text-muted-foreground">Contract Start</span>
                          <span className={cn("text-[10px] font-medium", uc.text)}>{daysLeft}d remaining</span>
                          <span className="text-[10px] text-muted-foreground">LED: {formatLEDDate(lic.licenseEndDate)}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">No SaaS license data available for this account (Services-only customer).</p>
                  )}
                </div>
              )}

              {/* Open Tickets Drill-Down */}
              {drillDownMetric === "tickets" && (
                <div className="space-y-3">
                  {tickets.length > 0 ? (
                    <div className="rounded-lg border border-border overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">ID</th>
                            <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Issue</th>
                            <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Priority</th>
                            <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                            <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Platform</th>
                            <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Age</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {tickets.map(t => (
                            <tr key={t.id} className={t.status === "Resolved" ? "opacity-50" : ""}>
                              <td className="px-3 py-2 font-mono font-medium text-primary">{t.id}</td>
                              <td className="px-3 py-2 text-foreground">{t.issue}</td>
                              <td className="px-3 py-2"><span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", priorityColors[t.priority])}>{t.priority}</span></td>
                              <td className="px-3 py-2"><span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", t.status === "Resolved" ? "bg-emerald-50 text-emerald-700" : t.status === "In Progress" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700")}>{t.status}</span></td>
                              <td className="px-3 py-2 text-muted-foreground">{t.platform}</td>
                              <td className="px-3 py-2 text-muted-foreground">{t.age}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No tickets found for this account.</p>
                  )}
                </div>
              )}

              {/* Active Signals Drill-Down */}
              {drillDownMetric === "signals" && (
                <div className="space-y-3">
                  {signals.length > 0 ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="rounded-lg bg-muted/50 p-3">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Total Signals</p>
                          <p className="text-lg font-bold font-mono text-foreground">{signals.length}</p>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-3">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Unresolved</p>
                          <p className="text-lg font-bold font-mono text-red-600">{signals.filter(s => !s.resolved).length}</p>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-3">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Active Mitigations</p>
                          <p className="text-lg font-bold font-mono text-primary">{mitigations.filter(m => m.status === "in_progress").length}</p>
                        </div>
                      </div>
                      <div className="rounded-lg border border-border overflow-hidden">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-muted/50">
                              <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Signal</th>
                              <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Category</th>
                              <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Severity</th>
                              <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Detected</th>
                              <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Source</th>
                              <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {signals.map(s => (
                              <tr key={s.id} className={s.resolved ? "opacity-50" : ""}>
                                <td className="px-3 py-2 text-foreground">{s.title}</td>
                                <td className="px-3 py-2"><span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", signalCategoryConfig[s.category].bgColor, signalCategoryConfig[s.category].color)}>{signalCategoryConfig[s.category].label}</span></td>
                                <td className="px-3 py-2"><span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", signalSeverityConfig[s.severity].bgColor, signalSeverityConfig[s.severity].color)}>{s.severity}</span></td>
                                <td className="px-3 py-2 text-muted-foreground">{s.detectedDate}</td>
                                <td className="px-3 py-2 text-muted-foreground">{s.source}</td>
                                <td className="px-3 py-2"><span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", s.resolved ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}>{s.resolved ? "Resolved" : "Active"}</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">No downsell signals detected for this account.</p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Two-Column Layout ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── Left Column (3/5) — Data & Signals ──────────── */}
        <div className="lg:col-span-3 space-y-5">

          {/* SaaS License & Renewal */}
          {lic && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className={cn("rounded-xl border p-4 space-y-3", uc.border, "bg-card")}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <CalendarClock className="w-3.5 h-3.5" /> License & Renewal
                </h3>
                <span className={cn("text-[10px] px-2 py-0.5 rounded font-semibold", uc.text, uc.bg)}>
                  {urgencyLabels[urgency]}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    LED: {formatLEDDate(lic.licenseEndDate)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {lic.subscriptionTier} · {lic.seats} seats · {lic.contractTermMonths}mo term
                  </p>
                </div>
                <div className="text-right">
                  <div className={cn("text-2xl font-bold font-mono", uc.text)}>{daysLeft}d</div>
                  <div className="text-[10px] text-muted-foreground">remaining</div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn("absolute inset-y-0 left-0 rounded-full transition-all",
                    urgency === "critical" ? "bg-red-500" :
                    urgency === "warning" ? "bg-orange-500" :
                    urgency === "approaching" ? "bg-amber-500" : "bg-emerald-500"
                  )}
                  style={{ width: `${Math.max(5, Math.min(100, ((lic.contractTermMonths * 30 - (daysLeft || 0)) / (lic.contractTermMonths * 30)) * 100))}%` }}
                />
              </div>

              {/* Modules */}
              <div className="flex flex-wrap gap-1">
                {lic.modules.map(m => (
                  <span key={m} className="text-[10px] px-1.5 py-0.5 rounded bg-muted border border-border text-foreground font-medium">{m}</span>
                ))}
              </div>

              {/* Status badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn("text-[10px] px-2 py-0.5 rounded font-medium", renewalStatusColors[lic.renewalStatus])}>
                  Renewal: {lic.renewalStatus}
                </span>
                <span className={cn("text-[10px] px-2 py-0.5 rounded font-medium", downsellRiskColors[lic.downsellRisk])}>
                  Downsell: {lic.downsellRisk}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded font-medium text-foreground bg-muted">
                  License ARR: ${(lic.annualLicenseValue / 1000).toFixed(0)}K
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded font-medium text-muted-foreground bg-muted">
                  Owner: {lic.renewalOwner}
                </span>
              </div>

              {/* Downsell warning */}
              {lic.downsellRisk !== "None" && lic.downsellNotes && (
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-50/50 border border-red-200/50">
                  <AlertOctagon className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-red-700">Downsell Risk</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{lic.downsellNotes}</p>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Risk Signals */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-xl border border-border bg-card overflow-hidden"
          >
            <button
              onClick={() => setExpandedSignals(!expandedSignals)}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Downsell Signals
                </h3>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                  {signals.filter(s => !s.resolved).length} active
                </span>
              </div>
              <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", expandedSignals && "rotate-180")} />
            </button>

            <AnimatePresence>
              {expandedSignals && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 space-y-2">
                    {signals.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-3 text-center">No signals detected for this account.</p>
                    ) : (
                      signals.map(signal => {
                        const catConfig = signalCategoryConfig[signal.category];
                        const sevConfig = signalSeverityConfig[signal.severity];
                        const CatIcon = categoryIcons[signal.category] || Activity;
                        return (
                          <div key={signal.id} className={cn("rounded-lg border p-3 space-y-1", signal.resolved ? "opacity-50 border-border/30" : "border-border")}>
                            <div className="flex items-center gap-2">
                              <CatIcon className={cn("w-3.5 h-3.5", catConfig.color)} />
                              <span className="text-xs font-semibold text-foreground flex-1">{signal.title}</span>
                              <span className={cn("text-[9px] px-1.5 py-px rounded font-medium", sevConfig.bgColor, sevConfig.color)}>
                                {sevConfig.label}
                              </span>
                              {signal.resolved && (
                                <span className="text-[9px] px-1.5 py-px rounded font-medium bg-emerald-50 text-emerald-700">Resolved</span>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">{signal.description}</p>
                            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                              <span>{signal.detectedDate}</span>
                              <span>{signal.source}</span>
                              {signal.impactEstimate && <span className="text-red-600 font-medium">{signal.impactEstimate}</span>}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* AI Recommendations */}
          {recommendations.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-xl border border-border bg-card overflow-hidden"
            >
              <button
                onClick={() => setExpandedRecs(!expandedRecs)}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-violet-600" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    AI Recommendations
                  </h3>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 font-bold">
                    {recommendations.length}
                  </span>
                </div>
                <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", expandedRecs && "rotate-180")} />
              </button>

              <AnimatePresence>
                {expandedRecs && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-3">
                      {recommendations.map(rec => (
                        <div key={rec.id} className="rounded-lg border border-violet-200/50 bg-violet-50/30 p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-foreground">{rec.title}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 font-mono font-bold">
                              {rec.confidence}% confidence
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">{rec.summary}</p>
                          <div className="flex items-center gap-2 text-[10px]">
                            <span className="text-emerald-700 font-medium">{rec.estimatedImpact}</span>
                            <span className="text-muted-foreground">·</span>
                            <span className="text-muted-foreground">{rec.detailedSteps.length} steps</span>
                          </div>
                          <div className="space-y-1">
                            {rec.detailedSteps.slice(0, 3).map((step, i) => (
                              <div key={i} className="flex items-start gap-1.5 text-[10px] text-muted-foreground">
                                <span className="text-violet-600 font-bold shrink-0">{i + 1}.</span>
                                <span>{step}</span>
                              </div>
                            ))}
                            {rec.detailedSteps.length > 3 && (
                              <span className="text-[10px] text-violet-600 font-medium">+{rec.detailedSteps.length - 3} more steps</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* CSAT Detail */}
          {csatData && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="rounded-xl border border-border bg-card p-4 space-y-3"
            >
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5" /> Latest CSAT Feedback
              </h3>
              <div className="flex items-center gap-3">
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold",
                  sentimentConfig[csatData.sentiment].bg, sentimentConfig[csatData.sentiment].text
                )}>
                  {csatData.score}
                </div>
                <div className="flex-1">
                  <p className="text-xs text-foreground font-medium">"{csatData.comment}"</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{csatData.surveyDate} · {csatData.sentiment}</p>
                </div>
              </div>
            </motion.div>
          )}
          {/* Active Projects & Services */}
          {(() => {
            const accountProjects = getProjectsForAccount(account.id);
            if (accountProjects.length === 0) return null;
            return (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="rounded-xl border border-border bg-card overflow-hidden"
              >
                <div className="flex items-center justify-between p-4 pb-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <FolderKanban className="w-3.5 h-3.5" /> Active Projects
                  </h3>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                    {accountProjects.length} project{accountProjects.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="divide-y divide-border">
                  {accountProjects.map(proj => {
                    const hc = projectHealthColors[proj.health];
                    const sc = projectStatusColors[proj.status];
                    const tc = projectTypeColors[proj.type];
                    const budgetPct = getProjectBudgetPct(proj);
                    const daysLeft = getProjectDaysRemaining(proj);
                    const doneTasks = proj.tasks.filter(t => t.status === "done").length;
                    const blockedTasks = proj.tasks.filter(t => t.status === "blocked").length;
                    const overdueTasks = proj.tasks.filter(t => t.status !== "done" && new Date(t.dueDate) < new Date("2026-04-15")).length;
                    return (
                      <div key={proj.id} className="px-4 py-3 hover:bg-muted/30 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5", sc.bg)}>
                            {proj.status === "completed" ? <CheckCircle2 className={cn("w-4 h-4", sc.text)} /> :
                             proj.status === "on_hold" ? <Pause className={cn("w-4 h-4", sc.text)} /> :
                             <Layers className={cn("w-4 h-4", sc.text)} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-semibold text-foreground">{proj.name}</span>
                              <span className={cn("text-[9px] px-1.5 py-px rounded font-medium", tc.bg, tc.text)}>
                                {projectTypeLabels[proj.type]}
                              </span>
                              <span className={cn("text-[9px] px-1.5 py-px rounded font-medium", hc.bg, hc.text)}>
                                {hc.label}
                              </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {billingModelLabels[proj.billingModel]} · PM: {proj.projectManager}
                            </p>

                            {/* Progress bar */}
                            <div className="flex items-center gap-2 mt-2">
                              <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                                <div
                                  className={cn("h-full rounded-full",
                                    proj.health === "on_track" ? "bg-emerald-500" :
                                    proj.health === "at_risk" ? "bg-amber-500" : "bg-red-500"
                                  )}
                                  style={{ width: `${proj.completionPct}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-mono text-muted-foreground">{proj.completionPct}%</span>
                            </div>

                            {/* Stats row */}
                            <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                              <span>{doneTasks}/{proj.tasks.length} tasks</span>
                              {blockedTasks > 0 && <span className="text-red-600 font-medium">{blockedTasks} blocked</span>}
                              {overdueTasks > 0 && <span className="text-amber-600 font-medium">{overdueTasks} overdue</span>}
                              <span className={cn(budgetPct > 80 ? "text-red-600 font-medium" : "")}>{budgetPct}% budget</span>
                              <span className={cn(daysLeft <= 15 ? "text-red-600 font-medium" : "")}>{daysLeft}d left</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            );
          })()}

          {/* Project Notes */}
          {(() => {
            const accountNotes = getNotesForAccount(account.id);
            if (accountNotes.length === 0) return null;
            const pinnedNotes = accountNotes.filter(n => n.pinned);
            const recentNotes = accountNotes.filter(n => !n.pinned).slice(0, 5);
            const displayNotes = [...pinnedNotes, ...recentNotes].slice(0, 8);
            return (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="rounded-xl border border-border bg-card overflow-hidden"
              >
                <div className="flex items-center justify-between p-4 pb-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> Project Notes
                  </h3>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted/50 text-muted-foreground font-medium">
                    {accountNotes.length} note{accountNotes.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="divide-y divide-border">
                  {displayNotes.map(note => {
                    const colors = noteCategoryColors[note.category];
                    const dt = new Date(note.createdAt);
                    const now = new Date();
                    const diffH = Math.floor((now.getTime() - dt.getTime()) / 3600000);
                    const timeStr = diffH < 1 ? "Just now" : diffH < 24 ? `${diffH}h ago` : diffH < 168 ? `${Math.floor(diffH / 24)}d ago` : dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                    return (
                      <div key={`${note.projectId}-${note.id}`} className="px-4 py-2.5 hover:bg-muted/20 transition-colors">
                        <div className="flex items-start gap-2">
                          <div className={cn("w-1.5 h-1.5 rounded-full mt-1.5 shrink-0", colors.dot)} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-semibold text-foreground truncate">{note.title}</span>
                              {note.pinned && (
                                <span className="text-[8px] px-1 py-px rounded bg-primary/10 text-primary font-bold">PINNED</span>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">{note.content}</p>
                            <div className="flex items-center gap-2 mt-1 text-[9px] text-muted-foreground/70">
                              <span className="font-medium text-muted-foreground">{note.author}</span>
                              <span>·</span>
                              <span className={cn("px-1 py-px rounded", colors.bg, colors.text)}>{noteCategoryLabels[note.category]}</span>
                              <span>·</span>
                              <span>{timeStr}</span>
                              <span className="ml-auto text-[9px] text-muted-foreground/50 truncate max-w-[120px]">{note.projectName}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {accountNotes.length > displayNotes.length && (
                  <div className="px-4 py-2 text-center text-[10px] text-muted-foreground/60 border-t border-border">
                    +{accountNotes.length - displayNotes.length} more notes in Projects & Services
                  </div>
                )}
              </motion.div>
            );
          })()}

          {/* Active Pipeline Deals */}
          {(() => {
            const accountDeals = getDealsForAccount(selectedAccountId);
            const openDeals = accountDeals.filter(d => d.stage !== "Closed Won" && d.stage !== "Closed Lost");
            const wonDeals = accountDeals.filter(d => d.stage === "Closed Won");
            const totalPipeline = openDeals.reduce((s, d) => s + d.products.reduce((ps, p) => ps + (p.quantity * p.unitPrice * (1 - p.discountPct / 100)), 0), 0);
            const totalWeighted = openDeals.reduce((s, d) => s + getWeightedValue(d), 0);
            return (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border bg-muted/30">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
                      <Handshake className="w-3.5 h-3.5" /> Active Deals
                    </h3>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span>{openDeals.length} open</span>
                      <span>{wonDeals.length} won</span>
                      <span className="font-medium text-emerald-600">${totalPipeline >= 1000 ? `${(totalPipeline / 1000).toFixed(0)}K` : totalPipeline.toLocaleString()} pipeline</span>
                    </div>
                  </div>
                </div>
                {accountDeals.length === 0 ? (
                  <div className="px-4 py-6 text-center text-xs text-muted-foreground/60">No deals for this account</div>
                ) : (
                  <div className="divide-y divide-border">
                    {accountDeals.slice(0, 5).map(deal => {
                      const stageConfig = DEAL_STAGES.find(s => s.name === deal.stage);
                      const dealValue = deal.products.reduce((s, p) => s + (p.quantity * p.unitPrice * (1 - p.discountPct / 100)), 0);
                      const isClosed = deal.stage === "Closed Won" || deal.stage === "Closed Lost";
                      return (
                        <div key={deal.id} className="px-4 py-3 hover:bg-muted/20 transition-colors">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-foreground truncate flex-1 mr-2">{deal.name}</span>
                            <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", stageConfig?.color || "bg-muted text-muted-foreground")}>{deal.stage}</span>
                          </div>
                          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                            <span className={cn("px-1.5 py-0.5 rounded font-medium", dealTypeColors[deal.type])}>{deal.type}</span>
                            <span className="font-medium text-foreground">${dealValue >= 1000 ? `${(dealValue / 1000).toFixed(dealValue >= 10000 ? 0 : 1)}K` : dealValue}</span>
                            <span>{deal.probability}%</span>
                            {!isClosed && <span>{getDaysInStage(deal)}d in stage</span>}
                            {isClosed && deal.stage === "Closed Won" && <span className="text-emerald-600 font-medium">Won</span>}
                            {isClosed && deal.stage === "Closed Lost" && <span className="text-red-500 font-medium">Lost</span>}
                          </div>
                          {/* Stage progress mini bar */}
                          {!isClosed && (
                            <div className="flex gap-0.5 mt-1.5">
                              {DEAL_STAGES.filter(s => s.name !== "Closed Won" && s.name !== "Closed Lost").map((s, i) => {
                                const currentIdx = DEAL_STAGES.filter(st => st.name !== "Closed Won" && st.name !== "Closed Lost").findIndex(st => st.name === deal.stage);
                                return <div key={s.name} className={cn("h-1 flex-1 rounded-full", i <= currentIdx ? "bg-primary" : "bg-muted")} />;
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            );
          })()}

        </div>

        {/* Right Column (2/5) - Actions & Timeline */}
        <div className="lg:col-span-2 space-y-5">

          {/* Actionable Activities */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-xl border border-border bg-card p-4 space-y-3"
          >
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5" /> Actionable Activities
            </h3>

            {/* Next scheduled action */}
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">{account.next}</p>
                <p className="text-[10px] text-muted-foreground">Next scheduled action</p>
              </div>
            </div>

            {/* Mitigations */}
            {mitigations.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Active Mitigations</span>
                {mitigations.filter(m => m.status !== "completed" && m.status !== "dismissed").map(m => (
                  <div key={m.id} className="flex items-start gap-2 rounded-lg border border-border/40 bg-card/50 px-3 py-2">
                    <div className={cn("w-1.5 h-1.5 rounded-full mt-1.5 shrink-0",
                      m.priority === "urgent" ? "bg-red-500" : m.priority === "high" ? "bg-orange-500" : "bg-blue-500"
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-foreground">{m.title}</p>
                      <p className="text-[10px] text-muted-foreground">{m.assignee} · Due {m.dueDate}</p>
                    </div>
                    <span className={cn("text-[9px] px-1.5 py-px rounded font-medium shrink-0",
                      m.status === "in_progress" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"
                    )}>
                      {m.status === "in_progress" ? "In Progress" : "Pending"}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Engine-generated tasks */}
            {engineTasks.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">AI-Generated Tasks</span>
                {engineTasks.filter(t => t.status !== "completed" && t.status !== "cancelled").slice(0, 3).map(t => (
                  <div key={t.id} className="flex items-start gap-2 rounded-lg border border-violet-200/40 bg-violet-50/20 px-3 py-2">
                    <Sparkles className="w-3 h-3 text-violet-600 shrink-0 mt-1" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-foreground">{t.title}</p>
                      <p className="text-[10px] text-muted-foreground">{t.assignee} · Due {t.dueDate}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Scheduled calls */}
            {engineCalls.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Scheduled Calls</span>
                {engineCalls.filter(c => c.status === "scheduled").slice(0, 3).map(c => (
                  <div key={c.id} className="flex items-start gap-2 rounded-lg border border-sky-200/40 bg-sky-50/20 px-3 py-2">
                    <Phone className="w-3 h-3 text-sky-600 shrink-0 mt-1" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-foreground">{c.title}</p>
                      <p className="text-[10px] text-muted-foreground">{c.participants.join(", ")} · {c.duration}min</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quick Actions */}
            <Separator className="bg-border/40" />
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { onNavigate?.("renewals"); toast.info("Navigating to Renewals..."); }}
                className="text-[10px] px-2.5 py-1.5 rounded-lg border border-border bg-muted/50 text-foreground font-medium hover:bg-muted transition-colors flex items-center gap-1"
              >
                <CalendarClock className="w-3 h-3" /> Renewals
              </button>
              <button
                onClick={() => { onNavigate?.("downsell"); toast.info("Navigating to Downsell Mitigation..."); }}
                className="text-[10px] px-2.5 py-1.5 rounded-lg border border-border bg-muted/50 text-foreground font-medium hover:bg-muted transition-colors flex items-center gap-1"
              >
                <Shield className="w-3 h-3" /> Downsell
              </button>
              <button
                onClick={() => { onNavigate?.("support"); toast.info("Navigating to Support..."); }}
                className="text-[10px] px-2.5 py-1.5 rounded-lg border border-border bg-muted/50 text-foreground font-medium hover:bg-muted transition-colors flex items-center gap-1"
              >
                <LifeBuoy className="w-3 h-3" /> Support
              </button>
              <button
                onClick={() => { onNavigate?.("outreach"); toast.info("Navigating to Engagement Hub..."); }}
                className="text-[10px] px-2.5 py-1.5 rounded-lg border border-border bg-muted/50 text-foreground font-medium hover:bg-muted transition-colors flex items-center gap-1"
              >
                <Send className="w-3 h-3" /> Engagement Hub
              </button>
            </div>
          </motion.div>

          {/* Related Items — Tickets, Outreach, Invoices */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-xl border border-border bg-card p-4 space-y-3"
          >
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" /> Related Items
            </h3>

            {tickets.length === 0 && outreach.length === 0 && invoices.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2 text-center">No related items.</p>
            ) : (
              <div className="space-y-2">
                {tickets.map(t => (
                  <div key={t.id} className="flex items-center gap-2 rounded-lg border border-border/40 bg-card/30 px-3 py-2">
                    <AlertTriangle className={cn("w-3.5 h-3.5 shrink-0", t.priority === "Critical" ? "text-red-500" : "text-amber-500")} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-foreground truncate">{t.issue}</p>
                      <p className="text-[10px] text-muted-foreground">{t.id} · {t.priority} · {t.age}</p>
                    </div>
                    <span className={cn("text-[9px] px-1.5 py-px rounded font-medium shrink-0", statusColors[t.status])}>{t.status}</span>
                  </div>
                ))}
                {outreach.map((o, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg border border-border/40 bg-card/30 px-3 py-2">
                    <Send className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-foreground truncate">{o.type}</p>
                      <p className="text-[10px] text-muted-foreground">{o.step} · Next: {o.nextDate}</p>
                    </div>
                    <span className={cn("text-[9px] px-1.5 py-px rounded font-medium shrink-0", statusColors[o.status])}>{o.status}</span>
                  </div>
                ))}
                {invoices.map(inv => (
                  <div key={inv.inv} className="flex items-center gap-2 rounded-lg border border-border/40 bg-card/30 px-3 py-2">
                    <Receipt className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-foreground truncate">{inv.inv} — {inv.amount}</p>
                      <p className="text-[10px] text-muted-foreground">Due {inv.due}</p>
                    </div>
                    <span className={cn("text-[9px] px-1.5 py-px rounded font-medium shrink-0", statusColors[inv.status])}>{inv.status}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Activity Timeline */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-xl border border-border bg-card p-4 space-y-3"
          >
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Recent Activity
            </h3>

            {timeline.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2 text-center">No recent activity.</p>
            ) : (
              <div className="relative">
                <div className="absolute left-[13px] top-2 bottom-2 w-px bg-border/40" />
                <div className="space-y-0">
                  {timeline.slice(0, 5).map((event, i) => (
                    <div key={event.id} className="relative flex gap-3 pb-4 last:pb-0">
                      <div className={cn("relative z-10 w-[27px] h-[27px] rounded-lg border flex items-center justify-center shrink-0", activityColor[event.type])}>
                        {activityIcon[event.type]}
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-[11px] font-semibold text-foreground">{event.title}</p>
                          <span className="text-[9px] text-muted-foreground/60 shrink-0 font-mono">{event.date}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{event.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ───────────────────────────────────────── */
function MetricTile({ icon, label, value, color, sub, onClick, isActive }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  sub?: string;
  onClick?: () => void;
  isActive?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-xl border bg-card p-3 text-center space-y-1 transition-all",
        onClick && "cursor-pointer hover:shadow-md hover:border-primary/40",
        isActive ? "border-primary ring-2 ring-primary/20 shadow-md" : "border-border",
      )}
    >
      <div className="flex items-center justify-center gap-1 text-muted-foreground">
        {icon}
        <span className="text-[10px] tracking-[0.05em] uppercase font-medium">{label}</span>
      </div>
      <p className={cn("text-lg font-bold font-mono", color)}>{value}</p>
      {sub && <p className="text-[9px] text-muted-foreground leading-tight">{sub}</p>}
      {onClick && (
        <p className="text-[8px] text-primary/60 font-medium uppercase tracking-wider mt-0.5">Click to drill down</p>
      )}
    </div>
  );
}
