/*
 * KnowledgeBaseView — Searchable repository of past issues & best-practice resolutions
 * Features: full-text search, category/platform/role filters, upvote scoring, article detail
 * Warm adaptive theme
 */
import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Search, BookOpen, ThumbsUp, Eye, Clock, Tag, Filter,
  ChevronRight, ArrowLeft, X, Star, CheckCircle2, AlertTriangle,
  Lightbulb, Shield, TrendingUp, LifeBuoy, Zap, Award,
  MessageSquare, User, Building2, Copy, Check, Bookmark, BookmarkCheck,
  Plus, Pencil, Trash2,
} from "lucide-react";
import { useCollection } from "@/lib/useCollection";
import RecordFormDialog, { type FieldSpec } from "@/components/RecordFormDialog";
import { useAuth } from "@/contexts/AuthContext";

/* ── Types ──────────────────────────────────────────────────── */
interface KBArticle {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  platform: string;
  role: string;
  tags: string[];
  upvotes: number;
  views: number;
  author: string;
  authorRole: string;
  createdAt: string;
  updatedAt: string;
  resolution: string;
  resolutionSteps: string[];
  relatedTickets: string[];
  difficulty: "Beginner" | "Intermediate" | "Advanced";
}

/* ── Mock Knowledge Base Data ───────────────────────────────── */
const KB_ARTICLES: KBArticle[] = [
  {
    id: "KB-001",
    title: "Resolving Multi-Currency Revenue Recognition Errors in NetSuite",
    summary: "Step-by-step guide to diagnose and fix revenue recognition module errors when processing multi-currency invoices in NetSuite environments.",
    content: "This issue typically occurs when exchange rate tables are incomplete or when the revenue recognition rules haven't been configured for multi-currency scenarios. The most common root cause is missing exchange rates for specific date ranges.",
    category: "Technical Support",
    platform: "NetSuite",
    role: "Support",
    tags: ["revenue-recognition", "multi-currency", "netsuite", "invoicing", "critical"],
    upvotes: 47,
    views: 312,
    author: "Sarah Chen",
    authorRole: "Senior Support Engineer",
    createdAt: "2026-02-15",
    updatedAt: "2026-04-08",
    resolution: "Update exchange rate tables and configure revenue recognition rules for multi-currency handling",
    resolutionSteps: [
      "Navigate to Setup → Company → Enable Features → Currencies and verify multi-currency is enabled",
      "Go to Lists → Accounting → Currency Exchange Rates and check for gaps in the date ranges",
      "Add missing exchange rates for all active currencies within the affected period",
      "Review Setup → Accounting → Revenue Recognition Rules for multi-currency configuration",
      "Set Currency Conversion Method to 'Transaction Date Rate' for accurate recognition",
      "Run a test batch of 5-10 invoices to verify the fix before processing the full queue",
      "Monitor the error logs for 48 hours to confirm the issue is fully resolved"
    ],
    relatedTickets: ["T-1041", "T-0987", "T-0923"],
    difficulty: "Advanced",
  },
  {
    id: "KB-002",
    title: "At-Risk Account Recovery: 30-Day Turnaround Playbook",
    summary: "Proven framework for recovering accounts with declining health scores. Includes communication templates, escalation triggers, and success metrics.",
    content: "When an account's health score drops below 65, immediate intervention is required. This playbook has been used successfully on 12 accounts in the past quarter with an 83% recovery rate.",
    category: "Account Management",
    platform: "All",
    role: "Account Manager",
    tags: ["at-risk", "recovery", "health-score", "retention", "playbook"],
    upvotes: 63,
    views: 489,
    author: "Marcus Lin",
    authorRole: "Senior Account Manager",
    createdAt: "2026-01-20",
    updatedAt: "2026-04-02",
    resolution: "Structured 30-day recovery plan with weekly milestones and executive engagement",
    resolutionSteps: [
      "Day 1-3: Schedule emergency call with primary contact to acknowledge concerns and gather feedback",
      "Day 3-5: Resolve all open Critical/High support tickets — no exceptions",
      "Day 5-7: Deliver 2-3 quick wins that demonstrate immediate value (reports, automations, training)",
      "Day 7-14: Establish weekly check-in cadence with documented action items",
      "Day 14-21: Conduct mini-QBR focused on ROI and recent improvements",
      "Day 21-28: Introduce new features or capabilities aligned with their stated goals",
      "Day 28-30: Assess health score trend — target minimum +10 points from baseline"
    ],
    relatedTickets: ["T-1041", "T-1038"],
    difficulty: "Intermediate",
  },
  {
    id: "KB-003",
    title: "Handling 'Your Pricing Is Too High' Objection — Competitive Positioning Guide",
    summary: "Data-driven framework for reframing pricing conversations. Includes competitor comparison matrices, ROI calculators, and proven talk tracks.",
    content: "Pricing objections are the #1 reason deals stall in Stage 3. This guide provides a structured approach to acknowledge, reframe, prove, and advance past pricing concerns.",
    category: "Sales Strategy",
    platform: "All",
    role: "Sales",
    tags: ["objection-handling", "pricing", "competitive", "negotiation", "closing"],
    upvotes: 58,
    views: 421,
    author: "Jordan Davis",
    authorRole: "Sales Director",
    createdAt: "2026-03-01",
    updatedAt: "2026-04-10",
    resolution: "Use the Acknowledge → Reframe → Prove → Advance framework with data-backed ROI arguments",
    resolutionSteps: [
      "Acknowledge: Never dismiss the concern — validate it and ask clarifying questions",
      "Reframe: Shift from cost to value — ask 'compared to what?' to understand their benchmark",
      "Prove: Present TCO comparison showing 3-year cost advantage over competitors",
      "Share case study: Similar company saw 340% ROI with 4.2-month payback period",
      "Offer custom ROI analysis specific to their portfolio size and churn rate",
      "Advance: Propose a pilot or phased rollout to reduce perceived risk"
    ],
    relatedTickets: [],
    difficulty: "Intermediate",
  },
  {
    id: "KB-004",
    title: "Salesforce Apex Trigger CPU Limit Optimization",
    summary: "Technical guide for resolving CPU limit exceptions caused by Apex triggers on large opportunity batches. Includes code patterns and governor limit strategies.",
    content: "CPU limit exceptions in Salesforce occur when triggers aren't bulkified or when complex logic runs in loops. This guide covers the most common patterns and their optimized alternatives.",
    category: "Technical Support",
    platform: "Salesforce",
    role: "Support",
    tags: ["salesforce", "apex", "cpu-limit", "optimization", "triggers", "governor-limits"],
    upvotes: 39,
    views: 267,
    author: "Priya Nair",
    authorRole: "Salesforce Technical Lead",
    createdAt: "2026-02-28",
    updatedAt: "2026-04-05",
    resolution: "Bulkify trigger logic, move complex calculations to async processing, implement trigger framework",
    resolutionSteps: [
      "Identify the trigger causing the CPU limit by enabling Debug Logs with APEX_CODE level set to FINEST",
      "Check for SOQL queries or DML operations inside loops — move them outside",
      "Replace individual record processing with collection-based operations (Maps, Sets)",
      "Move complex calculations to @future methods or Queueable Apex for async processing",
      "Implement a trigger framework (e.g., fflib) to prevent recursive trigger execution",
      "Add CPU time checkpoints using Limits.getCpuTime() to monitor consumption",
      "Test with realistic data volumes (minimum 200 records) before deploying to production"
    ],
    relatedTickets: ["T-1029"],
    difficulty: "Advanced",
  },
  {
    id: "KB-005",
    title: "QBR Preparation Checklist — Maximizing Executive Impact",
    summary: "Complete preparation guide for Quarterly Business Reviews that drive expansion. Includes data gathering templates, presentation structure, and follow-up protocols.",
    content: "A well-prepared QBR is the single most effective tool for driving expansion revenue. This checklist ensures you walk in with data-backed insights and walk out with committed next steps.",
    category: "Account Management",
    platform: "All",
    role: "Account Manager",
    tags: ["qbr", "preparation", "executive", "expansion", "presentation"],
    upvotes: 71,
    views: 534,
    author: "Dana Reyes",
    authorRole: "VP of Customer Success",
    createdAt: "2025-12-10",
    updatedAt: "2026-03-28",
    resolution: "Follow the 5-section QBR framework: Wins, Metrics, Adoption, Roadmap, Next Steps",
    resolutionSteps: [
      "2 weeks before: Pull health score history, ARR trend, usage metrics, and support ticket summary",
      "1 week before: Identify 3 concrete wins with quantified business impact",
      "1 week before: Prepare 2-3 expansion recommendations tied to their stated business goals",
      "3 days before: Send agenda preview email to all attendees with key highlights",
      "Day of: Lead with wins (5 min), then metrics (5 min), adoption insights (3 min), roadmap (5 min), discussion (10 min)",
      "Same day: Send summary email with action items, owners, and deadlines within 2 hours",
      "1 week after: Follow up on all action items and schedule next check-in"
    ],
    relatedTickets: [],
    difficulty: "Beginner",
  },
  {
    id: "KB-006",
    title: "HubSpot Email Sequence Troubleshooting — Triggers Not Firing",
    summary: "Diagnostic guide for when HubSpot email sequences fail to trigger for new contact lists. Covers enrollment criteria, workflow conflicts, and contact property issues.",
    content: "Email sequence trigger failures are usually caused by enrollment criteria mismatches, workflow conflicts, or contact property issues. This guide walks through the systematic diagnostic process.",
    category: "Technical Support",
    platform: "HubSpot",
    role: "Support",
    tags: ["hubspot", "email-sequences", "triggers", "workflows", "automation"],
    upvotes: 34,
    views: 198,
    author: "Tom Hargrove",
    authorRole: "HubSpot Specialist",
    createdAt: "2026-03-10",
    updatedAt: "2026-04-01",
    resolution: "Verify enrollment criteria, check for workflow conflicts, and validate contact properties",
    resolutionSteps: [
      "Check Sequences → Settings → Enrollment criteria — ensure contact list matches trigger conditions",
      "Verify contacts have valid email addresses and haven't been previously unenrolled",
      "Check for conflicting workflows that may be overriding sequence enrollment",
      "Review contact properties: ensure 'Email' field is populated and 'Opted out' is false",
      "Check sending limits: HubSpot enforces daily email limits per user",
      "Test with a single contact first using the 'Enroll' button before bulk enrollment",
      "Monitor the sequence activity log for specific error messages"
    ],
    relatedTickets: ["T-1035"],
    difficulty: "Beginner",
  },
  {
    id: "KB-007",
    title: "Pipeline Forecasting Methodology — Weighted vs. AI-Predicted",
    summary: "Comparison of pipeline forecasting methods with guidelines for when to use each. Includes accuracy benchmarks and implementation recommendations for managers.",
    content: "Accurate pipeline forecasting is critical for resource planning and executive reporting. This article compares traditional weighted forecasting with AI-predicted models and provides guidance on implementation.",
    category: "Pipeline Management",
    platform: "All",
    role: "Manager",
    tags: ["pipeline", "forecasting", "analytics", "management", "strategy"],
    upvotes: 52,
    views: 378,
    author: "Alex Rivera",
    authorRole: "Revenue Operations Director",
    createdAt: "2026-01-05",
    updatedAt: "2026-03-15",
    resolution: "Use weighted forecasting for quarterly planning and AI-predicted for deal-level prioritization",
    resolutionSteps: [
      "Establish stage-based probability weights: Qualification (10%), Discovery (25%), Proposal (50%), Negotiation (75%), Commit (90%)",
      "Calculate weighted pipeline: Sum of (Deal Value × Stage Probability) for all active deals",
      "Apply historical close rate adjustment: Multiply weighted total by team's trailing 4-quarter close rate",
      "For AI-predicted: Feed deal velocity, engagement signals, and historical patterns into the model",
      "Compare both methods monthly and track accuracy against actual closed revenue",
      "Use weighted for board-level reporting, AI-predicted for rep coaching and deal prioritization",
      "Review and recalibrate weights quarterly based on actual conversion rates per stage"
    ],
    relatedTickets: [],
    difficulty: "Intermediate",
  },
  {
    id: "KB-008",
    title: "Upsell Discovery Framework — Identifying Expansion Signals",
    summary: "Framework for identifying and acting on upsell signals across your account portfolio. Includes signal scoring, conversation starters, and proposal templates.",
    content: "The best upsell opportunities are hiding in plain sight. This framework teaches you to identify expansion signals from usage data, support interactions, and relationship cues.",
    category: "Sales Strategy",
    platform: "All",
    role: "Sales",
    tags: ["upsell", "expansion", "signals", "discovery", "revenue-growth"],
    upvotes: 45,
    views: 356,
    author: "Sofia Ruiz",
    authorRole: "Account Executive",
    createdAt: "2026-02-20",
    updatedAt: "2026-04-06",
    resolution: "Score accounts on 5 expansion signals and prioritize the top 20% for active outreach",
    resolutionSteps: [
      "Signal 1: Health score above 85 for 3+ consecutive months (strong satisfaction)",
      "Signal 2: Usage approaching plan limits (natural upgrade trigger)",
      "Signal 3: Champion mentions future needs or growth plans in conversations",
      "Signal 4: Recent positive CSAT scores or NPS responses",
      "Signal 5: No open support tickets and low recent escalation history",
      "Score each signal 1-5 and rank accounts by total score",
      "For top 20%: Schedule 'strategic planning' calls (not sales calls) within 2 weeks",
      "Prepare account-specific expansion proposals with ROI projections before each call"
    ],
    relatedTickets: [],
    difficulty: "Intermediate",
  },
  {
    id: "KB-009",
    title: "CSAT Drop Response Protocol — Turning Detractors into Promoters",
    summary: "Rapid response protocol for when CSAT scores drop below threshold. Includes root cause analysis framework, communication templates, and recovery metrics.",
    content: "A sudden CSAT drop is a leading indicator of churn risk. This protocol ensures rapid response within 24 hours and structured recovery within 14 days.",
    category: "Customer Success",
    platform: "All",
    role: "Account Manager",
    tags: ["csat", "detractors", "recovery", "customer-success", "retention"],
    upvotes: 41,
    views: 289,
    author: "Marcus Lin",
    authorRole: "Senior Account Manager",
    createdAt: "2026-03-05",
    updatedAt: "2026-04-09",
    resolution: "Execute the 24-hour acknowledgment → 7-day action → 14-day verification cycle",
    resolutionSteps: [
      "Within 4 hours: Review the CSAT response and identify the specific complaint or concern",
      "Within 24 hours: Send personalized acknowledgment email (not automated) to the respondent",
      "Day 1-3: Conduct root cause analysis — is it product, support, relationship, or expectation?",
      "Day 3-5: Implement quick fixes for any immediately addressable issues",
      "Day 5-7: Schedule a call to discuss improvements made and gather additional feedback",
      "Day 7-14: Monitor for follow-up interactions and measure sentiment change",
      "Day 14: Send a brief follow-up survey to measure recovery (target: +2 points minimum)"
    ],
    relatedTickets: [],
    difficulty: "Beginner",
  },
  {
    id: "KB-010",
    title: "NetSuite Real-Time Dashboard Data Sync Issues",
    summary: "Troubleshooting guide for when custom dashboards don't reflect real-time inventory or financial data. Covers saved search refresh, SuiteScript timing, and cache invalidation.",
    content: "Real-time dashboard issues in NetSuite are typically caused by saved search caching, SuiteScript execution timing, or browser-level caching. This guide provides a systematic approach to diagnosis and resolution.",
    category: "Technical Support",
    platform: "NetSuite",
    role: "Support",
    tags: ["netsuite", "dashboard", "real-time", "sync", "inventory", "caching"],
    upvotes: 28,
    views: 176,
    author: "Sarah Chen",
    authorRole: "Senior Support Engineer",
    createdAt: "2026-03-18",
    updatedAt: "2026-04-07",
    resolution: "Clear saved search cache, adjust SuiteScript refresh intervals, and configure browser cache headers",
    resolutionSteps: [
      "Check if the dashboard uses Saved Searches — navigate to the search and verify 'Available as Dashboard' is checked",
      "Clear the saved search cache: Edit the search, make a minor change, save, then revert",
      "If using SuiteScript: Check the scheduled script frequency — increase to every 15 minutes minimum",
      "Verify the SuiteScript deployment status is 'Released' and not 'Testing'",
      "Check for browser caching: Add cache-busting parameters to any custom portlet URLs",
      "For SuiteAnalytics dashboards: Verify the data source refresh schedule in Analytics settings",
      "Test in an incognito browser window to rule out local caching issues"
    ],
    relatedTickets: ["T-1038"],
    difficulty: "Intermediate",
  },
];

const CATEGORIES = Array.from(new Set(KB_ARTICLES.map((a) => a.category)));
const PLATFORMS_KB = Array.from(new Set(KB_ARTICLES.map((a) => a.platform)));
const ROLES_KB = Array.from(new Set(KB_ARTICLES.map((a) => a.role)));
const DIFFICULTIES = ["Beginner", "Intermediate", "Advanced"];

const categoryIcons: Record<string, React.ElementType> = {
  "Technical Support": LifeBuoy,
  "Account Management": Shield,
  "Sales Strategy": TrendingUp,
  "Pipeline Management": Zap,
  "Customer Success": Star,
};

const difficultyColors: Record<string, string> = {
  Beginner: "text-emerald-700 bg-emerald-600/10 border-emerald-200",
  Intermediate: "text-amber-600 bg-amber-500/10 border-amber-200",
  Advanced: "text-red-600 bg-red-500/10 border-red-200",
};

const KB_FIELDS: FieldSpec[] = [
  { key: "title", label: "Title", full: true, required: true },
  { key: "summary", label: "Summary", type: "textarea", required: true },
  { key: "category", label: "Category" },
  { key: "platform", label: "Platform", type: "select", options: ["All", "NetSuite", "Salesforce", "HubSpot"] },
  { key: "role", label: "Role", type: "select", options: ["Support", "Account Manager", "Sales", "Manager"] },
  { key: "difficulty", label: "Difficulty", type: "select", options: ["Beginner", "Intermediate", "Advanced"] },
  { key: "tags", label: "Tags", type: "list" },
  { key: "resolution", label: "Resolution", type: "textarea" },
  { key: "resolutionSteps", label: "Resolution steps", type: "list" },
];

/* ── Main Component ─────────────────────────────────────────── */
export default function KnowledgeBaseView() {
  const { can } = useAuth();
  const canEdit = can("edit");
  const canDelete = can("delete");
  const { items: articles, upsert, remove } = useCollection<KBArticle>("kb_articles", KB_ARTICLES as KBArticle[], (a) => a.id);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<KBArticle | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [platformFilter, setPlatformFilter] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"upvotes" | "views" | "recent">("upvotes");
  const [selectedArticle, setSelectedArticle] = useState<KBArticle | null>(null);
  const [userVotes, setUserVotes] = useState<Set<string>>(new Set());
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  const filteredArticles = useMemo(() => {
    let results = articles;

    if (search.trim()) {
      const q = search.toLowerCase();
      results = results.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.summary.toLowerCase().includes(q) ||
          a.tags.some((t) => t.includes(q)) ||
          a.resolution.toLowerCase().includes(q) ||
          a.platform.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q)
      );
    }

    if (categoryFilter) results = results.filter((a) => a.category === categoryFilter);
    if (platformFilter) results = results.filter((a) => a.platform === platformFilter);
    if (roleFilter) results = results.filter((a) => a.role === roleFilter);

    results = [...results].sort((a, b) => {
      if (sortBy === "upvotes") return b.upvotes - a.upvotes;
      if (sortBy === "views") return b.views - a.views;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    return results;
  }, [articles, search, categoryFilter, platformFilter, roleFilter, sortBy]);

  const hasFilters = categoryFilter || platformFilter || roleFilter;

  const handleVote = useCallback((id: string) => {
    setUserVotes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleBookmark = useCallback((id: string) => {
    setBookmarks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleCopyResolution = useCallback((article: KBArticle) => {
    const text = `${article.title}\n\nResolution: ${article.resolution}\n\nSteps:\n${article.resolutionSteps.map((s, i) => `${i + 1}. ${s}`).join("\n")}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  /* ── Article Detail View ──────────────────────────────────── */
  if (selectedArticle) {
    const a = selectedArticle;
    const CatIcon = categoryIcons[a.category] || BookOpen;
    const voted = userVotes.has(a.id);
    const bookmarked = bookmarks.has(a.id);

    return (
      <div className="space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-3">
          <button
            onClick={() => setSelectedArticle(null)}
            className="mt-1 w-8 h-8 rounded-lg border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-muted-foreground/40 transition-all shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] tracking-[0.1em] text-muted-foreground font-mono">{a.id}</span>
              <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium", difficultyColors[a.difficulty])}>{a.difficulty}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full border border-border text-muted-foreground">{a.platform}</span>
            </div>
            <h2 className="text-xl font-bold text-foreground leading-tight">{a.title}</h2>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{a.summary}</p>
          </div>
        </motion.div>

        {/* Meta bar */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="flex items-center gap-4 flex-wrap">
          <button
            onClick={() => handleVote(a.id)}
            className={cn(
              "flex items-center gap-1.5 h-8 px-3 rounded-lg border text-xs font-medium transition-all",
              voted
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-muted-foreground/40"
            )}
          >
            <ThumbsUp className="w-3.5 h-3.5" />
            {a.upvotes + (voted ? 1 : 0)}
          </button>
          <button
            onClick={() => handleBookmark(a.id)}
            className={cn(
              "flex items-center gap-1.5 h-8 px-3 rounded-lg border text-xs font-medium transition-all",
              bookmarked
                ? "border-amber-400/40 bg-amber-500/10 text-amber-600"
                : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-muted-foreground/40"
            )}
          >
            {bookmarked ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
            {bookmarked ? "Saved" : "Save"}
          </button>
          <button
            onClick={() => handleCopyResolution(a)}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border bg-card text-xs font-medium text-muted-foreground hover:text-foreground hover:border-muted-foreground/40 transition-all"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy Resolution"}
          </button>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground/60 ml-auto">
            <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{a.views} views</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Updated {a.updatedAt}</span>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* Main content */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-5">
            {/* Context */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-xs tracking-[0.1em] uppercase text-muted-foreground font-medium mb-3">Context</h3>
              <p className="text-sm text-foreground/80 leading-relaxed">{a.content}</p>
            </div>

            {/* Resolution */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-600/[0.03] p-5">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <h3 className="text-xs tracking-[0.1em] uppercase text-emerald-700 font-medium">Resolution</h3>
                <div className="ml-auto flex items-center gap-1 text-[10px] text-emerald-700/60">
                  <Award className="w-3 h-3" />
                  Highest Scored
                </div>
              </div>
              <p className="text-sm text-foreground font-medium mb-4">{a.resolution}</p>
              <div className="space-y-3">
                {a.resolutionSteps.map((step, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 + i * 0.04 }}
                    className="flex gap-3"
                  >
                    <div className="w-6 h-6 rounded-full bg-emerald-600/10 border border-emerald-200 flex items-center justify-center text-[10px] font-bold text-emerald-700 shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <p className="text-[12px] text-foreground/80 leading-relaxed pt-1">{step}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Sidebar info */}
          <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }} className="space-y-4">
            {/* Author */}
            <div className="rounded-xl border border-border bg-card p-4">
              <h4 className="text-[10px] tracking-[0.1em] uppercase text-muted-foreground font-medium mb-3">Author</h4>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-foreground text-xs font-bold">
                  {a.author.split(" ").map((n) => n[0]).join("")}
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">{a.author}</div>
                  <div className="text-[11px] text-muted-foreground">{a.authorRole}</div>
                </div>
              </div>
            </div>

            {/* Category & Tags */}
            <div className="rounded-xl border border-border bg-card p-4">
              <h4 className="text-[10px] tracking-[0.1em] uppercase text-muted-foreground font-medium mb-3">Details</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CatIcon className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-foreground">{a.category}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-foreground">{a.role}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-foreground">{a.platform}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-4">
                {a.tags.map((tag) => (
                  <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-muted/40 text-muted-foreground border border-border/60">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Related Tickets */}
            {a.relatedTickets.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-4">
                <h4 className="text-[10px] tracking-[0.1em] uppercase text-muted-foreground font-medium mb-3">Related Tickets</h4>
                <div className="space-y-2">
                  {a.relatedTickets.map((t) => (
                    <div key={t} className="flex items-center gap-2 text-xs">
                      <span className="text-primary font-mono">{t}</span>
                      <span className="text-muted-foreground/40">·</span>
                      <span className="text-muted-foreground text-[11px]">Linked</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  /* ── List View ────────────────────────────────────────────── */
  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400/20 to-orange-400/10 border border-amber-200 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Knowledge Base</h2>
            <p className="text-xs text-muted-foreground">{articles.length} articles · Search past issues and top-scored resolutions</p>
          </div>
          {canEdit && (
            <button onClick={() => { setEditing(null); setFormOpen(true); }} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90">
              <Plus className="w-3.5 h-3.5" /> Add Article
            </button>
          )}
        </div>
      </motion.div>

      {/* Search + Filters */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="space-y-3">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search articles, resolutions, tags, platforms..."
            className="w-full h-11 pl-10 pr-10 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Filter chips + Sort */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Category */}
          <FilterDropdown label="Category" options={CATEGORIES} value={categoryFilter} onChange={setCategoryFilter} />
          {/* Platform */}
          <FilterDropdown label="Platform" options={PLATFORMS_KB} value={platformFilter} onChange={setPlatformFilter} />
          {/* Role */}
          <FilterDropdown label="Role" options={ROLES_KB} value={roleFilter} onChange={setRoleFilter} />

          {hasFilters && (
            <button
              onClick={() => { setCategoryFilter(null); setPlatformFilter(null); setRoleFilter(null); }}
              className="flex items-center gap-1 h-8 px-2.5 rounded-lg text-[11px] text-red-600 hover:bg-red-500/10 transition-colors"
            >
              <X className="w-3 h-3" />
              Reset
            </button>
          )}

          <div className="ml-auto flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground/50 mr-1">Sort:</span>
            {(["upvotes", "views", "recent"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={cn(
                  "h-7 px-2.5 rounded-md text-[10px] font-medium transition-all border",
                  sortBy === s
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {s === "upvotes" ? "Top Rated" : s === "views" ? "Most Viewed" : "Recent"}
              </button>
            ))}
          </div>
        </div>

        {/* Results count */}
        <div className="text-[11px] text-muted-foreground/50">
          Showing {filteredArticles.length} of {articles.length} articles
        </div>
      </motion.div>

      {/* Article list */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {filteredArticles.map((article, i) => {
            const CatIcon = categoryIcons[article.category] || BookOpen;
            const voted = userVotes.has(article.id);
            const bookmarked = bookmarks.has(article.id);

            return (
              <motion.div
                key={article.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ delay: i * 0.03 }}
              >
                <button
                  onClick={() => setSelectedArticle(article)}
                  className="w-full text-left rounded-xl border border-border bg-card p-5 hover:border-primary/30 hover:bg-primary/[0.02] transition-all group"
                >
                  <div className="flex gap-4">
                    {/* Vote column */}
                    <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                      <div
                        onClick={(e) => { e.stopPropagation(); handleVote(article.id); }}
                        className={cn(
                          "w-10 h-10 rounded-lg flex flex-col items-center justify-center border transition-all cursor-pointer",
                          voted
                            ? "border-primary/40 bg-primary/10 text-primary"
                            : "border-border bg-card/50 text-muted-foreground hover:border-primary/30 hover:text-primary"
                        )}
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold mt-0.5">{article.upvotes + (voted ? 1 : 0)}</span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-[10px] font-mono text-muted-foreground/50">{article.id}</span>
                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-medium", difficultyColors[article.difficulty])}>
                          {article.difficulty}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded border border-border text-muted-foreground">
                          {article.platform}
                        </span>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground/40 ml-auto">
                          <CatIcon className="w-3 h-3" />
                          <span>{article.category}</span>
                        </div>
                      </div>

                      <h3 className="text-sm font-semibold text-foreground group-hover:text-foreground transition-colors leading-snug">
                        {article.title}
                      </h3>
                      <p className="text-[11px] text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
                        {article.summary}
                      </p>

                      {/* Resolution preview */}
                      <div className="mt-3 flex items-start gap-2 rounded-lg bg-emerald-600/[0.04] border border-emerald-400/10 px-3 py-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                        <span className="text-[11px] text-emerald-700/80 line-clamp-1">{article.resolution}</span>
                      </div>

                      {/* Footer */}
                      <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground/40">
                        <span className="flex items-center gap-1"><User className="w-3 h-3" />{article.author}</span>
                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{article.views}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{article.updatedAt}</span>
                        <div className="flex items-center gap-1 ml-auto">
                          {article.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="px-1.5 py-0.5 rounded bg-muted/30 text-muted-foreground/50 border border-border/40">
                              {tag}
                            </span>
                          ))}
                          {article.tags.length > 3 && (
                            <span className="text-muted-foreground/30">+{article.tags.length - 3}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bookmark + Edit/Delete + Arrow */}
                    <div className="flex flex-col items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1">
                        {canEdit && (
                          <span role="button" onClick={(e) => { e.stopPropagation(); setEditing(article); setFormOpen(true); }} title="Edit" className="p-1 rounded hover:bg-primary/10 cursor-pointer">
                            <Pencil className="w-3.5 h-3.5 text-primary" />
                          </span>
                        )}
                        {canDelete && (
                          <span role="button" onClick={(e) => { e.stopPropagation(); if (confirm("Delete article?")) remove(article.id); }} title="Delete" className="p-1 rounded hover:bg-red-500/10 cursor-pointer">
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          </span>
                        )}
                      </div>
                      <div
                        onClick={(e) => { e.stopPropagation(); handleBookmark(article.id); }}
                        className="cursor-pointer p-1 rounded hover:bg-muted/30 transition-colors"
                      >
                        {bookmarked ? (
                          <BookmarkCheck className="w-4 h-4 text-amber-600" />
                        ) : (
                          <Bookmark className="w-4 h-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/20 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filteredArticles.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-14 h-14 rounded-2xl bg-muted/30 flex items-center justify-center">
              <Search className="w-6 h-6 text-muted-foreground/30" />
            </div>
            <p className="text-sm text-muted-foreground">No articles match your search</p>
            <p className="text-[11px] text-muted-foreground/50">Try different keywords or clear your filters</p>
          </motion.div>
        )}
      </div>

      <RecordFormDialog<KBArticle>
        open={formOpen}
        title={editing ? "Edit Article" : "Add Article"}
        fields={KB_FIELDS}
        record={editing}
        defaults={{ platform: "All", role: "Support", difficulty: "Beginner", tags: [], resolutionSteps: [], upvotes: 0, views: 0, author: "You", authorRole: "Editor", content: "", relatedTickets: [], createdAt: "2026-06-11", updatedAt: "2026-06-11" }}
        onClose={() => setFormOpen(false)}
        onSubmit={(rec) => { if (!rec.id) rec.id = `KB-${Date.now() % 100000}`; upsert(rec, editing ? editing.id : undefined); }}
      />
    </div>
  );
}

/* ── Filter Dropdown Component ──────────────────────────────── */
function FilterDropdown({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-1.5 h-8 px-3 rounded-lg border text-[11px] font-medium transition-all",
          value
            ? "border-primary/30 bg-primary/10 text-primary"
            : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-muted-foreground/40"
        )}
      >
        <Filter className="w-3 h-3" />
        {value || label}
        {value && (
          <span
            onClick={(e) => { e.stopPropagation(); onChange(null); setOpen(false); }}
            className="ml-1 w-3.5 h-3.5 rounded-full bg-primary/20 flex items-center justify-center hover:bg-primary/40 transition-colors"
          >
            <X className="w-2 h-2" />
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.12 }}
              className="absolute top-full left-0 mt-1 z-40 w-48 rounded-xl border border-border bg-card shadow-xl shadow-black/10 py-1 overflow-hidden"
            >
              {options.map((opt) => (
                <button
                  key={opt}
                  onClick={() => { onChange(opt === value ? null : opt); setOpen(false); }}
                  className={cn(
                    "w-full text-left px-3 py-2 text-xs transition-colors",
                    opt === value
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                  )}
                >
                  {opt}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
