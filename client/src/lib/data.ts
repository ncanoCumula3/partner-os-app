/*
 * Partner OS — Shared Data & Constants
 * Design: Warm adaptive "Golden Hour" theme
 */

export const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { id: "accounts", label: "Accounts", icon: "Building2" },
  { id: "moment", label: "Moment in Time", icon: "Eye" },
  { id: "projects", label: "Projects & Services", icon: "FolderKanban" },
  { id: "pipeline", label: "Pipeline", icon: "TrendingUp" },
  { id: "support", label: "Support", icon: "LifeBuoy" },
  { id: "outreach", label: "Engagement Hub", icon: "Megaphone" },
  { id: "csat", label: "CSAT", icon: "Star" },
  { id: "ar", label: "AR Tracker", icon: "Receipt" },
  { id: "playbooks", label: "Playbooks", icon: "BookOpen" },
  { id: "renewals", label: "Renewals", icon: "CalendarClock" },
  { id: "downsell", label: "Downsell Mitigation", icon: "ShieldAlert" },
  { id: "ai", label: "AI Assistant", icon: "Bot" },
  { id: "chat", label: "Team Chat", icon: "MessageSquare" },
  { id: "kb", label: "Knowledge Base", icon: "Library" },
  { id: "sla-config", label: "SLA Config", icon: "Shield" },
  { id: "sla-tracker", label: "SLA Tracker", icon: "Timer" },
  { id: "notes", label: "Notes", icon: "StickyNote" },
  { id: "reporting", label: "Reporting", icon: "BarChart3" },
  { id: "integrations", label: "Integrations", icon: "Plug" },
  { id: "admin-settings", label: "Admin Settings", icon: "Settings2" },
] as const;

export type NavId = (typeof NAV_ITEMS)[number]["id"];

export const PLATFORMS = [
  "Salesforce",
  "NetSuite",
  "HubSpot",
  "Marketo",
  "Sage",
  "SAP",
  "Zoho",
  "Dynamics",
] as const;

/* ── Customer & Renewal Types ─────────────────────────────── */
export type CustomerType = "SaaS" | "Services" | "Hybrid";
export type RenewalStatus = "Not Started" | "Discovery" | "Negotiation" | "Committed" | "Renewed" | "Churned";
export type RenewalRisk = "Low" | "Medium" | "High" | "Critical";
export type DownsellRisk = "None" | "Low" | "Medium" | "High";

export interface SaaSLicense {
  licenseEndDate: string;           // ISO date string
  subscriptionTier: string;         // e.g. "Enterprise", "Professional", "Standard"
  modules: string[];                // Active modules
  seats: number;                    // Licensed seats
  renewalStatus: RenewalStatus;
  renewalRisk: RenewalRisk;
  downsellRisk: DownsellRisk;
  downsellNotes?: string;           // What modules/seats might be reduced
  lastRenewalDate?: string;         // Previous renewal date
  contractTermMonths: number;       // 12, 24, 36
  renewalOwner: string;             // Rep responsible for renewal
  annualLicenseValue: number;       // License portion of ARR
}

export interface Account {
  id: number;
  name: string;
  platform: string;
  tier: "Gold" | "Silver" | "Bronze";
  health: number;
  arr: number;
  stage: string;
  contact: string;
  next: string;
  customerType: CustomerType;
  saasLicense?: SaaSLicense;        // Only present for SaaS and Hybrid customers
}

export const ACCOUNTS: Account[] = [
  {
    id: 1, name: "Apex Manufacturing", platform: "NetSuite", tier: "Gold", health: 92, arr: 84000,
    stage: "Expansion", contact: "Dana Reyes", next: "QBR — Apr 18",
    customerType: "SaaS",
    saasLicense: {
      licenseEndDate: "2026-07-31",
      subscriptionTier: "Enterprise",
      modules: ["Financials", "Inventory", "Manufacturing", "CRM", "Analytics"],
      seats: 45,
      renewalStatus: "Discovery",
      renewalRisk: "Low",
      downsellRisk: "None",
      lastRenewalDate: "2025-07-31",
      contractTermMonths: 12,
      renewalOwner: "Jordan Davis",
      annualLicenseValue: 72000,
    },
  },
  {
    id: 2, name: "BlueWave Logistics", platform: "Salesforce", tier: "Silver", health: 67, arr: 36000,
    stage: "At Risk", contact: "Marcus Lin", next: "Health Check — Apr 12",
    customerType: "SaaS",
    saasLicense: {
      licenseEndDate: "2026-06-15",
      subscriptionTier: "Professional",
      modules: ["Sales Cloud", "Service Cloud", "Reports"],
      seats: 20,
      renewalStatus: "Discovery",
      renewalRisk: "High",
      downsellRisk: "High",
      downsellNotes: "May drop Service Cloud module and reduce seats from 20 to 12 — budget pressure from leadership",
      lastRenewalDate: "2025-06-15",
      contractTermMonths: 12,
      renewalOwner: "Jordan Davis",
      annualLicenseValue: 28000,
    },
  },
  {
    id: 3, name: "ClearPath Retail", platform: "HubSpot", tier: "Bronze", health: 88, arr: 18000,
    stage: "Stable", contact: "Priya Nair", next: "Check-in — Apr 22",
    customerType: "Services",
    // No SaaS license — consulting/services only
  },
  {
    id: 4, name: "Driftwood Capital", platform: "Salesforce", tier: "Gold", health: 95, arr: 120000,
    stage: "Upsell Ready", contact: "Tom Hargrove", next: "Upsell Call — Apr 15",
    customerType: "Hybrid",
    saasLicense: {
      licenseEndDate: "2026-11-30",
      subscriptionTier: "Enterprise",
      modules: ["Sales Cloud", "Marketing Cloud", "Analytics", "CPQ", "Pardot"],
      seats: 75,
      renewalStatus: "Not Started",
      renewalRisk: "Low",
      downsellRisk: "None",
      lastRenewalDate: "2025-11-30",
      contractTermMonths: 12,
      renewalOwner: "Jordan Davis",
      annualLicenseValue: 96000,
    },
  },
  {
    id: 5, name: "Edgeline Foods", platform: "NetSuite", tier: "Silver", health: 54, arr: 27000,
    stage: "At Risk", contact: "Sofia Ruiz", next: "Escalation — Apr 11",
    customerType: "SaaS",
    saasLicense: {
      licenseEndDate: "2026-05-15",
      subscriptionTier: "Standard",
      modules: ["Financials", "Inventory"],
      seats: 10,
      renewalStatus: "Negotiation",
      renewalRisk: "Critical",
      downsellRisk: "High",
      downsellNotes: "Considering dropping to Financials-only; may reduce seats to 5. Budget cuts and low adoption cited.",
      lastRenewalDate: "2025-05-15",
      contractTermMonths: 12,
      renewalOwner: "Jordan Davis",
      annualLicenseValue: 22000,
    },
  },
];

export interface Ticket {
  id: string;
  account: string;
  issue: string;
  priority: "Critical" | "High" | "Medium" | "Low";
  status: "Open" | "In Progress" | "Resolved";
  platform: string;
  age: string;
}

export const TICKETS: Ticket[] = [
  { id: "T-1041", account: "BlueWave Logistics", issue: "Revenue recognition module throwing errors on multi-currency invoices", priority: "Critical", status: "Open", platform: "NetSuite", age: "3d" },
  { id: "T-1038", account: "Apex Manufacturing", issue: "Custom dashboard not reflecting real-time inventory data", priority: "High", status: "In Progress", platform: "NetSuite", age: "5d" },
  { id: "T-1035", account: "ClearPath Retail", issue: "Email sequences not triggering for new contact lists", priority: "Medium", status: "Resolved", platform: "HubSpot", age: "8d" },
  { id: "T-1029", account: "Driftwood Capital", issue: "Apex trigger causing CPU limit on large opportunity batch", priority: "High", status: "Open", platform: "Salesforce", age: "11d" },
];

export interface Playbook {
  title: string;
  platform: string;
  category: string;
  steps: number;
  icon: string;
}

export const PLAYBOOKS: Playbook[] = [
  { title: "QBR Preparation Guide", platform: "All", category: "Account Management", steps: 7, icon: "ClipboardList" },
  { title: "Upsell Discovery Framework", platform: "Salesforce", category: "Revenue Growth", steps: 5, icon: "TrendingUp" },
  { title: "At-Risk Account Recovery", platform: "All", category: "Retention", steps: 9, icon: "Shield" },
  { title: "NetSuite Go-Live Checklist", platform: "NetSuite", category: "Implementation", steps: 14, icon: "Rocket" },
  { title: "Executive Sponsor Outreach", platform: "All", category: "Relationship", steps: 4, icon: "Handshake" },
  { title: "CSAT Drop Response Protocol", platform: "All", category: "Support", steps: 6, icon: "Zap" },
  { title: "SaaS Renewal Playbook", platform: "All", category: "Renewals", steps: 10, icon: "CalendarClock" },
];

export interface OutreachItem {
  account: string;
  type: string;
  status: "Active" | "Scheduled" | "Draft";
  opens: string;
  step: string;
  nextDate: string;
}

export const OUTREACH: OutreachItem[] = [
  { account: "Driftwood Capital", type: "Upsell Sequence", status: "Active", opens: "4/4", step: "Step 3 of 5", nextDate: "Apr 12" },
  { account: "Edgeline Foods", type: "Re-engagement", status: "Active", opens: "2/3", step: "Step 2 of 4", nextDate: "Apr 11" },
  { account: "ClearPath Retail", type: "QBR Invite", status: "Scheduled", opens: "—", step: "Step 1 of 3", nextDate: "Apr 16" },
  { account: "BlueWave Logistics", type: "Health Check Follow-up", status: "Draft", opens: "—", step: "Not started", nextDate: "—" },
];

export interface Invoice {
  account: string;
  inv: string;
  amount: string;
  issued: string;
  due: string;
  status: "Overdue" | "Due Soon" | "Pending" | "Paid";
}

export const INVOICES: Invoice[] = [
  { account: "Apex Manufacturing", inv: "INV-2044", amount: "$8,400", issued: "Mar 15", due: "Apr 14", status: "Due Soon" },
  { account: "BlueWave Logistics", inv: "INV-2039", amount: "$4,200", issued: "Feb 28", due: "Mar 30", status: "Overdue" },
  { account: "Driftwood Capital", inv: "INV-2047", amount: "$18,000", issued: "Apr 1", due: "Apr 30", status: "Pending" },
  { account: "ClearPath Retail", inv: "INV-2041", amount: "$3,600", issued: "Mar 20", due: "Apr 19", status: "Due Soon" },
];

/* ── LED / Renewal Helper Functions ───────────────────────── */

/** Calculate days until license end date from today */
export function daysUntilLED(ledDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const led = new Date(ledDate);
  led.setHours(0, 0, 0, 0);
  return Math.ceil((led.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/** Get LED urgency level based on days remaining — accepts optional admin thresholds */
export type LEDUrgency = "critical" | "warning" | "approaching" | "safe" | "n/a";

export interface RenewalThresholds {
  criticalThresholdDays: number;  // default 30
  urgentThresholdDays: number;    // default 90
  renewalWindowMonths: number;    // default 6
}

const DEFAULT_RENEWAL_THRESHOLDS: RenewalThresholds = {
  criticalThresholdDays: 30,
  urgentThresholdDays: 90,
  renewalWindowMonths: 6,
};

export function getLEDUrgency(account: Account, thresholds?: Partial<RenewalThresholds>): LEDUrgency {
  if (!account.saasLicense) return "n/a";
  const t = { ...DEFAULT_RENEWAL_THRESHOLDS, ...thresholds };
  const days = daysUntilLED(account.saasLicense.licenseEndDate);
  if (days <= t.criticalThresholdDays) return "critical";
  if (days <= t.urgentThresholdDays) return "warning";
  if (days <= t.renewalWindowMonths * 30) return "approaching";
  return "safe";
}

/** Check if account is in the renewal window — uses admin-configured window */
export function isInRenewalWindow(account: Account, renewalWindowMonths?: number): boolean {
  if (!account.saasLicense) return false;
  const windowDays = (renewalWindowMonths ?? 6) * 30;
  return daysUntilLED(account.saasLicense.licenseEndDate) <= windowDays;
}

/** Format LED date for display */
export function formatLEDDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** LED urgency color classes */
export const ledUrgencyColors: Record<LEDUrgency, { text: string; bg: string; border: string; dot: string }> = {
  critical: { text: "text-red-700", bg: "bg-red-50", border: "border-red-200", dot: "bg-red-500" },
  warning: { text: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200", dot: "bg-orange-500" },
  approaching: { text: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", dot: "bg-amber-500" },
  safe: { text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", dot: "bg-emerald-600" },
  "n/a": { text: "text-slate-500", bg: "bg-slate-50", border: "border-slate-200", dot: "bg-slate-400" },
};

export const ledUrgencyLabels: Record<LEDUrgency, string> = {
  critical: "Critical — Renew Now",
  warning: "Urgent — Under 90 Days",
  approaching: "In Renewal Window",
  safe: "On Track",
  "n/a": "N/A",
};

/** Dynamic urgency labels that reflect admin thresholds */
export function getLEDUrgencyLabels(thresholds?: Partial<RenewalThresholds>): Record<LEDUrgency, string> {
  const t = { ...DEFAULT_RENEWAL_THRESHOLDS, ...thresholds };
  return {
    critical: `Critical — Under ${t.criticalThresholdDays} Days`,
    warning: `Urgent — Under ${t.urgentThresholdDays} Days`,
    approaching: `In ${t.renewalWindowMonths}-Month Renewal Window`,
    safe: "On Track",
    "n/a": "N/A",
  };
}

/** Renewal status color classes */
export const renewalStatusColors: Record<RenewalStatus, string> = {
  "Not Started": "text-slate-600 bg-slate-100",
  "Discovery": "text-blue-700 bg-blue-50",
  "Negotiation": "text-amber-700 bg-amber-50",
  "Committed": "text-emerald-700 bg-emerald-50",
  "Renewed": "text-emerald-800 bg-emerald-100",
  "Churned": "text-red-700 bg-red-50",
};

/** Customer type color classes */
export const customerTypeColors: Record<CustomerType, string> = {
  SaaS: "text-violet-700 bg-violet-50 border-violet-200",
  Services: "text-sky-700 bg-sky-50 border-sky-200",
  Hybrid: "text-indigo-700 bg-indigo-50 border-indigo-200",
};

/** Downsell risk color classes */
export const downsellRiskColors: Record<DownsellRisk, string> = {
  None: "text-emerald-700 bg-emerald-50",
  Low: "text-amber-600 bg-amber-50",
  Medium: "text-orange-700 bg-orange-50",
  High: "text-red-700 bg-red-50",
};

/** Get SaaS accounts sorted by LED urgency (most urgent first) */
export function getSaaSAccountsByUrgency(): Account[] {
  return ACCOUNTS
    .filter((a) => a.saasLicense)
    .sort((a, b) => {
      const daysA = daysUntilLED(a.saasLicense!.licenseEndDate);
      const daysB = daysUntilLED(b.saasLicense!.licenseEndDate);
      return daysA - daysB;
    });
}

/** Calculate total ARR at risk from accounts in renewal window with risk */
export function getARRAtRisk(renewalWindowMonths?: number): number {
  return ACCOUNTS
    .filter((a) => a.saasLicense && isInRenewalWindow(a, renewalWindowMonths) && (a.saasLicense.renewalRisk === "High" || a.saasLicense.renewalRisk === "Critical"))
    .reduce((sum, a) => sum + a.saasLicense!.annualLicenseValue, 0);
}

/** Calculate potential downsell ARR impact */
export function getDownsellRiskARR(): number {
  return ACCOUNTS
    .filter((a) => a.saasLicense && (a.saasLicense.downsellRisk === "High" || a.saasLicense.downsellRisk === "Medium"))
    .reduce((sum, a) => sum + Math.round(a.saasLicense!.annualLicenseValue * 0.3), 0); // Estimate 30% reduction
}

// Color helpers — warm-friendly palette
export const healthColor = (h: number) =>
  h >= 85 ? "text-emerald-700" : h >= 65 ? "text-amber-600" : "text-red-600";

export const healthBg = (h: number) =>
  h >= 85 ? "bg-emerald-600/10" : h >= 65 ? "bg-amber-500/10" : "bg-red-500/10";

export const tierColors: Record<string, string> = {
  Gold: "text-amber-700 bg-amber-100 border-amber-200",
  Silver: "text-slate-600 bg-slate-100 border-slate-200",
  Bronze: "text-orange-700 bg-orange-100 border-orange-200",
};

export const priorityColors: Record<string, string> = {
  Critical: "text-red-700 bg-red-50",
  High: "text-orange-700 bg-orange-50",
  Medium: "text-amber-700 bg-amber-50",
  Low: "text-emerald-700 bg-emerald-50",
};

export const statusColors: Record<string, string> = {
  Open: "text-red-700 bg-red-50",
  "In Progress": "text-amber-700 bg-amber-50",
  Resolved: "text-emerald-700 bg-emerald-50",
  Active: "text-emerald-700 bg-emerald-50",
  Scheduled: "text-blue-700 bg-blue-50",
  Draft: "text-slate-600 bg-slate-100",
  Overdue: "text-red-700 bg-red-50",
  "Due Soon": "text-amber-700 bg-amber-50",
  Pending: "text-blue-700 bg-blue-50",
  Paid: "text-emerald-700 bg-emerald-50",
};

/* ── Downsell Mitigation Signal Framework ──────────────────── */

export type SignalCategory = "support" | "csat" | "outreach" | "usage" | "billing" | "engagement";
export type SignalSeverity = "critical" | "high" | "medium" | "low" | "info";
export type MitigationStatus = "pending" | "in_progress" | "completed" | "dismissed";

export interface DownsellSignal {
  id: string;
  accountId: number;
  account: string;
  category: SignalCategory;
  severity: SignalSeverity;
  title: string;
  description: string;
  detectedDate: string;
  source: string;            // e.g. "Support Ticket T-1041", "CSAT Survey Q1"
  impactEstimate?: string;   // e.g. "-$8K ARR", "2 modules at risk"
  relatedItemId?: string;    // Cross-link to ticket, CSAT entry, etc.
  resolved: boolean;
}

export interface MitigationAction {
  id: string;
  signalId: string;
  accountId: number;
  account: string;
  title: string;
  description: string;
  assignee: string;
  status: MitigationStatus;
  dueDate: string;
  completedDate?: string;
  aiGenerated: boolean;
  priority: "urgent" | "high" | "normal";
}

export interface AIRecommendation {
  id: string;
  accountId: number;
  account: string;
  type: "retention_strategy" | "value_demonstration" | "executive_engagement" | "service_recovery" | "contract_restructure" | "adoption_boost";
  title: string;
  summary: string;
  detailedSteps: string[];
  confidence: number;        // 0-100
  estimatedImpact: string;   // e.g. "Prevent $12K downsell"
  relatedSignals: string[];  // signal IDs
  generatedDate: string;
}

export interface AccountRiskProfile {
  accountId: number;
  account: string;
  compositeScore: number;    // 0-100 (higher = more risk)
  signalCount: number;
  criticalSignals: number;
  arrExposed: number;
  activeMitigations: number;
  completedMitigations: number;
  trendDirection: "improving" | "stable" | "worsening";
  lastAssessment: string;
}

/* ── Signal Category Metadata ──────────────────────────────── */
export const signalCategoryConfig: Record<SignalCategory, { label: string; icon: string; color: string; bgColor: string }> = {
  support: { label: "Support Issues", icon: "LifeBuoy", color: "text-red-700", bgColor: "bg-red-50" },
  csat: { label: "CSAT Decline", icon: "Star", color: "text-amber-700", bgColor: "bg-amber-50" },
  outreach: { label: "Engagement Response", icon: "Send", color: "text-blue-700", bgColor: "bg-blue-50" },
  usage: { label: "Usage Drop", icon: "Activity", color: "text-violet-700", bgColor: "bg-violet-50" },
  billing: { label: "Billing Friction", icon: "Receipt", color: "text-orange-700", bgColor: "bg-orange-50" },
  engagement: { label: "Low Engagement", icon: "UserX", color: "text-slate-700", bgColor: "bg-slate-50" },
};

export const signalSeverityConfig: Record<SignalSeverity, { label: string; color: string; bgColor: string; weight: number }> = {
  critical: { label: "Critical", color: "text-red-700", bgColor: "bg-red-100", weight: 25 },
  high: { label: "High", color: "text-orange-700", bgColor: "bg-orange-100", weight: 15 },
  medium: { label: "Medium", color: "text-amber-700", bgColor: "bg-amber-100", weight: 8 },
  low: { label: "Low", color: "text-blue-700", bgColor: "bg-blue-100", weight: 3 },
  info: { label: "Info", color: "text-slate-600", bgColor: "bg-slate-100", weight: 1 },
};

/* ── Seed Data: Downsell Signals ───────────────────────────── */
export const DOWNSELL_SIGNALS: DownsellSignal[] = [
  // Edgeline Foods — Critical risk (health 54, LED May 15)
  { id: "DS-001", accountId: 5, account: "Edgeline Foods", category: "support", severity: "critical",
    title: "Recurring critical support tickets", description: "3 critical tickets in 30 days related to core Financials module. Customer expressed frustration with resolution times and system reliability.",
    detectedDate: "2026-03-20", source: "Support Tickets T-1041, T-1033, T-1028", impactEstimate: "-$11K ARR (Inventory module)", relatedItemId: "T-1041", resolved: false },
  { id: "DS-002", accountId: 5, account: "Edgeline Foods", category: "csat", severity: "critical",
    title: "CSAT score dropped below 3.0", description: "Latest CSAT survey returned 2.1/5. Customer cited 'lack of responsiveness' and 'system doesn't meet our needs anymore.' Multiple detractors in the feedback.",
    detectedDate: "2026-03-25", source: "CSAT Survey Q1 2026", impactEstimate: "Full churn risk", resolved: false },
  { id: "DS-003", accountId: 5, account: "Edgeline Foods", category: "usage", severity: "high",
    title: "Inventory module usage dropped 68%", description: "Monthly active users on Inventory module fell from 8 to 2 over the past 90 days. Only the finance team is still actively using the platform.",
    detectedDate: "2026-03-15", source: "Platform Analytics", impactEstimate: "-$11K ARR (Inventory module)", resolved: false },
  { id: "DS-004", accountId: 5, account: "Edgeline Foods", category: "engagement", severity: "high",
    title: "Executive sponsor unresponsive", description: "Sofia Ruiz has not responded to 3 outreach attempts over 45 days. Last QBR was declined. No executive engagement since January.",
    detectedDate: "2026-03-01", source: "Engagement Sequence", relatedItemId: "outreach-edgeline", resolved: false },
  { id: "DS-005", accountId: 5, account: "Edgeline Foods", category: "billing", severity: "medium",
    title: "Requested pricing review before renewal", description: "Customer's procurement team reached out requesting a detailed pricing breakdown and competitor comparison. This often precedes a downsell or churn conversation.",
    detectedDate: "2026-04-02", source: "Email from procurement@edgeline.co", resolved: false },

  // BlueWave Logistics — High risk (health 67, LED Jun 15)
  { id: "DS-006", accountId: 2, account: "BlueWave Logistics", category: "support", severity: "high",
    title: "Multi-currency module critical failures", description: "Revenue recognition module throwing persistent errors on multi-currency invoices. Customer escalated to VP level. Issue unresolved for 3 days.",
    detectedDate: "2026-04-07", source: "Support Ticket T-1041", impactEstimate: "-$8K ARR (Service Cloud)", relatedItemId: "T-1041", resolved: false },
  { id: "DS-007", accountId: 2, account: "BlueWave Logistics", category: "csat", severity: "medium",
    title: "CSAT trending downward (3.8 → 3.2)", description: "CSAT declined from 3.8 to 3.2 over the last two quarters. Key complaints: slow ticket resolution and lack of proactive communication.",
    detectedDate: "2026-03-30", source: "CSAT Trend Analysis", resolved: false },
  { id: "DS-008", accountId: 2, account: "BlueWave Logistics", category: "usage", severity: "medium",
    title: "Service Cloud adoption stagnating", description: "Only 12 of 20 licensed seats are active. Service Cloud usage has plateaued — team is using a parallel helpdesk tool for some workflows.",
    detectedDate: "2026-03-10", source: "Platform Analytics", impactEstimate: "-$8K ARR (8 unused seats)", resolved: false },
  { id: "DS-009", accountId: 2, account: "BlueWave Logistics", category: "outreach", severity: "low",
    title: "Health check follow-up not scheduled", description: "Outreach sequence for health check follow-up is still in Draft status. No proactive engagement scheduled despite declining health score.",
    detectedDate: "2026-04-05", source: "Outreach Tracker", resolved: false },
  { id: "DS-010", accountId: 2, account: "BlueWave Logistics", category: "billing", severity: "high",
    title: "Late payment on current invoice", description: "Invoice INV-2039 ($4,200) is 11 days overdue. Combined with support issues, this signals potential budget reallocation or dissatisfaction.",
    detectedDate: "2026-04-10", source: "AR Tracker INV-2039", relatedItemId: "INV-2039", resolved: false },

  // Apex Manufacturing — Low risk but monitoring (health 92, LED Jul 31)
  { id: "DS-011", accountId: 1, account: "Apex Manufacturing", category: "usage", severity: "low",
    title: "CRM module underutilized", description: "CRM module has only 5 of 45 users active. Sales team appears to be using a separate CRM tool. Module may be at risk during renewal.",
    detectedDate: "2026-03-20", source: "Platform Analytics", impactEstimate: "-$6K ARR (CRM module)", resolved: false },
  { id: "DS-012", accountId: 1, account: "Apex Manufacturing", category: "engagement", severity: "info",
    title: "New CFO appointed — relationship reset needed", description: "Dana Reyes informed us that a new CFO started in March. The previous CFO was our executive sponsor. Need to establish new relationship before renewal.",
    detectedDate: "2026-03-28", source: "Account Manager Notes", resolved: false },

  // Driftwood Capital — Minimal risk (health 95, LED Nov 30)
  { id: "DS-013", accountId: 4, account: "Driftwood Capital", category: "usage", severity: "info",
    title: "Pardot module usage below benchmark", description: "Pardot usage is at 40% of benchmark for similar accounts. Marketing team may not be fully leveraging the tool, which could surface during renewal discussions.",
    detectedDate: "2026-03-15", source: "Platform Analytics", impactEstimate: "-$12K ARR (Pardot)", resolved: false },
];

/* ── Seed Data: Mitigation Actions ─────────────────────────── */
export const MITIGATION_ACTIONS: MitigationAction[] = [
  // Edgeline Foods mitigations
  { id: "MA-001", signalId: "DS-001", accountId: 5, account: "Edgeline Foods",
    title: "Assign dedicated support engineer", description: "Escalate all Edgeline tickets to a dedicated senior engineer. Ensure same-day response on all critical issues.",
    assignee: "Sarah Chen", status: "in_progress", dueDate: "2026-04-12", aiGenerated: false, priority: "urgent" },
  { id: "MA-002", signalId: "DS-002", accountId: 5, account: "Edgeline Foods",
    title: "Schedule executive apology call", description: "VP of Customer Success to call Sofia Ruiz directly. Acknowledge service gaps, present remediation plan, and offer concessions.",
    assignee: "Jordan Davis", status: "pending", dueDate: "2026-04-14", aiGenerated: true, priority: "urgent" },
  { id: "MA-003", signalId: "DS-003", accountId: 5, account: "Edgeline Foods",
    title: "Conduct Inventory module value workshop", description: "Schedule a 90-minute workshop demonstrating advanced Inventory features. Bring ROI data showing cost savings vs. manual processes.",
    assignee: "Priya Nair", status: "pending", dueDate: "2026-04-18", aiGenerated: true, priority: "high" },
  { id: "MA-004", signalId: "DS-004", accountId: 5, account: "Edgeline Foods",
    title: "Engage alternate stakeholder", description: "Since Sofia Ruiz is unresponsive, identify and engage the VP of Operations or CFO as an alternate champion.",
    assignee: "Jordan Davis", status: "in_progress", dueDate: "2026-04-15", aiGenerated: true, priority: "high" },

  // BlueWave Logistics mitigations
  { id: "MA-005", signalId: "DS-006", accountId: 2, account: "BlueWave Logistics",
    title: "Fast-track multi-currency fix", description: "Coordinate with engineering to prioritize the multi-currency bug fix. Provide daily status updates to Marcus Lin.",
    assignee: "Sarah Chen", status: "in_progress", dueDate: "2026-04-11", aiGenerated: false, priority: "urgent" },
  { id: "MA-006", signalId: "DS-008", accountId: 2, account: "BlueWave Logistics",
    title: "Service Cloud adoption review", description: "Schedule a session with the support team to understand why they're using a parallel helpdesk. Identify gaps and propose Service Cloud customizations.",
    assignee: "Jordan Davis", status: "pending", dueDate: "2026-04-20", aiGenerated: true, priority: "high" },
  { id: "MA-007", signalId: "DS-010", accountId: 2, account: "BlueWave Logistics",
    title: "Resolve billing dispute", description: "Contact accounts payable to understand the late payment. Offer flexible payment terms if needed to maintain goodwill.",
    assignee: "Jordan Davis", status: "pending", dueDate: "2026-04-13", aiGenerated: false, priority: "normal" },

  // Apex Manufacturing mitigations
  { id: "MA-008", signalId: "DS-012", accountId: 1, account: "Apex Manufacturing",
    title: "Schedule new CFO introduction meeting", description: "Arrange an executive-to-executive introduction with the new CFO. Present a value summary and roadmap aligned with their strategic priorities.",
    assignee: "Jordan Davis", status: "pending", dueDate: "2026-04-25", aiGenerated: true, priority: "normal" },
];

/* ── Seed Data: AI Recommendations ─────────────────────────── */
export const AI_RECOMMENDATIONS: AIRecommendation[] = [
  // Edgeline Foods
  { id: "AIR-001", accountId: 5, account: "Edgeline Foods", type: "service_recovery",
    title: "Emergency Service Recovery Plan",
    summary: "Edgeline Foods is showing critical downsell signals across support, CSAT, and engagement. Immediate intervention is needed to prevent full Inventory module churn and potential account loss.",
    detailedSteps: [
      "Day 1: VP-level apology call to Sofia Ruiz acknowledging service failures and presenting a 30-day remediation plan",
      "Day 1-3: Assign a dedicated support engineer (Sarah Chen) for all Edgeline tickets with 2-hour SLA",
      "Day 5: Deliver a custom ROI report showing $47K in value delivered through Financials module last year",
      "Day 7: Schedule an on-site Inventory module optimization workshop with their operations team",
      "Day 14: Present a renewal proposal with a 15% loyalty discount on Inventory module for early commitment",
      "Day 21: Executive sponsor check-in — if Sofia remains unresponsive, escalate to CFO with a business case",
      "Day 30: Review all open tickets, confirm resolution, and conduct a satisfaction pulse survey"
    ],
    confidence: 72, estimatedImpact: "Prevent $11K Inventory module downsell, protect $22K total license ARR",
    relatedSignals: ["DS-001", "DS-002", "DS-003", "DS-004", "DS-005"], generatedDate: "2026-04-10" },
  { id: "AIR-002", accountId: 5, account: "Edgeline Foods", type: "adoption_boost",
    title: "Inventory Module Re-Adoption Campaign",
    summary: "Usage data shows Inventory module adoption dropped 68%. A targeted re-adoption campaign could demonstrate value and prevent module cancellation.",
    detailedSteps: [
      "Identify the 6 users who stopped using Inventory module and survey them on barriers",
      "Create a customized training plan addressing the specific pain points identified",
      "Schedule 3 weekly 30-minute 'power user' sessions focused on time-saving workflows",
      "Set up automated usage dashboards showing team productivity gains",
      "Establish a monthly check-in cadence with the operations manager to track adoption"
    ],
    confidence: 65, estimatedImpact: "Restore Inventory module usage to 80%+ benchmark, protecting $11K ARR",
    relatedSignals: ["DS-003"], generatedDate: "2026-04-10" },

  // BlueWave Logistics
  { id: "AIR-003", accountId: 2, account: "BlueWave Logistics", type: "retention_strategy",
    title: "Seat Optimization & Value Lock-In",
    summary: "BlueWave has 8 unused Service Cloud seats and is using a parallel helpdesk. Rather than losing the seats, propose a right-sizing with a multi-year commitment discount.",
    detailedSteps: [
      "Audit the 8 unused seats — identify which teams/roles they were allocated to",
      "Propose a 'right-size' from 20 to 15 seats with a 10% per-seat discount for a 2-year commitment",
      "Demonstrate Service Cloud advantages over their parallel helpdesk with a side-by-side comparison",
      "Offer free Service Cloud admin training for their support team lead",
      "Create a 90-day adoption plan with monthly usage targets and check-ins"
    ],
    confidence: 78, estimatedImpact: "Retain $20K+ of $28K license ARR with controlled right-sizing vs. uncontrolled churn",
    relatedSignals: ["DS-006", "DS-007", "DS-008"], generatedDate: "2026-04-10" },
  { id: "AIR-004", accountId: 2, account: "BlueWave Logistics", type: "executive_engagement",
    title: "Executive Sponsor Re-Engagement",
    summary: "The VP-level escalation on the multi-currency issue presents an opportunity to turn a negative into a positive by demonstrating responsiveness and commitment.",
    detailedSteps: [
      "Resolve the multi-currency bug within 48 hours with a dedicated engineering resource",
      "Have VP of Customer Success personally call the BlueWave VP with resolution details",
      "Offer a complimentary health check and optimization review as a goodwill gesture",
      "Propose a quarterly executive alignment meeting to prevent future escalations"
    ],
    confidence: 82, estimatedImpact: "Rebuild executive trust, reduce renewal risk from High to Medium",
    relatedSignals: ["DS-006", "DS-010"], generatedDate: "2026-04-10" },

  // Apex Manufacturing
  { id: "AIR-005", accountId: 1, account: "Apex Manufacturing", type: "value_demonstration",
    title: "CRM Module Value Discovery",
    summary: "CRM module has very low adoption (5/45 users). Before renewal, proactively demonstrate value or propose a module swap to prevent the customer from dropping it.",
    detailedSteps: [
      "Interview the 5 active CRM users to understand their workflows and satisfaction",
      "Identify why the sales team chose a separate CRM — feature gaps, training, or preference",
      "Prepare a comparison showing integration benefits of unified NetSuite CRM vs. separate tool",
      "If CRM is truly not needed, proactively propose replacing it with Analytics Premium at similar price point",
      "Present findings to Dana Reyes with a recommendation before renewal discussions begin"
    ],
    confidence: 70, estimatedImpact: "Protect or replace $6K CRM module ARR, strengthen renewal position",
    relatedSignals: ["DS-011", "DS-012"], generatedDate: "2026-04-10" },
];

/* ── Risk Score Calculation ────────────────────────────────── */
/** Admin-configurable downsell signal weights — maps signal category to weight multiplier */
export interface DownsellWeightsConfig {
  signalWeights?: {
    usageDrop?: number;
    supportIssues?: number;
    csatDecline?: number;
    billingFriction?: number;
    lowEngagement?: number;
    outreachGhosting?: number;
  };
  renewalThresholds?: Partial<RenewalThresholds>;
}

/** Map signal category to admin weight key */
const SIGNAL_CATEGORY_TO_WEIGHT_KEY: Record<SignalCategory, keyof NonNullable<DownsellWeightsConfig["signalWeights"]>> = {
  usage: "usageDrop",
  support: "supportIssues",
  csat: "csatDecline",
  billing: "billingFriction",
  engagement: "lowEngagement",
  outreach: "outreachGhosting",
};

const DEFAULT_SIGNAL_WEIGHTS = { usageDrop: 25, supportIssues: 20, csatDecline: 20, billingFriction: 15, lowEngagement: 10, outreachGhosting: 10 };

export function calculateAccountRiskProfile(accountId: number, config?: DownsellWeightsConfig): AccountRiskProfile {
  const account = ACCOUNTS.find(a => a.id === accountId);
  if (!account) throw new Error(`Account ${accountId} not found`);

  const signals = DOWNSELL_SIGNALS.filter(s => s.accountId === accountId && !s.resolved);
  const mitigations = MITIGATION_ACTIONS.filter(m => m.accountId === accountId);
  const activeMitigations = mitigations.filter(m => m.status === "in_progress" || m.status === "pending");
  const completedMitigations = mitigations.filter(m => m.status === "completed");

  const weights = { ...DEFAULT_SIGNAL_WEIGHTS, ...config?.signalWeights };
  const rt = { ...DEFAULT_RENEWAL_THRESHOLDS, ...config?.renewalThresholds };

  // Weighted signal score — uses admin-configured category weights as multipliers
  const signalScore = signals.reduce((sum, s) => {
    const baseWeight = signalSeverityConfig[s.severity].weight;
    const catKey = SIGNAL_CATEGORY_TO_WEIGHT_KEY[s.category];
    const catMultiplier = (weights[catKey] ?? 15) / 15; // normalize: default 15 = 1x
    return sum + baseWeight * catMultiplier;
  }, 0);

  // Health score inversion (lower health = higher risk)
  const healthRisk = Math.max(0, (100 - account.health) * 0.5);

  // LED urgency factor — uses admin renewal thresholds
  let ledFactor = 0;
  if (account.saasLicense) {
    const days = daysUntilLED(account.saasLicense.licenseEndDate);
    if (days <= rt.criticalThresholdDays) ledFactor = 30;
    else if (days <= rt.urgentThresholdDays) ledFactor = 20;
    else if (days <= rt.renewalWindowMonths * 30) ledFactor = 10;
  }

  // Mitigation offset (active mitigations reduce risk slightly)
  const mitigationOffset = completedMitigations.length * 5 + activeMitigations.length * 2;

  const rawScore = signalScore + healthRisk + ledFactor - mitigationOffset;
  const compositeScore = Math.min(100, Math.max(0, Math.round(rawScore)));

  // Trend: compare signal dates to determine direction
  const recentSignals = signals.filter(s => {
    const d = new Date(s.detectedDate);
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    return d >= twoWeeksAgo;
  });
  const trendDirection = completedMitigations.length > 0 && recentSignals.length === 0
    ? "improving"
    : recentSignals.length >= 2
    ? "worsening"
    : "stable";

  const arrExposed = account.saasLicense
    ? Math.round(account.saasLicense.annualLicenseValue * (compositeScore / 100))
    : 0;

  return {
    accountId,
    account: account.name,
    compositeScore,
    signalCount: signals.length,
    criticalSignals: signals.filter(s => s.severity === "critical").length,
    arrExposed,
    activeMitigations: activeMitigations.length,
    completedMitigations: completedMitigations.length,
    trendDirection,
    lastAssessment: "2026-04-10",
  };
}

/** Get all account risk profiles sorted by composite score (highest risk first) */
export function getAllRiskProfiles(config?: DownsellWeightsConfig): AccountRiskProfile[] {
  return ACCOUNTS
    .filter(a => a.saasLicense)
    .map(a => calculateAccountRiskProfile(a.id, config))
    .sort((a, b) => b.compositeScore - a.compositeScore);
}

/** Admin-configurable risk thresholds */
export interface RiskThresholdConfig {
  low: number;    // below = Low risk (default 20)
  medium: number; // below = Moderate risk (default 45)
  high: number;   // below = High risk (default 70), above = Critical
}

const DEFAULT_RISK_THRESHOLDS: RiskThresholdConfig = { low: 20, medium: 45, high: 70 };

/** Risk score color helpers — uses admin-configured thresholds */
export function riskScoreColor(score: number, thresholds?: Partial<RiskThresholdConfig>): { text: string; bg: string; ring: string } {
  const t = { ...DEFAULT_RISK_THRESHOLDS, ...thresholds };
  if (score >= t.high) return { text: "text-red-700", bg: "bg-red-50", ring: "ring-red-200" };
  if (score >= t.medium) return { text: "text-orange-700", bg: "bg-orange-50", ring: "ring-orange-200" };
  if (score >= t.low) return { text: "text-amber-700", bg: "bg-amber-50", ring: "ring-amber-200" };
  return { text: "text-emerald-700", bg: "bg-emerald-50", ring: "ring-emerald-200" };
}

export function riskScoreLabel(score: number, thresholds?: Partial<RiskThresholdConfig>): string {
  const t = { ...DEFAULT_RISK_THRESHOLDS, ...thresholds };
  if (score >= t.high) return "Critical Risk";
  if (score >= t.medium) return "High Risk";
  if (score >= t.low) return "Moderate Risk";
  return "Low Risk";
}
