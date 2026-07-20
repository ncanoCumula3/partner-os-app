/*
 * EngagementHubView — Unified engagement module with 4 sub-sections:
 * Campaigns, Content Library, Content Push, Analytics
 * Replaces the former Outreach module with expanded marketing capabilities
 */
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { OUTREACH, ACCOUNTS, statusColors, healthColor } from "@/lib/data";
import type { OutreachItem } from "@/lib/data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Mail, Calendar, ChevronRight, User, Clock, Send, Eye,
  MousePointerClick, ArrowUpRight, Building2, Globe, CheckCircle2,
  Circle, BarChart3, FileText, Zap, Play, Pause, UserPlus, AlertTriangle,
  Megaphone, Library, Rocket, PieChart, Search, Filter, Tag,
  BookOpen, Video, CalendarDays, Newspaper, Pencil, ExternalLink,
  Users, TrendingUp, MailOpen, MousePointer, Reply, ChevronDown,
  Layers, Star, Download, Share2, Plus, X, Check,
  Trash2,
} from "lucide-react";
import ActivityNotes from "@/components/ActivityNotes";
import { useCollection } from "@/lib/useCollection";
import RecordFormDialog, { type FieldSpec } from "@/components/RecordFormDialog";
import { useAuth } from "@/contexts/AuthContext";

/* ══════════════════════════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════════════════════════ */

type SubSection = "campaigns" | "library" | "push" | "analytics";

interface ContentItem {
  id: string;
  title: string;
  type: "Product Update" | "Co-Marketing" | "Enablement" | "Event Invitation" | "Custom Message" | "Newsletter";
  description: string;
  created: string;
  author: string;
  tags: string[];
  format: "Email" | "PDF" | "Landing Page" | "Video" | "Slide Deck" | "Document";
  status: "Published" | "Draft" | "Archived";
  engagement: { sends: number; opens: number; clicks: number };
  thumbnail?: string;
}

interface PushRecord {
  id: string;
  contentId: string;
  contentTitle: string;
  accounts: string[];
  sentBy: string;
  sentDate: string;
  status: "Delivered" | "Scheduled" | "Draft" | "Failed";
  personalization: string;
  opens: number;
  clicks: number;
}

/* ══════════════════════════════════════════════════════════════
   DEMO DATA: Content Library
   ══════════════════════════════════════════════════════════════ */

const CONTENT_LIBRARY: ContentItem[] = [
  {
    id: "CL-001", title: "Q2 2026 Product Release Notes", type: "Product Update",
    description: "Comprehensive overview of new features including Advanced Analytics 2.0, enhanced API integrations, and performance improvements across all modules.",
    created: "Apr 1, 2026", author: "Product Team", tags: ["product", "release", "Q2"],
    format: "Email", status: "Published", engagement: { sends: 847, opens: 623, clicks: 341 },
  },
  {
    id: "CL-002", title: "Partner Success Playbook: Enterprise Onboarding", type: "Enablement",
    description: "Step-by-step guide for partners onboarding enterprise accounts. Covers discovery frameworks, implementation timelines, success metrics, and escalation paths.",
    created: "Mar 15, 2026", author: "Enablement Team", tags: ["onboarding", "enterprise", "playbook"],
    format: "PDF", status: "Published", engagement: { sends: 312, opens: 287, clicks: 198 },
  },
  {
    id: "CL-003", title: "Co-Sell Motion: Financial Services Vertical", type: "Co-Marketing",
    description: "Joint value proposition, battle cards, and customer stories for the financial services vertical. Includes ROI calculator and compliance documentation.",
    created: "Mar 28, 2026", author: "Marketing Team", tags: ["co-sell", "financial-services", "vertical"],
    format: "Slide Deck", status: "Published", engagement: { sends: 156, opens: 134, clicks: 89 },
  },
  {
    id: "CL-004", title: "Annual Partner Summit 2026: Save the Date", type: "Event Invitation",
    description: "Invitation to the annual Partner Summit in Austin, TX. Keynotes, breakout sessions, certification workshops, and networking events. Early bird registration available.",
    created: "Apr 5, 2026", author: "Events Team", tags: ["summit", "event", "2026"],
    format: "Email", status: "Published", engagement: { sends: 1240, opens: 891, clicks: 567 },
  },
  {
    id: "CL-005", title: "Advanced Analytics Certification Program", type: "Enablement",
    description: "Self-paced certification covering advanced reporting, custom dashboards, predictive analytics, and data visualization. Includes hands-on labs and final assessment.",
    created: "Feb 20, 2026", author: "Enablement Team", tags: ["certification", "analytics", "training"],
    format: "Landing Page", status: "Published", engagement: { sends: 523, opens: 412, clicks: 289 },
  },
  {
    id: "CL-006", title: "Monthly Partner Newsletter: April 2026", type: "Newsletter",
    description: "Monthly digest covering product updates, partner wins, upcoming events, new resources, and market insights. Personalized by partner tier and vertical focus.",
    created: "Apr 1, 2026", author: "Partner Marketing", tags: ["newsletter", "monthly", "april"],
    format: "Email", status: "Published", engagement: { sends: 2100, opens: 1470, clicks: 630 },
  },
  {
    id: "CL-007", title: "Customer Retention Strategies: Video Series", type: "Enablement",
    description: "Five-part video series covering proactive health monitoring, QBR best practices, escalation management, renewal preparation, and expansion selling.",
    created: "Mar 10, 2026", author: "Enablement Team", tags: ["video", "retention", "training"],
    format: "Video", status: "Published", engagement: { sends: 445, opens: 378, clicks: 312 },
  },
  {
    id: "CL-008", title: "Healthcare Vertical: Joint Case Study", type: "Co-Marketing",
    description: "Co-branded case study featuring Cedar Valley Health System. Highlights 40% reduction in churn, 3x faster onboarding, and $2.4M in protected revenue.",
    created: "Apr 8, 2026", author: "Marketing Team", tags: ["case-study", "healthcare", "co-brand"],
    format: "PDF", status: "Published", engagement: { sends: 89, opens: 76, clicks: 54 },
  },
  {
    id: "CL-009", title: "Q3 Product Roadmap Preview", type: "Product Update",
    description: "Early preview of Q3 features for strategic partners. Includes AI-powered recommendations engine, enhanced mobile experience, and new integration marketplace.",
    created: "Apr 10, 2026", author: "Product Team", tags: ["roadmap", "Q3", "preview"],
    format: "Slide Deck", status: "Draft", engagement: { sends: 0, opens: 0, clicks: 0 },
  },
  {
    id: "CL-010", title: "Partner Incentive Program: H2 2026", type: "Custom Message",
    description: "Details on the updated partner incentive structure for H2 2026. New accelerators for multi-year deals, vertical specialization bonuses, and co-sell SPIFs.",
    created: "Apr 12, 2026", author: "Channel Team", tags: ["incentives", "H2", "compensation"],
    format: "Document", status: "Draft", engagement: { sends: 0, opens: 0, clicks: 0 },
  },
];

/* ══════════════════════════════════════════════════════════════
   DEMO DATA: Push Records
   ══════════════════════════════════════════════════════════════ */

const PUSH_RECORDS: PushRecord[] = [
  {
    id: "PH-001", contentId: "CL-004", contentTitle: "Annual Partner Summit 2026: Save the Date",
    accounts: ["Driftwood Capital", "Apex Manufacturing", "ClearPath Retail", "BlueWave Logistics", "Edgeline Foods"],
    sentBy: "Jordan Davis", sentDate: "Apr 5, 2026", status: "Delivered",
    personalization: "Personalized greeting, partner tier benefits highlighted", opens: 4, clicks: 3,
  },
  {
    id: "PH-002", contentId: "CL-006", contentTitle: "Monthly Partner Newsletter: April 2026",
    accounts: ["Driftwood Capital", "Apex Manufacturing", "ClearPath Retail", "BlueWave Logistics", "Edgeline Foods"],
    sentBy: "Partner Marketing", sentDate: "Apr 1, 2026", status: "Delivered",
    personalization: "Vertical-specific content blocks, partner tier callouts", opens: 4, clicks: 2,
  },
  {
    id: "PH-003", contentId: "CL-001", contentTitle: "Q2 2026 Product Release Notes",
    accounts: ["Driftwood Capital", "Apex Manufacturing"],
    sentBy: "Sarah Chen", sentDate: "Apr 2, 2026", status: "Delivered",
    personalization: "Feature highlights relevant to each account's active modules", opens: 2, clicks: 1,
  },
  {
    id: "PH-004", contentId: "CL-003", contentTitle: "Co-Sell Motion: Financial Services Vertical",
    accounts: ["Driftwood Capital"],
    sentBy: "Jordan Davis", sentDate: "Apr 8, 2026", status: "Delivered",
    personalization: "Custom ROI projections based on Driftwood's portfolio", opens: 1, clicks: 1,
  },
  {
    id: "PH-005", contentId: "CL-005", contentTitle: "Advanced Analytics Certification Program",
    accounts: ["Apex Manufacturing", "ClearPath Retail"],
    sentBy: "Sarah Chen", sentDate: "Apr 10, 2026", status: "Delivered",
    personalization: "Certification benefits tied to each account's usage patterns", opens: 2, clicks: 2,
  },
  {
    id: "PH-006", contentId: "CL-009", contentTitle: "Q3 Product Roadmap Preview",
    accounts: ["Driftwood Capital", "Apex Manufacturing", "ClearPath Retail"],
    sentBy: "Jordan Davis", sentDate: "Apr 18, 2026", status: "Scheduled",
    personalization: "Feature previews aligned with each account's requested enhancements", opens: 0, clicks: 0,
  },
];

/* ══════════════════════════════════════════════════════════════
   EXTENDED OUTREACH DATA (from original OutreachView)
   ══════════════════════════════════════════════════════════════ */

interface OutreachDetail extends OutreachItem {
  subject: string;
  owner: string;
  created: string;
  goal: string;
  template: string;
  emailSteps: { step: number; subject: string; status: "Sent" | "Opened" | "Clicked" | "Scheduled" | "Draft"; sentDate?: string; openRate?: string; clickRate?: string }[];
  metrics: { sent: number; opened: number; clicked: number; replied: number };
  notes: string;
}

const OUTREACH_DETAILS: Record<string, OutreachDetail> = {
  "Driftwood Capital": {
    ...OUTREACH.find(o => o.account === "Driftwood Capital")!,
    subject: "Advanced Analytics — ROI & Next Steps",
    owner: "Jordan Davis", created: "Mar 25, 2026",
    goal: "Drive upsell conversion for Advanced Analytics module ($36K deal)",
    template: "Upsell Nurture — 5 Step",
    emailSteps: [
      { step: 1, subject: "Unlock deeper insights with Advanced Analytics", status: "Opened", sentDate: "Mar 26", openRate: "100%", clickRate: "50%" },
      { step: 2, subject: "How Driftwood can save 15hrs/week with custom reports", status: "Clicked", sentDate: "Mar 30", openRate: "100%", clickRate: "100%" },
      { step: 3, subject: "Your personalized ROI analysis is ready", status: "Opened", sentDate: "Apr 4", openRate: "100%", clickRate: "0%" },
      { step: 4, subject: "Quick question about your reporting needs", status: "Scheduled", sentDate: "Apr 12" },
      { step: 5, subject: "Final thoughts + exclusive pricing", status: "Draft" },
    ],
    metrics: { sent: 3, opened: 3, clicked: 2, replied: 1 },
    notes: "Tom Hargrove has been highly engaged — opened all 3 emails. The ROI analysis (Step 3) was opened but not clicked through. Consider a follow-up call before Step 4 sends.",
  },
  "Edgeline Foods": {
    ...OUTREACH.find(o => o.account === "Edgeline Foods")!,
    subject: "Let's Get Back on Track",
    owner: "Sarah Chen", created: "Apr 2, 2026",
    goal: "Re-engage at-risk account and prevent churn before renewal",
    template: "Re-engagement — 4 Step",
    emailSteps: [
      { step: 1, subject: "We noticed some changes — let's chat", status: "Opened", sentDate: "Apr 3", openRate: "100%", clickRate: "0%" },
      { step: 2, subject: "Your 30-day recovery plan from our team", status: "Opened", sentDate: "Apr 8", openRate: "100%", clickRate: "50%" },
      { step: 3, subject: "Quick wins to improve your experience", status: "Scheduled", sentDate: "Apr 11" },
      { step: 4, subject: "Executive check-in request", status: "Draft" },
    ],
    metrics: { sent: 2, opened: 2, clicked: 1, replied: 0 },
    notes: "Sofia opened both emails but hasn't replied. The recovery plan link was clicked once. Need to follow up with a phone call — email alone may not be enough for this at-risk account.",
  },
  "ClearPath Retail": {
    ...OUTREACH.find(o => o.account === "ClearPath Retail")!,
    subject: "Q2 Business Review Invitation",
    owner: "Jordan Davis", created: "Apr 8, 2026",
    goal: "Schedule and prepare for Q2 QBR with Priya Nair",
    template: "QBR Invite — 3 Step",
    emailSteps: [
      { step: 1, subject: "Your Q2 Business Review — let's schedule", status: "Scheduled", sentDate: "Apr 16" },
      { step: 2, subject: "QBR agenda preview + preparation items", status: "Draft" },
      { step: 3, subject: "Reminder: QBR this week", status: "Draft" },
    ],
    metrics: { sent: 0, opened: 0, clicked: 0, replied: 0 },
    notes: "Sequence scheduled to start Apr 16. Priya expressed interest in discussing email automation add-on during the QBR. Prepare demo materials in advance.",
  },
  "BlueWave Logistics": {
    ...OUTREACH.find(o => o.account === "BlueWave Logistics")!,
    subject: "Health Check Follow-up",
    owner: "Sarah Chen", created: "Apr 9, 2026",
    goal: "Address open issues and stabilize account health before renewal discussion",
    template: "Health Check — Custom",
    emailSteps: [
      { step: 1, subject: "Following up on your recent support experience", status: "Draft" },
      { step: 2, subject: "Action plan for resolving open items", status: "Draft" },
      { step: 3, subject: "Progress update on your account", status: "Draft" },
    ],
    metrics: { sent: 0, opened: 0, clicked: 0, replied: 0 },
    notes: "Draft sequence — waiting for T-1041 (multi-currency issue) to be resolved before sending. Marcus is frustrated; sending outreach before fixing the issue could backfire.",
  },
};

/* ══════════════════════════════════════════════════════════════
   CONTENT TYPE CONFIG
   ══════════════════════════════════════════════════════════════ */

const contentTypeConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  "Product Update": { icon: Rocket, color: "text-blue-700", bg: "bg-blue-50" },
  "Co-Marketing": { icon: Share2, color: "text-purple-700", bg: "bg-purple-50" },
  "Enablement": { icon: BookOpen, color: "text-emerald-700", bg: "bg-emerald-50" },
  "Event Invitation": { icon: CalendarDays, color: "text-amber-700", bg: "bg-amber-50" },
  "Custom Message": { icon: Pencil, color: "text-slate-700", bg: "bg-slate-50" },
  "Newsletter": { icon: Newspaper, color: "text-teal-700", bg: "bg-teal-50" },
};

const formatConfig: Record<string, { icon: React.ElementType; label: string }> = {
  "Email": { icon: Mail, label: "Email" },
  "PDF": { icon: FileText, label: "PDF" },
  "Landing Page": { icon: ExternalLink, label: "Landing Page" },
  "Video": { icon: Video, label: "Video" },
  "Slide Deck": { icon: Layers, label: "Slide Deck" },
  "Document": { icon: FileText, label: "Document" },
};

/* ══════════════════════════════════════════════════════════════
   CAMPAIGNS (editable) — CRUD wiring
   ══════════════════════════════════════════════════════════════ */

type OutreachCampaign = OutreachItem;

const CAMPAIGN_FIELDS: FieldSpec[] = [
  { key: "account", label: "Account", required: true },
  { key: "type", label: "Type", type: "select", options: ["Upsell Sequence", "Re-engagement", "QBR Invite", "Health Check Follow-up"] },
  { key: "status", label: "Status", type: "select", options: ["Active", "Scheduled", "Draft"] },
  { key: "step", label: "Step", placeholder: "Step 1 of 5" },
  { key: "opens", label: "Opens", placeholder: "0/0" },
  { key: "nextDate", label: "Next date", placeholder: "Apr 12" },
];

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════ */

export default function EngagementHubView() {
  const [activeTab, setActiveTab] = useState<SubSection>("campaigns");
  const [selectedSequence, setSelectedSequence] = useState<string | null>(null);
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [selectedPush, setSelectedPush] = useState<PushRecord | null>(null);
  const [drillDownKpi, setDrillDownKpi] = useState<string | null>(null);
  const [contentFilter, setContentFilter] = useState<string>("all");
  const [contentSearch, setContentSearch] = useState("");
  const [pushMode, setPushMode] = useState(false);
  const [pushSelectedContent, setPushSelectedContent] = useState<ContentItem[]>([]);
  const [pushSelectedAccounts, setPushSelectedAccounts] = useState<string[]>([]);

  /* Campaigns — editable collection (CRUD) */
  const { can } = useAuth();
  const canEdit = can("edit");
  const canDelete = can("delete");
  const { items: campaigns, upsert, remove } = useCollection<OutreachCampaign>("campaigns", OUTREACH as OutreachCampaign[], (c) => c.account);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<OutreachCampaign | null>(null);

  const selectedDetail = selectedSequence ? OUTREACH_DETAILS[selectedSequence] : null;
  const toggleDrill = (key: string) => setDrillDownKpi(prev => prev === key ? null : key);

  const activeSeqs = campaigns.filter(o => o.status === "Active");
  const scheduledSeqs = campaigns.filter(o => o.status === "Scheduled");
  const draftSeqs = campaigns.filter(o => o.status === "Draft");

  /* Content library filtering */
  const filteredContent = useMemo(() => {
    let items = CONTENT_LIBRARY;
    if (contentFilter !== "all") {
      items = items.filter(c => c.type === contentFilter);
    }
    if (contentSearch.trim()) {
      const q = contentSearch.toLowerCase();
      items = items.filter(c =>
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    return items;
  }, [contentFilter, contentSearch]);

  /* Analytics aggregations */
  const analyticsData = useMemo(() => {
    const totalSends = CONTENT_LIBRARY.reduce((s, c) => s + c.engagement.sends, 0);
    const totalOpens = CONTENT_LIBRARY.reduce((s, c) => s + c.engagement.opens, 0);
    const totalClicks = CONTENT_LIBRARY.reduce((s, c) => s + c.engagement.clicks, 0);
    const openRate = totalSends > 0 ? Math.round((totalOpens / totalSends) * 100) : 0;
    const clickRate = totalOpens > 0 ? Math.round((totalClicks / totalOpens) * 100) : 0;
    const pushDelivered = PUSH_RECORDS.filter(p => p.status === "Delivered").length;
    const pushScheduled = PUSH_RECORDS.filter(p => p.status === "Scheduled").length;

    const byType = Object.entries(
      CONTENT_LIBRARY.reduce<Record<string, { sends: number; opens: number; clicks: number }>>((acc, c) => {
        if (!acc[c.type]) acc[c.type] = { sends: 0, opens: 0, clicks: 0 };
        acc[c.type].sends += c.engagement.sends;
        acc[c.type].opens += c.engagement.opens;
        acc[c.type].clicks += c.engagement.clicks;
        return acc;
      }, {})
    ).sort((a, b) => b[1].sends - a[1].sends);

    const topContent = [...CONTENT_LIBRARY]
      .filter(c => c.engagement.sends > 0)
      .sort((a, b) => b.engagement.clicks - a.engagement.clicks)
      .slice(0, 5);

    return { totalSends, totalOpens, totalClicks, openRate, clickRate, pushDelivered, pushScheduled, byType, topContent };
  }, []);

  /* ══════════════════════════════════════════════════════════════
     SUB-SECTION TABS
     ══════════════════════════════════════════════════════════════ */

  const tabs: { id: SubSection; label: string; icon: React.ElementType }[] = [
    { id: "campaigns", label: "Campaigns", icon: Megaphone },
    { id: "library", label: "Content Library", icon: Library },
    { id: "push", label: "Content Push", icon: Rocket },
    { id: "analytics", label: "Analytics", icon: PieChart },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-xl font-bold text-foreground">Engagement Hub</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Campaigns, content library, content delivery, and engagement analytics in one place
        </p>
      </motion.div>

      {/* Sub-section tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/50 border border-border w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all",
              activeTab === tab.id
                ? "bg-background text-foreground shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            )}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════
         TAB: CAMPAIGNS (existing outreach functionality)
         ══════════════════════════════════════════════════════════ */}
      <AnimatePresence mode="wait">
        {activeTab === "campaigns" && (
          <motion.div key="campaigns" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-6">
            {/* KPI cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { label: "Active Sequences", value: String(activeSeqs.length), color: "text-emerald-700", key: "active" },
                { label: "Scheduled", value: String(scheduledSeqs.length), color: "text-blue-700", key: "scheduled" },
                { label: "Drafts", value: String(draftSeqs.length), color: "text-slate-600", key: "drafts" },
              ].map((k, i) => {
                const isActive = drillDownKpi === k.key;
                return (
                  <motion.button
                    key={k.label}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => toggleDrill(k.key)}
                    className={cn(
                      "card-elevated rounded-xl border bg-card p-4 text-left transition-all cursor-pointer hover:shadow-md hover:border-primary/40",
                      isActive ? "border-primary ring-2 ring-primary/20 shadow-md" : "border-border",
                    )}
                  >
                    <div className="text-[10px] tracking-[0.1em] text-muted-foreground font-medium uppercase mb-1">{k.label}</div>
                    <div className={cn("text-xl font-bold font-mono", k.color)}>{k.value}</div>
                    <p className="text-[8px] text-primary/60 font-medium uppercase tracking-wider mt-1">Click to drill down</p>
                  </motion.button>
                );
              })}
            </div>

            {/* Drill-down panel */}
            <AnimatePresence mode="wait">
              {drillDownKpi && (
                <motion.div key={drillDownKpi} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                  <div className="rounded-xl border border-primary/20 bg-card p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        {drillDownKpi === "active" && <><Play className="w-4 h-4 text-emerald-600" /> Active Sequences</>}
                        {drillDownKpi === "scheduled" && <><Calendar className="w-4 h-4 text-blue-600" /> Scheduled Sequences</>}
                        {drillDownKpi === "drafts" && <><FileText className="w-4 h-4 text-slate-600" /> Draft Sequences</>}
                      </h3>
                      <button onClick={() => setDrillDownKpi(null)} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-muted transition-colors">Close</button>
                    </div>
                    {(() => {
                      const items = drillDownKpi === "active" ? activeSeqs : drillDownKpi === "scheduled" ? scheduledSeqs : draftSeqs;
                      return items.length > 0 ? (
                        <div className="rounded-lg border border-border overflow-hidden">
                          <table className="w-full text-xs">
                            <thead><tr className="bg-muted/50">
                              <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Account</th>
                              <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                              <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Step</th>
                              <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">{drillDownKpi === "drafts" ? "Status" : "Next Date"}</th>
                            </tr></thead>
                            <tbody className="divide-y divide-border">
                              {items.map(o => (
                                <tr key={o.account} className="hover:bg-muted/30 cursor-pointer" onClick={() => setSelectedSequence(o.account)}>
                                  <td className="px-3 py-2 font-medium text-foreground">{o.account}</td>
                                  <td className="px-3 py-2 text-muted-foreground">{o.type}</td>
                                  <td className="px-3 py-2 font-mono text-foreground">{o.step}</td>
                                  <td className="px-3 py-2 text-muted-foreground">{drillDownKpi === "drafts" ? <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-slate-100 text-slate-700">Draft</span> : o.nextDate}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : <p className="text-xs text-muted-foreground">No sequences in this category.</p>;
                    })()}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Add Campaign */}
            {canEdit && (
              <div className="flex justify-end">
                <button onClick={() => { setEditing(null); setFormOpen(true); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90">
                  <Plus className="w-3.5 h-3.5" /> Add Campaign
                </button>
              </div>
            )}

            {/* Sequence cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {campaigns.map((o, i) => (
                <motion.div
                  key={o.account}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.06 }}
                  onClick={() => setSelectedSequence(o.account)}
                  className="card-elevated rounded-xl border border-border bg-card p-5 hover:border-primary/30 transition-colors cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="text-[14px] font-semibold text-foreground">{o.account}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Mail className="w-3 h-3" /> {o.type}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn("text-[10px] px-2 py-0.5 rounded-md font-medium", statusColors[o.status])}>
                        {o.status}
                      </span>
                      {canEdit && <button onClick={(e) => { e.stopPropagation(); setEditing(o); setFormOpen(true); }} title="Edit" className="p-1 rounded hover:bg-primary/10"><Pencil className="w-3.5 h-3.5 text-primary" /></button>}
                      {canDelete && <button onClick={(e) => { e.stopPropagation(); if (confirm("Delete campaign?")) remove(o.account); }} title="Delete" className="p-1 rounded hover:bg-red-500/10"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>}
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{o.step}</span>
                    <span className="text-muted-foreground font-mono">Opens: {o.opens}</span>
                  </div>
                  {o.nextDate !== "—" && (
                    <div className="mt-3 pt-3 border-t border-border flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Calendar className="w-3 h-3" /> Next: {o.nextDate}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════════════════
           TAB: CONTENT LIBRARY
           ══════════════════════════════════════════════════════════ */}
        {activeTab === "library" && (
          <motion.div key="library" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-6">
            {/* Library KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Total Content", value: String(CONTENT_LIBRARY.length), color: "text-foreground" },
                { label: "Published", value: String(CONTENT_LIBRARY.filter(c => c.status === "Published").length), color: "text-emerald-700" },
                { label: "Drafts", value: String(CONTENT_LIBRARY.filter(c => c.status === "Draft").length), color: "text-amber-700" },
                { label: "Total Sends", value: CONTENT_LIBRARY.reduce((s, c) => s + c.engagement.sends, 0).toLocaleString(), color: "text-blue-700" },
              ].map((k, i) => (
                <motion.div
                  key={k.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-xl border border-border bg-card p-4"
                >
                  <div className="text-[10px] tracking-[0.1em] text-muted-foreground font-medium uppercase mb-1">{k.label}</div>
                  <div className={cn("text-xl font-bold font-mono", k.color)}>{k.value}</div>
                </motion.div>
              ))}
            </div>

            {/* Search + Filter */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search content by title, description, or tag..."
                  value={contentSearch}
                  onChange={(e) => setContentSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
                />
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                {["all", "Product Update", "Co-Marketing", "Enablement", "Event Invitation", "Custom Message", "Newsletter"].map(f => (
                  <button
                    key={f}
                    onClick={() => setContentFilter(f)}
                    className={cn(
                      "text-[10px] px-2.5 py-1.5 rounded-lg font-medium transition-all",
                      contentFilter === f
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent"
                    )}
                  >
                    {f === "all" ? "All Types" : f}
                  </button>
                ))}
              </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredContent.map((item, i) => {
                const typeConf = contentTypeConfig[item.type] || contentTypeConfig["Custom Message"];
                const fmtConf = formatConfig[item.format] || formatConfig["Document"];
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => setSelectedContent(item)}
                    className="card-elevated rounded-xl border border-border bg-card p-5 hover:border-primary/30 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", typeConf.bg)}>
                        <typeConf.icon className={cn("w-5 h-5", typeConf.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-[13px] font-semibold text-foreground leading-tight">{item.title}</h4>
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                        <div className="flex items-center gap-3 mt-3">
                          <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-medium", typeConf.bg, typeConf.color)}>{item.type}</span>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <fmtConf.icon className="w-3 h-3" /> {item.format}
                          </span>
                          <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-medium",
                            item.status === "Published" ? "bg-emerald-50 text-emerald-700" :
                            item.status === "Draft" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"
                          )}>{item.status}</span>
                        </div>
                        {item.engagement.sends > 0 && (
                          <div className="flex items-center gap-4 mt-2 pt-2 border-t border-border">
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Send className="w-3 h-3" /> {item.engagement.sends.toLocaleString()}</span>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Eye className="w-3 h-3" /> {item.engagement.opens.toLocaleString()}</span>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1"><MousePointerClick className="w-3 h-3" /> {item.engagement.clicks.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
            {filteredContent.length === 0 && (
              <div className="text-center py-12">
                <Library className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No content matches your filters</p>
              </div>
            )}
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════════════════
           TAB: CONTENT PUSH
           ══════════════════════════════════════════════════════════ */}
        {activeTab === "push" && (
          <motion.div key="push" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-6">
            {/* Push KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Total Pushes", value: String(PUSH_RECORDS.length), color: "text-foreground" },
                { label: "Delivered", value: String(PUSH_RECORDS.filter(p => p.status === "Delivered").length), color: "text-emerald-700" },
                { label: "Scheduled", value: String(PUSH_RECORDS.filter(p => p.status === "Scheduled").length), color: "text-blue-700" },
                { label: "Accounts Reached", value: String(new Set(PUSH_RECORDS.flatMap(p => p.accounts)).size), color: "text-purple-700" },
              ].map((k, i) => (
                <motion.div
                  key={k.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-xl border border-border bg-card p-4"
                >
                  <div className="text-[10px] tracking-[0.1em] text-muted-foreground font-medium uppercase mb-1">{k.label}</div>
                  <div className={cn("text-xl font-bold font-mono", k.color)}>{k.value}</div>
                </motion.div>
              ))}
            </div>

            {/* New Push Button */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Recent Content Pushes</h3>
              <button
                onClick={() => {
                  setPushMode(true);
                  setPushSelectedContent([]);
                  setPushSelectedAccounts([]);
                }}
                className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-3 h-3" /> New Content Push
              </button>
            </div>

            {/* Push Records Table */}
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wider">Content</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wider">Accounts</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wider">Sent By</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wider">Engagement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {PUSH_RECORDS.map((push) => (
                    <tr
                      key={push.id}
                      className="hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => setSelectedPush(push)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{push.contentTitle}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-muted-foreground" />
                          <span className="text-muted-foreground">{push.accounts.length} account{push.accounts.length !== 1 ? "s" : ""}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{push.sentBy}</td>
                      <td className="px-4 py-3 text-muted-foreground font-mono">{push.sentDate}</td>
                      <td className="px-4 py-3">
                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium",
                          push.status === "Delivered" ? "bg-emerald-50 text-emerald-700" :
                          push.status === "Scheduled" ? "bg-blue-50 text-blue-700" :
                          push.status === "Draft" ? "bg-slate-100 text-slate-600" : "bg-red-50 text-red-700"
                        )}>{push.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        {push.status === "Delivered" ? (
                          <div className="flex items-center gap-3">
                            <span className="text-muted-foreground flex items-center gap-1"><Eye className="w-3 h-3" /> {push.opens}</span>
                            <span className="text-muted-foreground flex items-center gap-1"><MousePointerClick className="w-3 h-3" /> {push.clicks}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Pending</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* New Push Wizard Modal */}
            <Sheet open={pushMode} onOpenChange={(open) => !open && setPushMode(false)}>
              <SheetContent side="right" className="!w-[540px] !max-w-[90vw] bg-background border-l border-border p-0 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="p-6 space-y-6">
                    <SheetHeader className="p-0 space-y-2">
                      <SheetTitle className="text-lg font-bold text-foreground">New Content Push</SheetTitle>
                      <SheetDescription className="text-xs text-muted-foreground">
                        Select content from the library, choose accounts, and send or schedule delivery
                      </SheetDescription>
                    </SheetHeader>

                    <Separator />

                    {/* Step 1: Select Content */}
                    <section>
                      <h3 className="text-[11px] tracking-[0.1em] uppercase text-muted-foreground font-medium mb-3">Step 1: Select Content</h3>
                      <div className="space-y-2 max-h-[200px] overflow-y-auto">
                        {CONTENT_LIBRARY.filter(c => c.status === "Published").map(c => {
                          const isSelected = pushSelectedContent.some(s => s.id === c.id);
                          const typeConf = contentTypeConfig[c.type] || contentTypeConfig["Custom Message"];
                          return (
                            <button
                              key={c.id}
                              onClick={() => {
                                if (isSelected) {
                                  setPushSelectedContent(prev => prev.filter(s => s.id !== c.id));
                                } else {
                                  setPushSelectedContent(prev => [...prev, c]);
                                }
                              }}
                              className={cn(
                                "w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all",
                                isSelected ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border hover:border-primary/30 hover:bg-muted/30"
                              )}
                            >
                              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", typeConf.bg)}>
                                <typeConf.icon className={cn("w-4 h-4", typeConf.color)} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-foreground truncate">{c.title}</p>
                                <p className="text-[10px] text-muted-foreground">{c.type} · {c.format}</p>
                              </div>
                              {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                      {pushSelectedContent.length > 0 && (
                        <p className="text-[10px] text-primary font-medium mt-2">{pushSelectedContent.length} content item{pushSelectedContent.length !== 1 ? "s" : ""} selected</p>
                      )}
                    </section>

                    <Separator />

                    {/* Step 2: Select Accounts */}
                    <section>
                      <h3 className="text-[11px] tracking-[0.1em] uppercase text-muted-foreground font-medium mb-3">Step 2: Select Accounts</h3>
                      <div className="space-y-2">
                        {ACCOUNTS.map(a => {
                          const isSelected = pushSelectedAccounts.includes(a.name);
                          return (
                            <button
                              key={a.name}
                              onClick={() => {
                                if (isSelected) {
                                  setPushSelectedAccounts(prev => prev.filter(n => n !== a.name));
                                } else {
                                  setPushSelectedAccounts(prev => [...prev, a.name]);
                                }
                              }}
                              className={cn(
                                "w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all",
                                isSelected ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border hover:border-primary/30 hover:bg-muted/30"
                              )}
                            >
                              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                <Building2 className="w-4 h-4 text-muted-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-foreground">{a.name}</p>
                                <p className="text-[10px] text-muted-foreground">{a.platform} · Health: {a.health}</p>
                              </div>
                              {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                      {pushSelectedAccounts.length > 0 && (
                        <p className="text-[10px] text-primary font-medium mt-2">{pushSelectedAccounts.length} account{pushSelectedAccounts.length !== 1 ? "s" : ""} selected</p>
                      )}
                    </section>

                    <Separator />

                    {/* Step 3: Actions */}
                    <section>
                      <h3 className="text-[11px] tracking-[0.1em] uppercase text-muted-foreground font-medium mb-3">Step 3: Send or Schedule</h3>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            if (pushSelectedContent.length === 0 || pushSelectedAccounts.length === 0) {
                              toast.error("Please select at least one content item and one account");
                              return;
                            }
                            toast.success("Content delivered successfully", {
                              description: `${pushSelectedContent.length} item${pushSelectedContent.length !== 1 ? "s" : ""} sent to ${pushSelectedAccounts.length} account${pushSelectedAccounts.length !== 1 ? "s" : ""}`,
                            });
                            setPushMode(false);
                          }}
                          className="inline-flex items-center gap-1.5 text-[11px] font-medium px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                        >
                          <Send className="w-3 h-3" /> Send Now
                        </button>
                        <button
                          onClick={() => {
                            if (pushSelectedContent.length === 0 || pushSelectedAccounts.length === 0) {
                              toast.error("Please select at least one content item and one account");
                              return;
                            }
                            toast.success("Content push scheduled", {
                              description: `${pushSelectedContent.length} item${pushSelectedContent.length !== 1 ? "s" : ""} scheduled for ${pushSelectedAccounts.length} account${pushSelectedAccounts.length !== 1 ? "s" : ""}`,
                            });
                            setPushMode(false);
                          }}
                          className="inline-flex items-center gap-1.5 text-[11px] font-medium px-4 py-2.5 rounded-lg border border-border bg-card hover:bg-muted/50 text-foreground transition-colors"
                        >
                          <Calendar className="w-3 h-3" /> Schedule
                        </button>
                      </div>
                    </section>
                  </div>
                </ScrollArea>
              </SheetContent>
            </Sheet>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════════════════
           TAB: ANALYTICS
           ══════════════════════════════════════════════════════════ */}
        {activeTab === "analytics" && (
          <motion.div key="analytics" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-6">
            {/* Top-level KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              {[
                { label: "Total Sends", value: analyticsData.totalSends.toLocaleString(), color: "text-foreground", icon: Send },
                { label: "Total Opens", value: analyticsData.totalOpens.toLocaleString(), color: "text-blue-700", icon: MailOpen },
                { label: "Total Clicks", value: analyticsData.totalClicks.toLocaleString(), color: "text-emerald-700", icon: MousePointerClick },
                { label: "Open Rate", value: `${analyticsData.openRate}%`, color: "text-amber-700", icon: Eye },
                { label: "Click Rate", value: `${analyticsData.clickRate}%`, color: "text-purple-700", icon: TrendingUp },
              ].map((k, i) => (
                <motion.div
                  key={k.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-xl border border-border bg-card p-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <k.icon className="w-3.5 h-3.5 text-muted-foreground" />
                    <div className="text-[10px] tracking-[0.1em] text-muted-foreground font-medium uppercase">{k.label}</div>
                  </div>
                  <div className={cn("text-xl font-bold font-mono", k.color)}>{k.value}</div>
                </motion.div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Performance by Content Type */}
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">Performance by Content Type</h3>
                <div className="space-y-3">
                  {analyticsData.byType.map(([type, data]) => {
                    const typeConf = contentTypeConfig[type] || contentTypeConfig["Custom Message"];
                    const openRate = data.sends > 0 ? Math.round((data.opens / data.sends) * 100) : 0;
                    return (
                      <div key={type} className="flex items-center gap-3">
                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", typeConf.bg)}>
                          <typeConf.icon className={cn("w-4 h-4", typeConf.color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-foreground">{type}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">{data.sends.toLocaleString()} sends</span>
                          </div>
                          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn("h-full rounded-full transition-all", typeConf.bg.replace("50", "400"))}
                              style={{ width: `${openRate}%`, backgroundColor: typeConf.color.includes("blue") ? "#3b82f6" : typeConf.color.includes("purple") ? "#8b5cf6" : typeConf.color.includes("emerald") ? "#10b981" : typeConf.color.includes("amber") ? "#f59e0b" : typeConf.color.includes("teal") ? "#14b8a6" : "#64748b" }}
                            />
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-[10px] text-muted-foreground">Open rate: {openRate}%</span>
                            <span className="text-[10px] text-muted-foreground">{data.clicks.toLocaleString()} clicks</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top Performing Content */}
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">Top Performing Content</h3>
                <div className="space-y-3">
                  {analyticsData.topContent.map((item, i) => {
                    const typeConf = contentTypeConfig[item.type] || contentTypeConfig["Custom Message"];
                    return (
                      <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => { setActiveTab("library"); setSelectedContent(item); }}>
                        <div className="text-xs font-bold text-muted-foreground w-5 text-center pt-0.5">#{i + 1}</div>
                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", typeConf.bg)}>
                          <typeConf.icon className={cn("w-4 h-4", typeConf.color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{item.title}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] text-muted-foreground">{item.engagement.clicks.toLocaleString()} clicks</span>
                            <span className="text-[10px] text-muted-foreground">{item.engagement.opens.toLocaleString()} opens</span>
                            <span className="text-[10px] text-muted-foreground">{item.engagement.sends.toLocaleString()} sends</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Account Engagement Summary */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">Account Engagement Summary</h3>
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left px-4 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Account</th>
                      <th className="text-left px-4 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Content Received</th>
                      <th className="text-left px-4 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Campaigns</th>
                      <th className="text-left px-4 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Last Engaged</th>
                      <th className="text-left px-4 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Health</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {ACCOUNTS.map(a => {
                      const pushCount = PUSH_RECORDS.filter(p => p.accounts.includes(a.name)).length;
                      const campaignCount = OUTREACH.filter(o => o.account === a.name).length;
                      const lastPush = PUSH_RECORDS.filter(p => p.accounts.includes(a.name) && p.status === "Delivered").sort((x, y) => y.sentDate.localeCompare(x.sentDate))[0];
                      return (
                        <tr key={a.name} className="hover:bg-muted/30">
                          <td className="px-4 py-2 font-medium text-foreground">{a.name}</td>
                          <td className="px-4 py-2 font-mono text-foreground">{pushCount}</td>
                          <td className="px-4 py-2 font-mono text-foreground">{campaignCount}</td>
                          <td className="px-4 py-2 text-muted-foreground">{lastPush ? lastPush.sentDate : "No pushes yet"}</td>
                          <td className="px-4 py-2">
                            <span className={cn("text-xs font-bold font-mono", healthColor(a.health))}>{a.health}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════
         DETAIL PANELS (Sheets)
         ══════════════════════════════════════════════════════════ */}

      {/* Campaign/Sequence Detail */}
      <Sheet open={!!selectedDetail} onOpenChange={(open) => !open && setSelectedSequence(null)}>
        <SheetContent side="right" className="!w-[500px] !max-w-[90vw] bg-background border-l border-border p-0 overflow-hidden">
          {selectedDetail && <SequenceDetail detail={selectedDetail} />}
        </SheetContent>
      </Sheet>

      {/* Content Library Detail */}
      <Sheet open={!!selectedContent} onOpenChange={(open) => !open && setSelectedContent(null)}>
        <SheetContent side="right" className="!w-[500px] !max-w-[90vw] bg-background border-l border-border p-0 overflow-hidden">
          {selectedContent && <ContentDetail item={selectedContent} />}
        </SheetContent>
      </Sheet>

      {/* Push Record Detail */}
      <Sheet open={!!selectedPush} onOpenChange={(open) => !open && setSelectedPush(null)}>
        <SheetContent side="right" className="!w-[500px] !max-w-[90vw] bg-background border-l border-border p-0 overflow-hidden">
          {selectedPush && <PushDetail push={selectedPush} />}
        </SheetContent>
      </Sheet>

      {/* Campaign Add/Edit Dialog */}
      <RecordFormDialog<OutreachCampaign>
        open={formOpen}
        title={editing ? "Edit Campaign" : "Add Campaign"}
        fields={CAMPAIGN_FIELDS}
        record={editing}
        defaults={{ type: "Upsell Sequence", status: "Draft", opens: "0/0", step: "Step 1 of 5", nextDate: "—" }}
        onClose={() => setFormOpen(false)}
        onSubmit={(rec) => { upsert(rec, editing ? editing.account : undefined); }}
      />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SEQUENCE DETAIL (ported from original OutreachView)
   ══════════════════════════════════════════════════════════════ */

function SequenceDetail({ detail }: { detail: OutreachDetail }) {
  const account = ACCOUNTS.find(a => a.name === detail.account);

  const stepStatusIcon: Record<string, React.ReactNode> = {
    Sent: <Send className="w-3 h-3 text-blue-600" />,
    Opened: <Eye className="w-3 h-3 text-amber-600" />,
    Clicked: <MousePointerClick className="w-3 h-3 text-emerald-600" />,
    Scheduled: <Clock className="w-3 h-3 text-blue-500" />,
    Draft: <FileText className="w-3 h-3 text-slate-400" />,
  };

  const stepStatusColor: Record<string, string> = {
    Sent: "text-blue-700 bg-blue-50",
    Opened: "text-amber-700 bg-amber-50",
    Clicked: "text-emerald-700 bg-emerald-50",
    Scheduled: "text-blue-700 bg-blue-50",
    Draft: "text-slate-600 bg-slate-100",
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        <SheetHeader className="p-0 space-y-3">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Send className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-lg text-foreground font-bold leading-tight">{detail.account}</SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                <span className={cn("text-[10px] px-1.5 py-px rounded font-medium", statusColors[detail.status])}>{detail.status}</span>
                <span>·</span>
                <span>{detail.type}</span>
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Sent", value: detail.metrics.sent, icon: <Send className="w-3 h-3" /> },
            { label: "Opened", value: detail.metrics.opened, icon: <Eye className="w-3 h-3" /> },
            { label: "Clicked", value: detail.metrics.clicked, icon: <MousePointerClick className="w-3 h-3" /> },
            { label: "Replied", value: detail.metrics.replied, icon: <Mail className="w-3 h-3" /> },
          ].map(m => (
            <div key={m.label} className="rounded-xl border border-border bg-card p-3 text-center">
              <div className="text-muted-foreground mx-auto mb-1 flex justify-center">{m.icon}</div>
              <div className="text-sm font-bold font-mono text-foreground">{m.value}</div>
              <div className="text-[9px] text-muted-foreground uppercase">{m.label}</div>
            </div>
          ))}
        </div>

        <Separator className="bg-border/40" />

        <section>
          <h3 className="text-[11px] tracking-[0.1em] uppercase text-muted-foreground font-medium mb-3">Sequence Details</h3>
          <div className="space-y-3">
            <DetailRow icon={<FileText className="w-3.5 h-3.5" />} label="Template" value={detail.template} />
            <DetailRow icon={<User className="w-3.5 h-3.5" />} label="Owner" value={detail.owner} />
            <DetailRow icon={<Calendar className="w-3.5 h-3.5" />} label="Created" value={detail.created} />
            {account && (
              <>
                <DetailRow icon={<Globe className="w-3.5 h-3.5" />} label="Platform" value={account.platform} />
                <DetailRow icon={<Zap className="w-3.5 h-3.5" />} label="Health" value={`${account.health}/100`} valueClass={healthColor(account.health)} />
              </>
            )}
          </div>
        </section>

        <Separator className="bg-border/40" />

        <section>
          <h3 className="text-[11px] tracking-[0.1em] uppercase text-muted-foreground font-medium mb-2">Sequence Goal</h3>
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-start gap-3">
              <ArrowUpRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-foreground leading-relaxed">{detail.goal}</p>
            </div>
          </div>
        </section>

        <Separator className="bg-border/40" />

        <section>
          <h3 className="text-[11px] tracking-[0.1em] uppercase text-muted-foreground font-medium mb-3">
            Email Steps ({detail.emailSteps.length})
          </h3>
          <div className="space-y-2">
            {detail.emailSteps.map((step) => (
              <div key={step.step} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center pt-0.5">
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold",
                      step.status === "Clicked" || step.status === "Opened" ? "bg-emerald-100 text-emerald-700" :
                      step.status === "Sent" ? "bg-blue-100 text-blue-700" :
                      "bg-muted text-muted-foreground"
                    )}>
                      {step.step}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs font-medium text-foreground truncate">{step.subject}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn("text-[9px] px-1.5 py-px rounded font-medium flex items-center gap-1", stepStatusColor[step.status])}>
                        {stepStatusIcon[step.status]} {step.status}
                      </span>
                      {step.sentDate && <span className="text-[10px] text-muted-foreground">{step.sentDate}</span>}
                      {step.openRate && <span className="text-[10px] text-muted-foreground">Open: {step.openRate}</span>}
                      {step.clickRate && <span className="text-[10px] text-muted-foreground">Click: {step.clickRate}</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <Separator className="bg-border/40" />

        <section>
          <h3 className="text-[11px] tracking-[0.1em] uppercase text-muted-foreground font-medium mb-2">Notes</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">{detail.notes}</p>
        </section>

        <Separator className="bg-border/40" />
        <section>
          <h3 className="text-[11px] tracking-[0.1em] uppercase text-muted-foreground font-medium mb-3">Quick Actions</h3>
          <div className="flex flex-wrap gap-2">
            {detail.status === "Draft" && (
              <button onClick={() => toast.success(`Sequence started`, { description: `${detail.account} outreach sequence is now active.` })} className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/50 text-emerald-700 transition-colors">
                <Play className="w-3 h-3" /> Start Sequence
              </button>
            )}
            {detail.status === "Active" && (
              <button onClick={() => toast.info(`Sequence paused`, { description: `${detail.account} outreach sequence has been paused.` })} className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-2 rounded-lg border border-amber-200 bg-amber-50/50 hover:bg-amber-100/50 text-amber-700 transition-colors">
                <Pause className="w-3 h-3" /> Pause Sequence
              </button>
            )}
            <button onClick={() => toast.success(`Sequence reassigned`, { description: `${detail.account} sequence has been reassigned.` })} className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted/50 text-foreground transition-colors">
              <UserPlus className="w-3 h-3" /> Reassign
            </button>
            <button onClick={() => toast.warning(`Sequence escalated`, { description: `${detail.account} outreach has been escalated to management.` })} className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-2 rounded-lg border border-red-200 bg-red-50/50 hover:bg-red-100/50 text-red-700 transition-colors">
              <AlertTriangle className="w-3 h-3" /> Escalate
            </button>
          </div>
        </section>

        <ActivityNotes account={detail.account} section="outreach" itemRef={detail.account} />
      </div>
    </ScrollArea>
  );
}

/* ══════════════════════════════════════════════════════════════
   CONTENT DETAIL PANEL (Enhanced with full preview, engagement history, account breakdown)
   ══════════════════════════════════════════════════════════════ */

/* Simulated engagement history for each content item */
const CONTENT_ENGAGEMENT_HISTORY: Record<string, { date: string; event: string; account: string; contact?: string; detail?: string }[]> = {
  "CL-001": [
    { date: "Apr 2, 2026 9:14 AM", event: "Delivered", account: "Driftwood Capital", contact: "Sarah Mitchell", detail: "Email delivered successfully" },
    { date: "Apr 2, 2026 9:22 AM", event: "Opened", account: "Driftwood Capital", contact: "Sarah Mitchell" },
    { date: "Apr 2, 2026 9:31 AM", event: "Clicked", account: "Driftwood Capital", contact: "Sarah Mitchell", detail: "Clicked: View Release Notes" },
    { date: "Apr 2, 2026 10:05 AM", event: "Delivered", account: "Apex Manufacturing", contact: "James Rodriguez" },
    { date: "Apr 2, 2026 10:18 AM", event: "Opened", account: "Apex Manufacturing", contact: "James Rodriguez" },
    { date: "Apr 2, 2026 2:45 PM", event: "Clicked", account: "Apex Manufacturing", contact: "James Rodriguez", detail: "Clicked: API Integration Docs" },
    { date: "Apr 3, 2026 8:30 AM", event: "Forwarded", account: "Driftwood Capital", contact: "Sarah Mitchell", detail: "Forwarded to 2 team members" },
  ],
  "CL-002": [
    { date: "Mar 18, 2026 10:00 AM", event: "Delivered", account: "Apex Manufacturing", contact: "James Rodriguez" },
    { date: "Mar 18, 2026 10:45 AM", event: "Opened", account: "Apex Manufacturing", contact: "James Rodriguez" },
    { date: "Mar 18, 2026 11:02 AM", event: "Downloaded", account: "Apex Manufacturing", contact: "James Rodriguez", detail: "Downloaded PDF (2.4 MB)" },
    { date: "Mar 19, 2026 9:15 AM", event: "Delivered", account: "BlueWave Logistics", contact: "Marcus Chen" },
    { date: "Mar 19, 2026 3:30 PM", event: "Opened", account: "BlueWave Logistics", contact: "Marcus Chen" },
  ],
  "CL-003": [
    { date: "Apr 8, 2026 8:00 AM", event: "Delivered", account: "Driftwood Capital", contact: "Sarah Mitchell" },
    { date: "Apr 8, 2026 8:12 AM", event: "Opened", account: "Driftwood Capital", contact: "Sarah Mitchell" },
    { date: "Apr 8, 2026 8:25 AM", event: "Clicked", account: "Driftwood Capital", contact: "Sarah Mitchell", detail: "Clicked: ROI Calculator" },
    { date: "Apr 8, 2026 9:00 AM", event: "Downloaded", account: "Driftwood Capital", contact: "Sarah Mitchell", detail: "Downloaded Slide Deck" },
  ],
  "CL-004": [
    { date: "Apr 5, 2026 7:00 AM", event: "Delivered", account: "Driftwood Capital", contact: "Sarah Mitchell" },
    { date: "Apr 5, 2026 7:00 AM", event: "Delivered", account: "Apex Manufacturing", contact: "James Rodriguez" },
    { date: "Apr 5, 2026 7:00 AM", event: "Delivered", account: "ClearPath Retail", contact: "Diana Flores" },
    { date: "Apr 5, 2026 7:00 AM", event: "Delivered", account: "BlueWave Logistics", contact: "Marcus Chen" },
    { date: "Apr 5, 2026 7:00 AM", event: "Delivered", account: "Edgeline Foods", contact: "Tom Bradley" },
    { date: "Apr 5, 2026 7:15 AM", event: "Opened", account: "Driftwood Capital", contact: "Sarah Mitchell" },
    { date: "Apr 5, 2026 7:22 AM", event: "Clicked", account: "Driftwood Capital", contact: "Sarah Mitchell", detail: "Clicked: Register Now" },
    { date: "Apr 5, 2026 8:05 AM", event: "Opened", account: "ClearPath Retail", contact: "Diana Flores" },
    { date: "Apr 5, 2026 8:30 AM", event: "Clicked", account: "ClearPath Retail", contact: "Diana Flores", detail: "Clicked: View Agenda" },
    { date: "Apr 5, 2026 9:10 AM", event: "Opened", account: "Apex Manufacturing", contact: "James Rodriguez" },
    { date: "Apr 5, 2026 9:45 AM", event: "Clicked", account: "Apex Manufacturing", contact: "James Rodriguez", detail: "Clicked: Register Now" },
    { date: "Apr 5, 2026 11:30 AM", event: "Opened", account: "BlueWave Logistics", contact: "Marcus Chen" },
  ],
  "CL-005": [
    { date: "Apr 10, 2026 9:00 AM", event: "Delivered", account: "Apex Manufacturing", contact: "James Rodriguez" },
    { date: "Apr 10, 2026 9:00 AM", event: "Delivered", account: "ClearPath Retail", contact: "Diana Flores" },
    { date: "Apr 10, 2026 9:20 AM", event: "Opened", account: "Apex Manufacturing", contact: "James Rodriguez" },
    { date: "Apr 10, 2026 9:35 AM", event: "Clicked", account: "Apex Manufacturing", contact: "James Rodriguez", detail: "Clicked: Start Certification" },
    { date: "Apr 10, 2026 10:15 AM", event: "Opened", account: "ClearPath Retail", contact: "Diana Flores" },
    { date: "Apr 10, 2026 10:28 AM", event: "Clicked", account: "ClearPath Retail", contact: "Diana Flores", detail: "Clicked: View Curriculum" },
  ],
  "CL-006": [
    { date: "Apr 1, 2026 6:00 AM", event: "Delivered", account: "Driftwood Capital", contact: "Sarah Mitchell" },
    { date: "Apr 1, 2026 6:00 AM", event: "Delivered", account: "Apex Manufacturing", contact: "James Rodriguez" },
    { date: "Apr 1, 2026 6:00 AM", event: "Delivered", account: "ClearPath Retail", contact: "Diana Flores" },
    { date: "Apr 1, 2026 6:00 AM", event: "Delivered", account: "BlueWave Logistics", contact: "Marcus Chen" },
    { date: "Apr 1, 2026 6:00 AM", event: "Delivered", account: "Edgeline Foods", contact: "Tom Bradley" },
    { date: "Apr 1, 2026 7:12 AM", event: "Opened", account: "Driftwood Capital", contact: "Sarah Mitchell" },
    { date: "Apr 1, 2026 7:30 AM", event: "Clicked", account: "Driftwood Capital", contact: "Sarah Mitchell", detail: "Clicked: Partner Wins" },
    { date: "Apr 1, 2026 8:05 AM", event: "Opened", account: "Apex Manufacturing", contact: "James Rodriguez" },
    { date: "Apr 1, 2026 9:00 AM", event: "Opened", account: "ClearPath Retail", contact: "Diana Flores" },
    { date: "Apr 1, 2026 9:22 AM", event: "Clicked", account: "ClearPath Retail", contact: "Diana Flores", detail: "Clicked: Upcoming Events" },
    { date: "Apr 1, 2026 10:45 AM", event: "Opened", account: "BlueWave Logistics", contact: "Marcus Chen" },
  ],
  "CL-007": [
    { date: "Mar 12, 2026 9:00 AM", event: "Delivered", account: "ClearPath Retail", contact: "Diana Flores" },
    { date: "Mar 12, 2026 9:00 AM", event: "Delivered", account: "Driftwood Capital", contact: "Sarah Mitchell" },
    { date: "Mar 12, 2026 9:30 AM", event: "Opened", account: "ClearPath Retail", contact: "Diana Flores" },
    { date: "Mar 12, 2026 9:45 AM", event: "Clicked", account: "ClearPath Retail", contact: "Diana Flores", detail: "Clicked: Watch Episode 1" },
    { date: "Mar 12, 2026 10:15 AM", event: "Opened", account: "Driftwood Capital", contact: "Sarah Mitchell" },
    { date: "Mar 12, 2026 10:30 AM", event: "Clicked", account: "Driftwood Capital", contact: "Sarah Mitchell", detail: "Clicked: Watch Episode 1" },
  ],
  "CL-008": [
    { date: "Apr 9, 2026 10:00 AM", event: "Delivered", account: "Driftwood Capital", contact: "Sarah Mitchell" },
    { date: "Apr 9, 2026 10:22 AM", event: "Opened", account: "Driftwood Capital", contact: "Sarah Mitchell" },
    { date: "Apr 9, 2026 10:35 AM", event: "Downloaded", account: "Driftwood Capital", contact: "Sarah Mitchell", detail: "Downloaded PDF (1.8 MB)" },
  ],
};

/* Simulated content preview sections */
const CONTENT_PREVIEWS: Record<string, { sections: { heading: string; body: string }[]; callToAction?: string }> = {
  "CL-001": {
    sections: [
      { heading: "Advanced Analytics 2.0", body: "Redesigned dashboard with real-time data streaming, custom widget builder, and predictive trend analysis. Partners can now create client-facing reports with white-label branding." },
      { heading: "Enhanced API Integrations", body: "New webhook support for 15+ CRM platforms, batch processing endpoints for bulk operations, and improved rate limiting with priority queuing for enterprise partners." },
      { heading: "Performance Improvements", body: "40% faster page load times, 60% reduction in API response latency, and improved caching layer supporting 10x concurrent user capacity." },
    ],
    callToAction: "View Full Release Notes",
  },
  "CL-002": {
    sections: [
      { heading: "Discovery Framework", body: "Structured approach to understanding enterprise client needs, including stakeholder mapping, pain point assessment, and success criteria definition." },
      { heading: "Implementation Timeline", body: "Standard 90-day implementation plan with milestone checkpoints, resource allocation guides, and escalation procedures for complex deployments." },
      { heading: "Success Metrics", body: "KPI frameworks for measuring onboarding effectiveness, including time-to-value, adoption rates, and early health indicators." },
    ],
    callToAction: "Download Full Playbook",
  },
  "CL-003": {
    sections: [
      { heading: "Joint Value Proposition", body: "Combined platform capabilities addressing regulatory compliance, risk management, and operational efficiency in financial services." },
      { heading: "Battle Cards", body: "Competitive positioning against legacy solutions, objection handling scripts, and proof points from existing financial services deployments." },
      { heading: "Customer Stories", body: "Three validated case studies showing 35% cost reduction, 50% faster compliance reporting, and 2x client retention improvement." },
    ],
    callToAction: "Access Full Co-Sell Kit",
  },
  "CL-004": {
    sections: [
      { heading: "Event Details", body: "June 15 to 17, 2026 in Austin, TX. Three days of keynotes, breakout sessions, hands-on workshops, and networking events with 500+ partner professionals." },
      { heading: "Featured Sessions", body: "Product roadmap reveal, advanced certification bootcamp, co-sell strategy masterclass, and customer success innovation lab." },
      { heading: "Early Bird Benefits", body: "20% discount on registration, priority session selection, exclusive pre-event networking dinner, and complimentary certification exam voucher." },
    ],
    callToAction: "Register Now",
  },
  "CL-005": {
    sections: [
      { heading: "Curriculum Overview", body: "Six module program covering advanced reporting, custom dashboards, predictive analytics, data visualization, API data access, and automated insights delivery." },
      { heading: "Hands-On Labs", body: "12 practical exercises using real-world datasets, including building executive dashboards, configuring alert thresholds, and creating automated report distributions." },
      { heading: "Certification Benefits", body: "Verified badge on partner profile, priority support queue access, early access to beta features, and eligibility for advanced tier benefits." },
    ],
    callToAction: "Start Certification",
  },
  "CL-006": {
    sections: [
      { heading: "Product Updates", body: "Q2 release highlights, upcoming maintenance windows, and new integration availability. Personalized feature recommendations based on partner usage patterns." },
      { heading: "Partner Wins", body: "Spotlight on top-performing partners this month, including deal highlights, creative use cases, and community contributions." },
      { heading: "Upcoming Events", body: "Webinar schedule, regional meetups, certification deadlines, and partner advisory board nominations now open." },
    ],
    callToAction: "View in Browser",
  },
  "CL-007": {
    sections: [
      { heading: "Episode 1: Proactive Health Monitoring", body: "Setting up early warning systems, configuring health score thresholds, and building automated intervention workflows." },
      { heading: "Episode 2: QBR Best Practices", body: "Structuring quarterly business reviews for maximum impact, including data preparation, storytelling frameworks, and action item tracking." },
      { heading: "Episode 3: Escalation Management", body: "When and how to escalate, communication templates, stakeholder management, and recovery playbooks for at-risk accounts." },
    ],
    callToAction: "Watch Series",
  },
  "CL-008": {
    sections: [
      { heading: "Challenge", body: "Cedar Valley Health System faced 22% annual churn in their partner-managed accounts, with inconsistent onboarding taking 6+ months and limited visibility into account health." },
      { heading: "Solution", body: "Implemented Partner OS Ai with custom health scoring for healthcare vertical, automated onboarding workflows, and real-time risk detection across 340 managed accounts." },
      { heading: "Results", body: "40% reduction in churn (22% to 13.2%), 3x faster onboarding (6 months to 8 weeks), and $2.4M in protected revenue within the first year of deployment." },
    ],
    callToAction: "Download Case Study",
  },
};

function ContentDetail({ item }: { item: ContentItem }) {
  const [activeDetailTab, setActiveDetailTab] = useState<"preview" | "history" | "accounts">("preview");
  const typeConf = contentTypeConfig[item.type] || contentTypeConfig["Custom Message"];
  const fmtConf = formatConfig[item.format] || formatConfig["Document"];
  const history = CONTENT_ENGAGEMENT_HISTORY[item.id] || [];
  const preview = CONTENT_PREVIEWS[item.id];

  /* Compute account-level engagement */
  const accountEngagement = useMemo(() => {
    const map: Record<string, { delivered: boolean; opened: boolean; clicked: boolean; downloaded: boolean; events: number }> = {};
    history.forEach(ev => {
      if (!map[ev.account]) map[ev.account] = { delivered: false, opened: false, clicked: false, downloaded: false, events: 0 };
      map[ev.account].events++;
      if (ev.event === "Delivered") map[ev.account].delivered = true;
      if (ev.event === "Opened") map[ev.account].opened = true;
      if (ev.event === "Clicked") map[ev.account].clicked = true;
      if (ev.event === "Downloaded" || ev.event === "Forwarded") map[ev.account].downloaded = true;
    });
    return Object.entries(map).map(([account, data]) => ({ account, ...data }));
  }, [history]);

  const openRate = item.engagement.sends > 0 ? Math.round((item.engagement.opens / item.engagement.sends) * 100) : 0;
  const clickRate = item.engagement.opens > 0 ? Math.round((item.engagement.clicks / item.engagement.opens) * 100) : 0;

  const eventIcon: Record<string, React.ReactNode> = {
    Delivered: <Send className="w-3 h-3 text-blue-600" />,
    Opened: <Eye className="w-3 h-3 text-amber-600" />,
    Clicked: <MousePointerClick className="w-3 h-3 text-emerald-600" />,
    Downloaded: <Download className="w-3 h-3 text-purple-600" />,
    Forwarded: <Share2 className="w-3 h-3 text-teal-600" />,
  };

  const eventColor: Record<string, string> = {
    Delivered: "text-blue-700 bg-blue-50",
    Opened: "text-amber-700 bg-amber-50",
    Clicked: "text-emerald-700 bg-emerald-50",
    Downloaded: "text-purple-700 bg-purple-50",
    Forwarded: "text-teal-700 bg-teal-50",
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        {/* Header */}
        <SheetHeader className="p-0 space-y-3">
          <div className="flex items-start gap-4">
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center border", typeConf.bg, `border-${typeConf.color.replace("text-", "")}/20`)}>
              <typeConf.icon className={cn("w-6 h-6", typeConf.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-lg text-foreground font-bold leading-tight">{item.title}</SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                <span className={cn("text-[10px] px-1.5 py-px rounded font-medium", typeConf.bg, typeConf.color)}>{item.type}</span>
                <span>·</span>
                <span className="flex items-center gap-1"><fmtConf.icon className="w-3 h-3" /> {item.format}</span>
                <span>·</span>
                <span className={cn("text-[10px] px-1.5 py-px rounded font-medium",
                  item.status === "Published" ? "bg-emerald-50 text-emerald-700" :
                  item.status === "Draft" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"
                )}>{item.status}</span>
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Engagement Metrics with Rates */}
        {item.engagement.sends > 0 && (
          <div className="grid grid-cols-5 gap-2">
            {[
              { label: "Sends", value: item.engagement.sends.toLocaleString(), icon: <Send className="w-3 h-3" /> },
              { label: "Opens", value: item.engagement.opens.toLocaleString(), icon: <Eye className="w-3 h-3" /> },
              { label: "Clicks", value: item.engagement.clicks.toLocaleString(), icon: <MousePointerClick className="w-3 h-3" /> },
              { label: "Open Rate", value: `${openRate}%`, icon: <MailOpen className="w-3 h-3" /> },
              { label: "Click Rate", value: `${clickRate}%`, icon: <TrendingUp className="w-3 h-3" /> },
            ].map(m => (
              <div key={m.label} className="rounded-xl border border-border bg-card p-2.5 text-center">
                <div className="text-muted-foreground mx-auto mb-1 flex justify-center">{m.icon}</div>
                <div className="text-xs font-bold font-mono text-foreground">{m.value}</div>
                <div className="text-[8px] text-muted-foreground uppercase">{m.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Conversion Funnel */}
        {item.engagement.sends > 0 && (
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-[11px] tracking-[0.1em] uppercase text-muted-foreground font-medium mb-3">Engagement Funnel</h3>
            <div className="space-y-2">
              {[
                { label: "Delivered", value: item.engagement.sends, pct: 100, color: "bg-blue-500" },
                { label: "Opened", value: item.engagement.opens, pct: openRate, color: "bg-amber-500" },
                { label: "Clicked", value: item.engagement.clicks, pct: item.engagement.sends > 0 ? Math.round((item.engagement.clicks / item.engagement.sends) * 100) : 0, color: "bg-emerald-500" },
              ].map(step => (
                <div key={step.label} className="flex items-center gap-3">
                  <span className="text-[10px] text-muted-foreground w-16">{step.label}</span>
                  <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all", step.color)} style={{ width: `${step.pct}%` }} />
                  </div>
                  <span className="text-[10px] font-mono text-foreground w-12 text-right">{step.value.toLocaleString()}</span>
                  <span className="text-[10px] text-muted-foreground w-8 text-right">{step.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <Separator className="bg-border/40" />

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 border-b border-border pb-0">
          {[
            { key: "preview" as const, label: "Preview", icon: Eye },
            { key: "history" as const, label: "Engagement History", icon: Clock },
            { key: "accounts" as const, label: "Account Breakdown", icon: Building2 },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveDetailTab(tab.key)}
              className={cn(
                "inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-2 rounded-t-lg transition-colors border-b-2 -mb-px",
                activeDetailTab === tab.key
                  ? "border-primary text-primary bg-primary/5"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <tab.icon className="w-3 h-3" /> {tab.label}
            </button>
          ))}
        </div>

        {/* Tab: Preview */}
        {activeDetailTab === "preview" && (
          <div className="space-y-4">
            <section>
              <h3 className="text-[11px] tracking-[0.1em] uppercase text-muted-foreground font-medium mb-2">Description</h3>
              <p className="text-xs text-foreground leading-relaxed">{item.description}</p>
            </section>

            {preview && (
              <section>
                <h3 className="text-[11px] tracking-[0.1em] uppercase text-muted-foreground font-medium mb-3">Content Preview</h3>
                <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-4">
                  {preview.sections.map((sec, i) => (
                    <div key={i} className={cn(i > 0 && "pt-3 border-t border-border/50")}>
                      <h4 className="text-xs font-semibold text-foreground mb-1">{sec.heading}</h4>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{sec.body}</p>
                    </div>
                  ))}
                  {preview.callToAction && (
                    <div className="pt-3 border-t border-border/50">
                      <button className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                        <ExternalLink className="w-3 h-3" /> {preview.callToAction}
                      </button>
                    </div>
                  )}
                </div>
              </section>
            )}

            <Separator className="bg-border/40" />

            <section>
              <h3 className="text-[11px] tracking-[0.1em] uppercase text-muted-foreground font-medium mb-3">Details</h3>
              <div className="space-y-3">
                <DetailRow icon={<User className="w-3.5 h-3.5" />} label="Author" value={item.author} />
                <DetailRow icon={<Calendar className="w-3.5 h-3.5" />} label="Created" value={item.created} />
                <DetailRow icon={<fmtConf.icon className="w-3.5 h-3.5" />} label="Format" value={item.format} />
              </div>
            </section>

            <Separator className="bg-border/40" />

            <section>
              <h3 className="text-[11px] tracking-[0.1em] uppercase text-muted-foreground font-medium mb-3">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {item.tags.map(tag => (
                  <span key={tag} className="text-[10px] px-2 py-1 rounded-lg bg-muted text-muted-foreground font-medium flex items-center gap-1">
                    <Tag className="w-3 h-3" /> {tag}
                  </span>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* Tab: Engagement History */}
        {activeDetailTab === "history" && (
          <div className="space-y-4">
            {history.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No engagement history yet. This content has not been sent.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {history.map((ev, i) => (
                  <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/30 transition-colors">
                    <div className="flex flex-col items-center pt-0.5">
                      <div className={cn("w-6 h-6 rounded-full flex items-center justify-center", eventColor[ev.event] || "bg-slate-100")}>
                        {eventIcon[ev.event] || <Circle className="w-3 h-3 text-slate-400" />}
                      </div>
                      {i < history.length - 1 && <div className="w-px h-4 bg-border mt-1" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn("text-[10px] px-1.5 py-px rounded font-medium", eventColor[ev.event] || "bg-slate-100 text-slate-600")}>{ev.event}</span>
                        <span className="text-[10px] text-muted-foreground">{ev.account}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {ev.contact && <span className="text-[10px] text-foreground font-medium">{ev.contact}</span>}
                        <span className="text-[9px] text-muted-foreground">{ev.date}</span>
                      </div>
                      {ev.detail && <p className="text-[10px] text-muted-foreground mt-0.5">{ev.detail}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Account Breakdown */}
        {activeDetailTab === "accounts" && (
          <div className="space-y-4">
            {accountEngagement.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No accounts have received this content yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {accountEngagement.map(ae => {
                  const account = ACCOUNTS.find(a => a.name === ae.account);
                  return (
                    <div key={ae.account} className="rounded-xl border border-border bg-card p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                          <span className="text-xs font-semibold text-foreground">{ae.account}</span>
                        </div>
                        {account && (
                          <span className={cn("text-[10px] font-bold font-mono", healthColor(account.health))}>{account.health}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-medium flex items-center gap-1",
                          ae.delivered ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-400"
                        )}>
                          <Send className="w-2.5 h-2.5" /> Delivered
                        </span>
                        <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-medium flex items-center gap-1",
                          ae.opened ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-400"
                        )}>
                          <Eye className="w-2.5 h-2.5" /> Opened
                        </span>
                        <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-medium flex items-center gap-1",
                          ae.clicked ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"
                        )}>
                          <MousePointerClick className="w-2.5 h-2.5" /> Clicked
                        </span>
                        {ae.downloaded && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-medium flex items-center gap-1 bg-purple-50 text-purple-700">
                            <Download className="w-2.5 h-2.5" /> Downloaded
                          </span>
                        )}
                      </div>
                      <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">{ae.events} engagement events</span>
                        {account && <span className="text-[10px] text-muted-foreground">{account.platform}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <Separator className="bg-border/40" />

        {/* Quick Actions */}
        <section>
          <h3 className="text-[11px] tracking-[0.1em] uppercase text-muted-foreground font-medium mb-3">Quick Actions</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => toast.success("Push to Account initiated", { description: "Select accounts to send this content to." })}
              className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Send className="w-3 h-3" /> Push to Account
            </button>
            <button
              onClick={() => toast.success("Content downloaded")}
              className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted/50 text-foreground transition-colors"
            >
              <Download className="w-3 h-3" /> Download
            </button>
            <button
              onClick={() => toast.success("Share link copied to clipboard")}
              className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted/50 text-foreground transition-colors"
            >
              <Share2 className="w-3 h-3" /> Share Link
            </button>
            <button
              onClick={() => toast.info("Opening content editor...")}
              className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-2 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary transition-colors"
            >
              <Pencil className="w-3 h-3" /> Edit
            </button>
            <button
              onClick={() => toast.success("Content duplicated")}
              className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted/50 text-foreground transition-colors"
            >
              <Layers className="w-3 h-3" /> Duplicate
            </button>
          </div>
        </section>

        <ActivityNotes account="Engagement Hub" section="outreach" itemRef={`content-${item.id}`} />
      </div>
    </ScrollArea>
  );
}

/* ══════════════════════════════════════════════════════════════
   PUSH DETAIL PANEL
   ══════════════════════════════════════════════════════════════ */

function PushDetail({ push }: { push: PushRecord }) {
  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        <SheetHeader className="p-0 space-y-3">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Rocket className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-lg text-foreground font-bold leading-tight">Content Push: {push.id}</SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                <span className={cn("text-[10px] px-1.5 py-px rounded font-medium",
                  push.status === "Delivered" ? "bg-emerald-50 text-emerald-700" :
                  push.status === "Scheduled" ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600"
                )}>{push.status}</span>
                <span>·</span>
                <span>{push.sentDate}</span>
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Engagement */}
        {push.status === "Delivered" && (
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-border bg-card p-3 text-center">
              <div className="text-muted-foreground mx-auto mb-1 flex justify-center"><Eye className="w-3 h-3" /></div>
              <div className="text-sm font-bold font-mono text-foreground">{push.opens}</div>
              <div className="text-[9px] text-muted-foreground uppercase">Opens</div>
            </div>
            <div className="rounded-xl border border-border bg-card p-3 text-center">
              <div className="text-muted-foreground mx-auto mb-1 flex justify-center"><MousePointerClick className="w-3 h-3" /></div>
              <div className="text-sm font-bold font-mono text-foreground">{push.clicks}</div>
              <div className="text-[9px] text-muted-foreground uppercase">Clicks</div>
            </div>
          </div>
        )}

        <Separator className="bg-border/40" />

        <section>
          <h3 className="text-[11px] tracking-[0.1em] uppercase text-muted-foreground font-medium mb-3">Content Delivered</h3>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-medium text-foreground">{push.contentTitle}</p>
            <p className="text-[10px] text-muted-foreground mt-1">ID: {push.contentId}</p>
          </div>
        </section>

        <Separator className="bg-border/40" />

        <section>
          <h3 className="text-[11px] tracking-[0.1em] uppercase text-muted-foreground font-medium mb-3">Recipients ({push.accounts.length})</h3>
          <div className="space-y-2">
            {push.accounts.map(acct => {
              const account = ACCOUNTS.find(a => a.name === acct);
              return (
                <div key={acct} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                  <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground">{acct}</p>
                    {account && <p className="text-[10px] text-muted-foreground">{account.platform} · Health: {account.health}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <Separator className="bg-border/40" />

        <section>
          <h3 className="text-[11px] tracking-[0.1em] uppercase text-muted-foreground font-medium mb-3">Details</h3>
          <div className="space-y-3">
            <DetailRow icon={<User className="w-3.5 h-3.5" />} label="Sent By" value={push.sentBy} />
            <DetailRow icon={<Calendar className="w-3.5 h-3.5" />} label="Date" value={push.sentDate} />
          </div>
        </section>

        <Separator className="bg-border/40" />

        <section>
          <h3 className="text-[11px] tracking-[0.1em] uppercase text-muted-foreground font-medium mb-2">Personalization</h3>
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-xs text-foreground leading-relaxed">{push.personalization}</p>
          </div>
        </section>
      </div>
    </ScrollArea>
  );
}

/* ─── Helper ─── */
function DetailRow({ icon, label, value, valueClass }: { icon: React.ReactNode; label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-muted-foreground">{icon}</div>
      <span className="text-xs text-muted-foreground w-28">{label}</span>
      <span className={cn("text-xs font-medium text-foreground", valueClass)}>{value}</span>
    </div>
  );
}
