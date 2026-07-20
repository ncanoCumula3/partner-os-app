/**
 * pipeline.ts — Enhanced pipeline data model with products, stage history,
 * activities, contacts, notes, and forecasting helpers.
 */

/* ─── Types ─── */

export type DealStage = "Qualification" | "Discovery" | "Proposal" | "Negotiation" | "Closed Won" | "Closed Lost";

export const DEAL_STAGES: { name: DealStage; probability: number; color: string; dot: string; bgGradient: string }[] = [
  { name: "Qualification", probability: 10, color: "border-violet-500/30", dot: "bg-violet-500", bgGradient: "from-violet-500/20 to-violet-500/5" },
  { name: "Discovery",     probability: 25, color: "border-indigo-500/30", dot: "bg-indigo-500", bgGradient: "from-indigo-500/20 to-indigo-500/5" },
  { name: "Proposal",      probability: 50, color: "border-blue-500/30",   dot: "bg-blue-500",   bgGradient: "from-blue-500/20 to-blue-500/5" },
  { name: "Negotiation",   probability: 75, color: "border-amber-500/30",  dot: "bg-amber-500",  bgGradient: "from-amber-500/20 to-amber-500/5" },
  { name: "Closed Won",    probability: 100, color: "border-emerald-500/30", dot: "bg-emerald-500", bgGradient: "from-emerald-500/20 to-emerald-500/5" },
  { name: "Closed Lost",   probability: 0,  color: "border-red-500/30",    dot: "bg-red-500",    bgGradient: "from-red-500/20 to-red-500/5" },
];

export type DealType = "New Business" | "Upsell" | "Cross-sell" | "Renewal" | "Expansion";
export type ProductCategory = "Software" | "Services" | "Support" | "Training";
export type BillingFrequency = "One-time" | "Monthly" | "Annual";
export type ProductStatus = "Proposed" | "Accepted" | "Removed";
export type ActivityType = "Call" | "Email" | "Meeting" | "Task" | "Demo" | "Note";
export type ActivityOutcome = "Completed" | "No Answer" | "Rescheduled" | "Follow-up Needed" | "Positive" | "Neutral" | "Negative";
export type ContactRole = "Decision Maker" | "Champion" | "Influencer" | "Blocker" | "End User" | "Technical Evaluator" | "Legal/Procurement";
export type DealNoteCategory = "Strategy" | "Technical" | "Competitive" | "Internal" | "Client Feedback" | "General";
export type ForecastCategory = "Commit" | "Best Case" | "Pipeline" | "Omitted";

export interface DealProduct {
  id: number;
  name: string;
  category: ProductCategory;
  quantity: number;
  unitPrice: number;
  discountPct: number;
  billingFrequency: BillingFrequency;
  status: ProductStatus;
  description?: string;
}

export interface StageChange {
  id: number;
  fromStage: DealStage | "Created";
  toStage: DealStage;
  changedBy: string;
  changedAt: string; // ISO date
  reason: string;
  notes: string;
  nextSteps?: string;
}

export interface DealActivity {
  id: number;
  type: ActivityType;
  subject: string;
  description?: string;
  date: string; // ISO date
  by: string;
  outcome?: ActivityOutcome;
  duration?: number; // minutes
  relatedTo?: string;
  followUpDate?: string; // ISO date for scheduled follow-up
  followUpAction?: string; // description of the follow-up action
}

export interface DealContact {
  id: number;
  name: string;
  role: ContactRole;
  title: string;
  email: string;
  phone?: string;
  isPrimary: boolean;
  notes?: string;
}

export interface DealNote {
  id: number;
  title: string;
  content: string;
  category: DealNoteCategory;
  author: string;
  createdAt: string; // ISO date
  updatedAt?: string;
  isPinned: boolean;
}

export interface Deal {
  id: number;
  name: string;
  accountId: number;
  accountName: string;
  type: DealType;
  stage: DealStage;
  probability: number;
  forecastCategory: ForecastCategory;
  owner: string;
  value: number; // total deal value computed from products
  createdAt: string; // ISO date
  expectedCloseDate: string; // ISO date
  closedDate?: string;
  nextStep: string;
  description: string;
  competitors: string[];
  products: DealProduct[];
  stageHistory: StageChange[];
  activities: DealActivity[];
  contacts: DealContact[];
  notes: DealNote[];
  lostReason?: string;
}

/* ─── Label / Color Maps ─── */

export const dealTypeColors: Record<DealType, string> = {
  "New Business": "bg-violet-100 text-violet-800 border-violet-200",
  "Upsell": "bg-blue-100 text-blue-800 border-blue-200",
  "Cross-sell": "bg-cyan-100 text-cyan-800 border-cyan-200",
  "Renewal": "bg-amber-100 text-amber-800 border-amber-200",
  "Expansion": "bg-emerald-100 text-emerald-800 border-emerald-200",
};

export const activityTypeIcons: Record<ActivityType, string> = {
  Call: "Phone",
  Email: "Mail",
  Meeting: "Users",
  Task: "CheckSquare",
  Demo: "Monitor",
  Note: "FileText",
};

export const noteCategoryColors: Record<DealNoteCategory, { bg: string; text: string; border: string }> = {
  Strategy: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  Technical: { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200" },
  Competitive: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  Internal: { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200" },
  "Client Feedback": { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  General: { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200" },
};

export const contactRoleColors: Record<ContactRole, string> = {
  "Decision Maker": "bg-red-100 text-red-800",
  "Champion": "bg-emerald-100 text-emerald-800",
  "Influencer": "bg-blue-100 text-blue-800",
  "Blocker": "bg-orange-100 text-orange-800",
  "End User": "bg-gray-100 text-gray-800",
  "Technical Evaluator": "bg-violet-100 text-violet-800",
  "Legal/Procurement": "bg-amber-100 text-amber-800",
};

export const forecastCategoryColors: Record<ForecastCategory, string> = {
  Commit: "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Best Case": "bg-blue-100 text-blue-800 border-blue-200",
  Pipeline: "bg-amber-100 text-amber-800 border-amber-200",
  Omitted: "bg-gray-100 text-gray-800 border-gray-200",
};

/* ─── Helper Functions ─── */

export function getDealValue(products: DealProduct[]): number {
  return products
    .filter(p => p.status !== "Removed")
    .reduce((sum, p) => sum + (p.quantity * p.unitPrice * (1 - p.discountPct / 100)), 0);
}

export function getWeightedValue(deal: Deal): number {
  return deal.value * (deal.probability / 100);
}

export function getDaysInStage(deal: Deal): number {
  const lastChange = deal.stageHistory[deal.stageHistory.length - 1];
  if (!lastChange) return 0;
  const changeDate = new Date(lastChange.changedAt);
  const now = new Date();
  return Math.floor((now.getTime() - changeDate.getTime()) / (1000 * 60 * 60 * 24));
}

export function getDaysUntilClose(deal: Deal): number {
  const close = new Date(deal.expectedCloseDate);
  const now = new Date();
  return Math.ceil((close.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function getSalesCycleDays(deal: Deal): number {
  const created = new Date(deal.createdAt);
  const end = deal.closedDate ? new Date(deal.closedDate) : new Date();
  return Math.floor((end.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
}

export function getDealsForAccount(deals: Deal[], accountId: number): Deal[] {
  return deals.filter(d => d.accountId === accountId);
}

export function getOpenDeals(deals: Deal[]): Deal[] {
  return deals.filter(d => d.stage !== "Closed Won" && d.stage !== "Closed Lost");
}

export function getPipelineKPIs(deals: Deal[]) {
  const open = getOpenDeals(deals);
  const closed = deals.filter(d => d.stage === "Closed Won");
  const lost = deals.filter(d => d.stage === "Closed Lost");
  const totalPipeline = open.reduce((s, d) => s + d.value, 0);
  const weightedPipeline = open.reduce((s, d) => s + getWeightedValue(d), 0);
  const avgDealSize = open.length > 0 ? totalPipeline / open.length : 0;
  const winRate = (closed.length + lost.length) > 0 ? (closed.length / (closed.length + lost.length)) * 100 : 0;
  const avgSalesCycle = closed.length > 0 ? closed.reduce((s, d) => s + getSalesCycleDays(d), 0) / closed.length : 0;
  const closingThisMonth = open.filter(d => {
    const close = new Date(d.expectedCloseDate);
    const now = new Date();
    return close.getMonth() === now.getMonth() && close.getFullYear() === now.getFullYear();
  });
  return {
    totalPipeline, weightedPipeline, avgDealSize, winRate, avgSalesCycle,
    openCount: open.length, closedCount: closed.length, lostCount: lost.length,
    closingThisMonth: closingThisMonth.length,
    closingThisMonthValue: closingThisMonth.reduce((s, d) => s + d.value, 0),
  };
}

export function getForecastData(deals: Deal[]) {
  const open = getOpenDeals(deals);
  const commit = open.filter(d => d.forecastCategory === "Commit");
  const bestCase = open.filter(d => d.forecastCategory === "Best Case");
  const pipeline = open.filter(d => d.forecastCategory === "Pipeline");
  return {
    commit: { count: commit.length, value: commit.reduce((s, d) => s + d.value, 0), weighted: commit.reduce((s, d) => s + getWeightedValue(d), 0) },
    bestCase: { count: bestCase.length, value: bestCase.reduce((s, d) => s + d.value, 0), weighted: bestCase.reduce((s, d) => s + getWeightedValue(d), 0) },
    pipeline: { count: pipeline.length, value: pipeline.reduce((s, d) => s + d.value, 0), weighted: pipeline.reduce((s, d) => s + getWeightedValue(d), 0) },
    total: { count: open.length, value: open.reduce((s, d) => s + d.value, 0), weighted: open.reduce((s, d) => s + getWeightedValue(d), 0) },
  };
}

/* ─── Conversion Analytics Helpers ─── */

export function getStageConversionRates(deals: Deal[]) {
  const openStages: DealStage[] = ["Qualification", "Discovery", "Proposal", "Negotiation"];
  const results: { fromStage: string; toStage: string; entered: number; advanced: number; rate: number }[] = [];

  for (let i = 0; i < openStages.length; i++) {
    const from = i === 0 ? "Created" : openStages[i - 1];
    const to = openStages[i];
    // Count deals that entered this stage (have a stageHistory entry with toStage === to)
    const entered = deals.filter(d => d.stageHistory.some(sh => sh.toStage === to)).length;
    // Count deals that advanced past this stage
    const nextStage = i < openStages.length - 1 ? openStages[i + 1] : "Closed Won";
    const advanced = deals.filter(d => d.stageHistory.some(sh => sh.toStage === nextStage)).length;
    results.push({ fromStage: to, toStage: nextStage, entered, advanced, rate: entered > 0 ? (advanced / entered) * 100 : 0 });
  }
  return results;
}

export function getAvgTimePerStage(deals: Deal[]) {
  const openStages: DealStage[] = ["Qualification", "Discovery", "Proposal", "Negotiation"];
  const results: { stage: string; avgDays: number; dealCount: number }[] = [];

  for (const stage of openStages) {
    const durations: number[] = [];
    for (const deal of deals) {
      const entryChange = deal.stageHistory.find(sh => sh.toStage === stage);
      if (!entryChange) continue;
      const exitChange = deal.stageHistory.find(sh => sh.fromStage === stage);
      const entryDate = new Date(entryChange.changedAt);
      const exitDate = exitChange ? new Date(exitChange.changedAt) : (deal.stage === stage ? new Date() : null);
      if (exitDate) {
        durations.push(Math.max(1, Math.floor((exitDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24))));
      }
    }
    results.push({
      stage,
      avgDays: durations.length > 0 ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length) : 0,
      dealCount: durations.length,
    });
  }
  return results;
}

export function getWinLossAnalysis(deals: Deal[]) {
  const won = deals.filter(d => d.stage === "Closed Won");
  const lost = deals.filter(d => d.stage === "Closed Lost");
  const total = won.length + lost.length;
  const winRate = total > 0 ? (won.length / total) * 100 : 0;
  const avgWonValue = won.length > 0 ? won.reduce((s, d) => s + d.value, 0) / won.length : 0;
  const avgLostValue = lost.length > 0 ? lost.reduce((s, d) => s + d.value, 0) / lost.length : 0;
  const avgWonCycle = won.length > 0 ? won.reduce((s, d) => s + getSalesCycleDays(d), 0) / won.length : 0;
  const avgLostCycle = lost.length > 0 ? lost.reduce((s, d) => s + getSalesCycleDays(d), 0) / lost.length : 0;

  // Win rate by deal type
  const types: DealType[] = ["New Business", "Upsell", "Cross-sell", "Renewal", "Expansion"];
  const byType = types.map(type => {
    const typeWon = won.filter(d => d.type === type).length;
    const typeLost = lost.filter(d => d.type === type).length;
    const typeTotal = typeWon + typeLost;
    return { type, won: typeWon, lost: typeLost, total: typeTotal, rate: typeTotal > 0 ? (typeWon / typeTotal) * 100 : 0 };
  }).filter(t => t.total > 0);

  // Lost reasons
  const lostReasons = lost.filter(d => d.lostReason).reduce((acc, d) => {
    acc[d.lostReason!] = (acc[d.lostReason!] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return { won: won.length, lost: lost.length, total, winRate, avgWonValue, avgLostValue, avgWonCycle, avgLostCycle, byType, lostReasons };
}

export function getPipelineVelocity(deals: Deal[]) {
  const open = getOpenDeals(deals);
  const kpis = getPipelineKPIs(deals);
  // Pipeline velocity = (# of deals * avg deal value * win rate) / avg sales cycle
  const velocity = kpis.avgSalesCycle > 0
    ? (open.length * kpis.avgDealSize * (kpis.winRate / 100)) / kpis.avgSalesCycle
    : 0;
  return { velocity, openCount: open.length, avgDealSize: kpis.avgDealSize, winRate: kpis.winRate, avgCycle: kpis.avgSalesCycle };
}

/* ─── Seed Data ─── */

export const SEED_DEALS: Deal[] = [
  {
    id: 1,
    name: "Advanced Analytics Upsell",
    accountId: 4, accountName: "Driftwood Capital",
    type: "Upsell", stage: "Negotiation", probability: 75,
    forecastCategory: "Commit",
    owner: "Jordan Davis",
    value: 36000,
    createdAt: "2026-02-14", expectedCloseDate: "2026-04-28",
    nextStep: "Final pricing review with CFO Tom Hargrove",
    description: "Upsell of Advanced Analytics module to Driftwood Capital. Strong champion in Tom Hargrove (CFO). Budget pre-approved. Legal review of MSA amendment in progress.",
    competitors: ["Gainsight", "Totango"],
    products: [
      { id: 1, name: "Advanced Analytics Module", category: "Software", quantity: 1, unitPrice: 24000, discountPct: 0, billingFrequency: "Annual", status: "Accepted", description: "Full analytics suite with custom dashboards and predictive scoring" },
      { id: 2, name: "Analytics Implementation", category: "Services", quantity: 40, unitPrice: 200, discountPct: 0, billingFrequency: "One-time", status: "Accepted", description: "40 hours implementation and configuration" },
      { id: 3, name: "Analytics Training Package", category: "Training", quantity: 2, unitPrice: 2000, discountPct: 0, billingFrequency: "One-time", status: "Proposed", description: "2-day on-site training for power users" },
    ],
    stageHistory: [
      { id: 1, fromStage: "Created", toStage: "Qualification", changedBy: "Jordan Davis", changedAt: "2026-02-14", reason: "New opportunity identified", notes: "Tom mentioned analytics needs during QBR", nextSteps: "Schedule discovery call" },
      { id: 2, fromStage: "Qualification", toStage: "Discovery", changedBy: "Jordan Davis", changedAt: "2026-02-28", reason: "Budget confirmed", notes: "CFO confirmed budget allocation for Q2", nextSteps: "Deep-dive on requirements" },
      { id: 3, fromStage: "Discovery", toStage: "Proposal", changedBy: "Jordan Davis", changedAt: "2026-03-18", reason: "Requirements gathered", notes: "All technical and business requirements documented. 3 modules identified.", nextSteps: "Prepare formal proposal" },
      { id: 4, fromStage: "Proposal", toStage: "Negotiation", changedBy: "Jordan Davis", changedAt: "2026-04-02", reason: "Proposal accepted in principle", notes: "Tom approved the proposal scope. Moving to pricing and legal review.", nextSteps: "Final pricing review with CFO" },
    ],
    activities: [
      { id: 1, type: "Email", subject: "Pricing proposal v3 sent", date: "2026-04-10", by: "Jordan Davis", outcome: "Completed" },
      { id: 2, type: "Email", subject: "Legal redline received", date: "2026-04-08", by: "Tom Hargrove", outcome: "Follow-up Needed" },
      { id: 3, type: "Demo", subject: "Analytics module live demo", date: "2026-04-02", by: "Jordan Davis", outcome: "Positive", duration: 60 },
      { id: 4, type: "Meeting", subject: "Requirements workshop", date: "2026-03-18", by: "Jordan Davis", outcome: "Completed", duration: 90 },
      { id: 5, type: "Call", subject: "Discovery call — requirements gathered", date: "2026-02-28", by: "Jordan Davis", outcome: "Positive", duration: 45 },
      { id: 6, type: "Call", subject: "Initial interest discussion", date: "2026-02-14", by: "Jordan Davis", outcome: "Positive", duration: 30 },
    ],
    contacts: [
      { id: 1, name: "Tom Hargrove", role: "Decision Maker", title: "CFO", email: "tom.hargrove@driftwood.com", phone: "(555) 234-5678", isPrimary: true, notes: "Strong champion. Drives budget decisions." },
      { id: 2, name: "Lisa Park", role: "Technical Evaluator", title: "VP Engineering", email: "lisa.park@driftwood.com", isPrimary: false, notes: "Evaluating technical fit and integration requirements" },
      { id: 3, name: "David Chen", role: "Legal/Procurement", title: "General Counsel", email: "david.chen@driftwood.com", isPrimary: false, notes: "Reviewing MSA amendment" },
    ],
    notes: [
      { id: 1, title: "Competitive positioning", content: "Gainsight is also in conversation but we have deeper integration with their Salesforce instance. Key differentiator is our native analytics vs. their bolt-on approach. Tom confirmed we're the preferred vendor.", category: "Competitive", author: "Jordan Davis", createdAt: "2026-04-05", isPinned: true },
      { id: 2, title: "Legal review timeline", content: "David Chen (GC) expects to complete MSA redline by Apr 15. Main sticking point is the data processing addendum — they want EU-standard protections even though they're US-based.", category: "Strategy", author: "Jordan Davis", createdAt: "2026-04-08", isPinned: false },
      { id: 3, title: "Training scope discussion", content: "Tom wants on-site training for 15 power users across 3 departments. May need to expand training package from 2 to 3 days. This could increase deal value by $2K.", category: "Client Feedback", author: "Sarah Chen", createdAt: "2026-04-03", isPinned: false },
    ],
  },
  {
    id: 2,
    name: "Module Expansion — Inventory, WMS, MRP",
    accountId: 1, accountName: "Apex Manufacturing",
    type: "Expansion", stage: "Proposal", probability: 50,
    forecastCategory: "Best Case",
    owner: "Sarah Chen",
    value: 28000,
    createdAt: "2026-03-05", expectedCloseDate: "2026-05-15",
    nextStep: "Schedule technical deep-dive with IT team",
    description: "Expansion of 3 new NetSuite modules (Inventory, WMS, MRP) for Apex Manufacturing. Dana Reyes is the internal champion. Need VP of IT buy-in before negotiation.",
    competitors: [],
    products: [
      { id: 1, name: "Inventory Management Module", category: "Software", quantity: 1, unitPrice: 9600, discountPct: 0, billingFrequency: "Annual", status: "Proposed" },
      { id: 2, name: "Warehouse Management (WMS)", category: "Software", quantity: 1, unitPrice: 9600, discountPct: 0, billingFrequency: "Annual", status: "Proposed" },
      { id: 3, name: "Manufacturing Resource Planning (MRP)", category: "Software", quantity: 1, unitPrice: 6400, discountPct: 10, billingFrequency: "Annual", status: "Proposed" },
      { id: 4, name: "Module Integration Services", category: "Services", quantity: 20, unitPrice: 175, discountPct: 0, billingFrequency: "One-time", status: "Proposed", description: "Configuration and integration of 3 modules" },
    ],
    stageHistory: [
      { id: 1, fromStage: "Created", toStage: "Discovery", changedBy: "Jordan Davis", changedAt: "2026-03-05", reason: "Expansion interest expressed", notes: "Dana mentioned during QBR that they need inventory and warehouse modules", nextSteps: "Requirements workshop" },
      { id: 2, fromStage: "Discovery", toStage: "Proposal", changedBy: "Sarah Chen", changedAt: "2026-04-05", reason: "Requirements documented", notes: "All 3 module requirements gathered. ROI analysis shows 18-month payback.", nextSteps: "Deliver proposal and schedule IT deep-dive" },
    ],
    activities: [
      { id: 1, type: "Email", subject: "Proposal document delivered", date: "2026-04-09", by: "Sarah Chen", outcome: "Completed" },
      { id: 2, type: "Task", subject: "ROI analysis completed", date: "2026-04-05", by: "Sarah Chen", outcome: "Completed" },
      { id: 3, type: "Meeting", subject: "Requirements workshop", date: "2026-03-28", by: "Sarah Chen", outcome: "Completed", duration: 120 },
      { id: 4, type: "Call", subject: "Initial expansion discussion", date: "2026-03-05", by: "Jordan Davis", outcome: "Positive", duration: 30 },
    ],
    contacts: [
      { id: 1, name: "Dana Reyes", role: "Champion", title: "Operations Director", email: "dana.reyes@apex.com", phone: "(555) 345-6789", isPrimary: true, notes: "Strong internal champion driving the expansion" },
      { id: 2, name: "Kevin Tran", role: "Technical Evaluator", title: "VP of IT", email: "kevin.tran@apex.com", isPrimary: false, notes: "Key gatekeeper — needs technical deep-dive before approval" },
    ],
    notes: [
      { id: 1, title: "QBR follow-up strategy", content: "QBR on Apr 18 is the key milestone. Need to present ROI analysis and get Kevin Tran's buy-in during the technical session. Dana will pre-brief Kevin before the meeting.", category: "Strategy", author: "Sarah Chen", createdAt: "2026-04-06", isPinned: true },
      { id: 2, title: "MRP module discount rationale", content: "Offering 10% on MRP to sweeten the 3-module bundle. This is within our standard bundle discount range and helps justify the total investment to their board.", category: "Internal", author: "Jordan Davis", createdAt: "2026-03-30", isPinned: false },
    ],
  },
  {
    id: 3,
    name: "Email Automation Cross-sell",
    accountId: 3, accountName: "ClearPath Retail",
    type: "Cross-sell", stage: "Discovery", probability: 25,
    forecastCategory: "Pipeline",
    owner: "Priya Nair",
    value: 12000,
    createdAt: "2026-04-01", expectedCloseDate: "2026-06-30",
    nextStep: "Send product comparison sheet and schedule demo",
    description: "Cross-sell of Email Automation module to ClearPath Retail. Currently using Mailchimp but looking for tighter HubSpot integration. Early stage — need to build business case.",
    competitors: ["Mailchimp", "Klaviyo"],
    products: [
      { id: 1, name: "Email Automation Pro", category: "Software", quantity: 1, unitPrice: 9600, discountPct: 0, billingFrequency: "Annual", status: "Proposed" },
      { id: 2, name: "Email Migration Services", category: "Services", quantity: 12, unitPrice: 200, discountPct: 0, billingFrequency: "One-time", status: "Proposed", description: "Migrate existing templates and automations from Mailchimp" },
    ],
    stageHistory: [
      { id: 1, fromStage: "Created", toStage: "Qualification", changedBy: "Jordan Davis", changedAt: "2026-04-01", reason: "Interest noted during check-in", notes: "Priya mentioned frustration with Mailchimp during quarterly check-in", nextSteps: "Send feature overview" },
      { id: 2, fromStage: "Qualification", toStage: "Discovery", changedBy: "Priya Nair", changedAt: "2026-04-03", reason: "Confirmed interest", notes: "Priya confirmed she wants to explore our email automation. Sent initial feature overview.", nextSteps: "Product comparison and demo scheduling" },
    ],
    activities: [
      { id: 1, type: "Email", subject: "Sent initial feature overview", date: "2026-04-03", by: "Priya Nair", outcome: "Completed" },
      { id: 2, type: "Call", subject: "Interest noted during check-in", date: "2026-04-01", by: "Jordan Davis", outcome: "Positive", duration: 20 },
    ],
    contacts: [
      { id: 1, name: "Priya Nair", role: "Champion", title: "Marketing Manager", email: "priya.nair@clearpath.com", phone: "(555) 456-7890", isPrimary: true, notes: "Frustrated with Mailchimp limitations" },
    ],
    notes: [
      { id: 1, title: "Competitive landscape", content: "ClearPath currently pays $4K/yr for Mailchimp Pro. Klaviyo is also being evaluated. Our advantage is native HubSpot integration — they're already on HubSpot CRM. Need to emphasize the unified data story.", category: "Competitive", author: "Priya Nair", createdAt: "2026-04-02", isPinned: true },
    ],
  },
  {
    id: 4,
    name: "At-Risk Renewal Stabilization",
    accountId: 2, accountName: "BlueWave Logistics",
    type: "Renewal", stage: "Qualification", probability: 10,
    forecastCategory: "Pipeline",
    owner: "Marcus Lin",
    value: 8000,
    createdAt: "2026-03-20", expectedCloseDate: "2026-05-31",
    nextStep: "Resolve open critical ticket before renewal discussion",
    description: "Renewal at risk due to unresolved T-1041 (multi-currency issue). Marcus is frustrated. Need to stabilize the account before any commercial conversation.",
    competitors: [],
    products: [
      { id: 1, name: "Salesforce CRM — Standard License Renewal", category: "Software", quantity: 5, unitPrice: 1200, discountPct: 0, billingFrequency: "Annual", status: "Proposed" },
      { id: 2, name: "Priority Support Renewal", category: "Support", quantity: 1, unitPrice: 2000, discountPct: 0, billingFrequency: "Annual", status: "Proposed" },
    ],
    stageHistory: [
      { id: 1, fromStage: "Created", toStage: "Qualification", changedBy: "Jordan Davis", changedAt: "2026-03-20", reason: "Renewal approaching with risk flag", notes: "Account health declining. Critical ticket T-1041 unresolved. Marcus expressing frustration.", nextSteps: "Resolve ticket before commercial discussion" },
    ],
    activities: [
      { id: 1, type: "Email", subject: "Renewal timeline shared", date: "2026-04-07", by: "Jordan Davis", outcome: "Completed" },
      { id: 2, type: "Meeting", subject: "Escalation meeting held", date: "2026-04-04", by: "Sarah Chen", outcome: "Follow-up Needed", duration: 45 },
      { id: 3, type: "Task", subject: "Risk flag raised internally", date: "2026-03-20", by: "Jordan Davis", outcome: "Completed" },
    ],
    contacts: [
      { id: 1, name: "Marcus Lin", role: "Decision Maker", title: "Director of Operations", email: "marcus.lin@bluewave.com", phone: "(555) 567-8901", isPrimary: true, notes: "Frustrated with support response times. Key renewal decision maker." },
    ],
    notes: [
      { id: 1, title: "Stabilization plan", content: "Must resolve T-1041 before any renewal conversation. Engineering has committed to a fix by Apr 18. If we can demonstrate the fix and offer a concession (maybe 1 month free), Marcus may be willing to renew.", category: "Strategy", author: "Jordan Davis", createdAt: "2026-04-04", isPinned: true },
      { id: 2, title: "Escalation outcome", content: "Sarah met with Marcus on Apr 4. He's open to continuing if the multi-currency issue is fixed. He also wants a direct line to engineering for future issues. Consider offering premium support tier.", category: "Client Feedback", author: "Sarah Chen", createdAt: "2026-04-04", isPinned: false },
    ],
  },
  {
    id: 5,
    name: "2-Year Renewal Commitment",
    accountId: 5, accountName: "Edgeline Foods",
    type: "Renewal", stage: "Closed Won", probability: 100,
    forecastCategory: "Commit",
    owner: "Jordan Davis",
    value: 18000,
    createdAt: "2026-01-10", expectedCloseDate: "2026-03-30", closedDate: "2026-03-30",
    nextStep: "Onboard to new contract terms — kick-off Apr 20",
    description: "Successfully renewed for 2 years despite earlier health score concerns. Sofia negotiated a 5% discount in exchange for the longer commitment.",
    competitors: [],
    products: [
      { id: 1, name: "NetSuite ERP — Standard License", category: "Software", quantity: 1, unitPrice: 15000, discountPct: 5, billingFrequency: "Annual", status: "Accepted" },
      { id: 2, name: "Standard Support Plan", category: "Support", quantity: 1, unitPrice: 3750, discountPct: 5, billingFrequency: "Annual", status: "Accepted" },
    ],
    stageHistory: [
      { id: 1, fromStage: "Created", toStage: "Qualification", changedBy: "Jordan Davis", changedAt: "2026-01-10", reason: "Renewal cycle initiated", notes: "Edgeline renewal coming up. Health score concerns need addressing.", nextSteps: "Assess account health and prepare renewal strategy" },
      { id: 2, fromStage: "Qualification", toStage: "Discovery", changedBy: "Jordan Davis", changedAt: "2026-01-25", reason: "Health stabilized", notes: "Account health improving after support interventions", nextSteps: "Propose renewal terms" },
      { id: 3, fromStage: "Discovery", toStage: "Proposal", changedBy: "Jordan Davis", changedAt: "2026-02-15", reason: "Renewal terms prepared", notes: "Prepared 1-year and 2-year options with discount incentive for longer term", nextSteps: "Present options to Sofia" },
      { id: 4, fromStage: "Proposal", toStage: "Negotiation", changedBy: "Jordan Davis", changedAt: "2026-03-10", reason: "Sofia interested in 2-year option", notes: "Sofia prefers the 2-year commitment with 5% discount. Needs board approval.", nextSteps: "Await board decision" },
      { id: 5, fromStage: "Negotiation", toStage: "Closed Won", changedBy: "Jordan Davis", changedAt: "2026-03-30", reason: "Contract signed", notes: "Board approved. 2-year commitment signed with 5% discount. New SLA terms begin Apr 20.", nextSteps: "Onboard to new contract terms" },
    ],
    activities: [
      { id: 1, type: "Meeting", subject: "Contract signing ceremony", date: "2026-03-30", by: "Sofia Ruiz", outcome: "Completed", duration: 30 },
      { id: 2, type: "Call", subject: "Final terms agreed", date: "2026-03-25", by: "Jordan Davis", outcome: "Positive", duration: 20 },
      { id: 3, type: "Email", subject: "Renewal proposal sent", date: "2026-03-10", by: "Jordan Davis", outcome: "Completed" },
      { id: 4, type: "Meeting", subject: "Renewal options presentation", date: "2026-02-15", by: "Jordan Davis", outcome: "Positive", duration: 45 },
      { id: 5, type: "Call", subject: "Renewal discussion initiated", date: "2026-01-10", by: "Jordan Davis", outcome: "Positive", duration: 30 },
    ],
    contacts: [
      { id: 1, name: "Sofia Ruiz", role: "Decision Maker", title: "VP of Operations", email: "sofia.ruiz@edgeline.com", phone: "(555) 678-9012", isPrimary: true, notes: "Negotiated 5% discount for 2-year commitment" },
      { id: 2, name: "James Wong", role: "End User", title: "Finance Manager", email: "james.wong@edgeline.com", isPrimary: false, notes: "Primary system user. Provided feedback on support improvements." },
    ],
    notes: [
      { id: 1, title: "Renewal win analysis", content: "Key factors in winning the 2-year renewal: (1) Resolved critical support issues in Q1, (2) Offered competitive 5% discount for longer commitment, (3) Sofia's trust in our roadmap presentation. The health score improvement from 54 to projected 72 was crucial.", category: "Strategy", author: "Jordan Davis", createdAt: "2026-03-31", isPinned: true },
    ],
  },
  {
    id: 6,
    name: "HubSpot Marketing Hub Upgrade",
    accountId: 3, accountName: "ClearPath Retail",
    type: "Upsell", stage: "Qualification", probability: 10,
    forecastCategory: "Pipeline",
    owner: "Priya Nair",
    value: 15600,
    createdAt: "2026-04-10", expectedCloseDate: "2026-07-31",
    nextStep: "Schedule needs assessment with marketing team",
    description: "ClearPath is outgrowing their current HubSpot Starter plan. Priya wants to evaluate Marketing Hub Professional for advanced automation, A/B testing, and reporting.",
    competitors: ["Marketo", "ActiveCampaign"],
    products: [
      { id: 1, name: "HubSpot Marketing Hub Professional", category: "Software", quantity: 1, unitPrice: 12000, discountPct: 0, billingFrequency: "Annual", status: "Proposed" },
      { id: 2, name: "Marketing Hub Migration & Setup", category: "Services", quantity: 18, unitPrice: 200, discountPct: 0, billingFrequency: "One-time", status: "Proposed", description: "Migrate workflows, templates, and data from Starter to Professional" },
    ],
    stageHistory: [
      { id: 1, fromStage: "Created", toStage: "Qualification", changedBy: "Priya Nair", changedAt: "2026-04-10", reason: "Upgrade interest identified", notes: "Priya mentioned hitting Starter plan limits during email automation discussion. Natural upsell opportunity.", nextSteps: "Schedule needs assessment" },
    ],
    activities: [
      { id: 1, type: "Call", subject: "Upgrade interest identified during cross-sell discussion", date: "2026-04-10", by: "Priya Nair", outcome: "Positive", duration: 15 },
    ],
    contacts: [
      { id: 1, name: "Priya Nair", role: "Champion", title: "Marketing Manager", email: "priya.nair@clearpath.com", phone: "(555) 456-7890", isPrimary: true },
    ],
    notes: [],
  },
  {
    id: 7,
    name: "Salesforce CPQ Implementation",
    accountId: 4, accountName: "Driftwood Capital",
    type: "New Business", stage: "Discovery", probability: 25,
    forecastCategory: "Best Case",
    owner: "Jordan Davis",
    value: 52000,
    createdAt: "2026-03-28", expectedCloseDate: "2026-06-30",
    nextStep: "Complete technical requirements document",
    description: "Driftwood Capital needs CPQ (Configure, Price, Quote) to streamline their complex pricing workflows. This is a net-new implementation on top of their existing Salesforce instance.",
    competitors: ["DealHub", "PandaDoc"],
    products: [
      { id: 1, name: "Salesforce CPQ License", category: "Software", quantity: 10, unitPrice: 1800, discountPct: 0, billingFrequency: "Annual", status: "Proposed" },
      { id: 2, name: "CPQ Implementation Services", category: "Services", quantity: 80, unitPrice: 225, discountPct: 0, billingFrequency: "One-time", status: "Proposed", description: "Full CPQ setup including product catalog, pricing rules, approval workflows, and quote templates" },
      { id: 3, name: "CPQ Admin Training", category: "Training", quantity: 1, unitPrice: 4000, discountPct: 0, billingFrequency: "One-time", status: "Proposed", description: "2-day admin training for Salesforce team" },
      { id: 4, name: "CPQ Premium Support (Year 1)", category: "Support", quantity: 1, unitPrice: 6000, discountPct: 15, billingFrequency: "Annual", status: "Proposed" },
    ],
    stageHistory: [
      { id: 1, fromStage: "Created", toStage: "Qualification", changedBy: "Jordan Davis", changedAt: "2026-03-28", reason: "New opportunity from existing account", notes: "Tom mentioned CPQ needs during analytics discussion. Separate opportunity.", nextSteps: "Qualify budget and timeline" },
      { id: 2, fromStage: "Qualification", toStage: "Discovery", changedBy: "Jordan Davis", changedAt: "2026-04-08", reason: "Budget and timeline confirmed", notes: "Tom confirmed Q3 budget for CPQ. Wants to go live by end of Q3.", nextSteps: "Technical requirements gathering" },
    ],
    activities: [
      { id: 1, type: "Meeting", subject: "CPQ requirements kickoff", date: "2026-04-12", by: "Jordan Davis", outcome: "Completed", duration: 90 },
      { id: 2, type: "Call", subject: "Budget and timeline discussion", date: "2026-04-08", by: "Jordan Davis", outcome: "Positive", duration: 30 },
      { id: 3, type: "Email", subject: "CPQ solution overview sent", date: "2026-03-30", by: "Jordan Davis", outcome: "Completed" },
      { id: 4, type: "Call", subject: "CPQ interest identified", date: "2026-03-28", by: "Jordan Davis", outcome: "Positive", duration: 15 },
    ],
    contacts: [
      { id: 1, name: "Tom Hargrove", role: "Decision Maker", title: "CFO", email: "tom.hargrove@driftwood.com", phone: "(555) 234-5678", isPrimary: true },
      { id: 2, name: "Lisa Park", role: "Technical Evaluator", title: "VP Engineering", email: "lisa.park@driftwood.com", isPrimary: false, notes: "Leading the technical evaluation" },
      { id: 3, name: "Rachel Kim", role: "End User", title: "Sales Operations Manager", email: "rachel.kim@driftwood.com", isPrimary: false, notes: "Primary end user — will manage CPQ day-to-day" },
    ],
    notes: [
      { id: 1, title: "Technical requirements summary", content: "Key requirements: (1) Complex pricing rules with volume tiers, (2) Multi-currency support, (3) Approval workflows for discounts >15%, (4) Integration with existing Salesforce billing. Lisa Park is leading the technical evaluation.", category: "Technical", author: "Jordan Davis", createdAt: "2026-04-12", isPinned: true },
      { id: 2, title: "Competitive positioning vs DealHub", content: "DealHub is also being evaluated. Our advantage: native Salesforce integration (DealHub requires middleware). Disadvantage: higher per-seat cost. Need to emphasize TCO story and reduced integration risk.", category: "Competitive", author: "Jordan Davis", createdAt: "2026-04-10", isPinned: false },
    ],
  },
  {
    id: 8,
    name: "NetSuite Advanced Financials",
    accountId: 1, accountName: "Apex Manufacturing",
    type: "Upsell", stage: "Qualification", probability: 10,
    forecastCategory: "Pipeline",
    owner: "Sarah Chen",
    value: 19200,
    createdAt: "2026-04-12", expectedCloseDate: "2026-08-31",
    nextStep: "Qualify budget with Dana Reyes during QBR",
    description: "Potential upsell of Advanced Financials (multi-subsidiary consolidation, advanced revenue recognition) to Apex Manufacturing. Early stage — identified during module expansion discussions.",
    competitors: [],
    products: [
      { id: 1, name: "NetSuite Advanced Financials", category: "Software", quantity: 1, unitPrice: 14400, discountPct: 0, billingFrequency: "Annual", status: "Proposed" },
      { id: 2, name: "Financials Configuration Services", category: "Services", quantity: 24, unitPrice: 200, discountPct: 0, billingFrequency: "One-time", status: "Proposed" },
    ],
    stageHistory: [
      { id: 1, fromStage: "Created", toStage: "Qualification", changedBy: "Sarah Chen", changedAt: "2026-04-12", reason: "Upsell opportunity identified", notes: "During module expansion requirements workshop, Dana mentioned they're struggling with multi-subsidiary consolidation. Natural fit for Advanced Financials.", nextSteps: "Qualify budget during upcoming QBR" },
    ],
    activities: [
      { id: 1, type: "Task", subject: "Opportunity logged from expansion workshop", date: "2026-04-12", by: "Sarah Chen", outcome: "Completed" },
    ],
    contacts: [
      { id: 1, name: "Dana Reyes", role: "Champion", title: "Operations Director", email: "dana.reyes@apex.com", phone: "(555) 345-6789", isPrimary: true },
    ],
    notes: [],
  },
];
