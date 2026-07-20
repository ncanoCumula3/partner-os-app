/*
 * GlobalSearch — unified command palette + search
 * 
 * Two modes:
 *   1. SEARCH mode (default) — searches accounts, contacts, tickets, etc.
 *   2. COMMAND mode (type ">") — execute actions like create ticket, add contact, navigate
 *
 * Keyboard: ↑↓ navigate, Enter select, Esc close/back, Cmd+K open
 */
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, X, Building2, User, LifeBuoy, Receipt, Send,
  BookOpen, ArrowRight, CornerDownLeft, ChevronUp, ChevronDown,
  Command, Plus, Navigation, Zap, FileText, UserPlus, TicketPlus,
  StickyNote, MessageSquare, Bot, LayoutDashboard, TrendingUp,
  Star, Shield, Timer, Plug, Library, ChevronRight, Check,
  AlertCircle,
} from "lucide-react";
import {
  ACCOUNTS, TICKETS, INVOICES, OUTREACH, PLAYBOOKS,
  tierColors, priorityColors, statusColors,
} from "@/lib/data";
import type { NavId } from "@/lib/data";
import { toast } from "sonner";

/* ═══════════════════════════════════════════════════════════
   SEARCH INDEX (same as before)
   ═══════════════════════════════════════════════════════════ */
interface SearchResult {
  id: string;
  category: "account" | "contact" | "ticket" | "invoice" | "outreach" | "playbook";
  title: string;
  subtitle: string;
  badge?: string;
  badgeClass?: string;
  navTarget: NavId;
}

function buildIndex(): SearchResult[] {
  const results: SearchResult[] = [];
  ACCOUNTS.forEach((a) => {
    results.push({
      id: `acc-${a.id}`, category: "account", title: a.name,
      subtitle: `${a.platform} · ${a.tier} · Health ${a.health} · $${(a.arr / 1000).toFixed(0)}K ARR`,
      badge: a.stage,
      badgeClass: a.stage === "At Risk" ? "text-red-700 bg-red-50" : a.stage === "Expansion" ? "text-emerald-700 bg-emerald-50" : "text-blue-700 bg-blue-50",
      navTarget: "accounts",
    });
    results.push({
      id: `contact-${a.id}`, category: "contact", title: a.contact,
      subtitle: `${a.name} · ${a.platform}`, badge: a.tier,
      badgeClass: tierColors[a.tier] || "", navTarget: "accounts",
    });
  });
  TICKETS.forEach((t) => {
    results.push({
      id: `ticket-${t.id}`, category: "ticket",
      title: `${t.id}: ${t.issue}`, subtitle: `${t.account} · ${t.platform} · ${t.age} old`,
      badge: t.priority, badgeClass: priorityColors[t.priority] || "", navTarget: "support",
    });
  });
  INVOICES.forEach((inv) => {
    results.push({
      id: `inv-${inv.inv}`, category: "invoice",
      title: `${inv.inv}: ${inv.account}`, subtitle: `${inv.amount} · Due ${inv.due}`,
      badge: inv.status, badgeClass: statusColors[inv.status] || "", navTarget: "ar",
    });
  });
  OUTREACH.forEach((o, i) => {
    results.push({
      id: `outreach-${i}`, category: "outreach",
      title: `${o.type}: ${o.account}`, subtitle: `${o.step} · Next: ${o.nextDate}`,
      badge: o.status, badgeClass: statusColors[o.status] || "", navTarget: "outreach",
    });
  });
  PLAYBOOKS.forEach((p, i) => {
    results.push({
      id: `playbook-${i}`, category: "playbook", title: p.title,
      subtitle: `${p.category} · ${p.platform} · ${p.steps} steps`, navTarget: "playbooks",
    });
  });
  return results;
}

const categoryMeta: Record<string, { label: string; Icon: React.ElementType; color: string }> = {
  account: { label: "Accounts", Icon: Building2, color: "text-primary" },
  contact: { label: "Contacts", Icon: User, color: "text-violet-500" },
  ticket: { label: "Tickets", Icon: LifeBuoy, color: "text-red-500" },
  invoice: { label: "Invoices", Icon: Receipt, color: "text-amber-600" },
  outreach: { label: "Outreach", Icon: Send, color: "text-emerald-600" },
  playbook: { label: "Playbooks", Icon: BookOpen, color: "text-blue-500" },
  note: { label: "Notes", Icon: StickyNote, color: "text-amber-500" },
};
const CATEGORY_ORDER = ["account", "contact", "ticket", "invoice", "outreach", "playbook", "note"];

/* ═══════════════════════════════════════════════════════════
   COMMAND DEFINITIONS
   ═══════════════════════════════════════════════════════════ */
interface CommandDef {
  id: string;
  group: "create" | "navigate" | "quick";
  label: string;
  description: string;
  Icon: React.ElementType;
  iconColor: string;
  action: "form" | "navigate" | "instant";
  navTarget?: NavId;
  formId?: string;
  shortcut?: string;
}

const COMMANDS: CommandDef[] = [
  // ── Create actions ──
  { id: "create-ticket", group: "create", label: "Create New Ticket", description: "Open a support ticket for an account",
    Icon: TicketPlus, iconColor: "text-red-500", action: "form", formId: "ticket" },
  { id: "add-contact", group: "create", label: "Add New Contact", description: "Add a contact to an existing account",
    Icon: UserPlus, iconColor: "text-violet-500", action: "form", formId: "contact" },
  { id: "create-note", group: "create", label: "Create Account Note", description: "Add a note or update to an account",
    Icon: StickyNote, iconColor: "text-amber-500", action: "form", formId: "note" },
  { id: "start-outreach", group: "create", label: "Start Outreach Sequence", description: "Begin a new email or call sequence",
    Icon: Send, iconColor: "text-emerald-500", action: "form", formId: "outreach" },
  { id: "log-activity", group: "create", label: "Log Activity", description: "Record a call, meeting, or email interaction",
    Icon: FileText, iconColor: "text-blue-500", action: "form", formId: "activity" },

  // ── Navigate actions ──
  { id: "nav-dashboard", group: "navigate", label: "Go to Dashboard", description: "Main overview",
    Icon: LayoutDashboard, iconColor: "text-primary", action: "navigate", navTarget: "dashboard" },
  { id: "nav-accounts", group: "navigate", label: "Go to Accounts", description: "Manage partner accounts",
    Icon: Building2, iconColor: "text-primary", action: "navigate", navTarget: "accounts" },
  { id: "nav-pipeline", group: "navigate", label: "Go to Pipeline", description: "View deal pipeline",
    Icon: TrendingUp, iconColor: "text-emerald-500", action: "navigate", navTarget: "pipeline" },
  { id: "nav-support", group: "navigate", label: "Go to Support", description: "View support tickets",
    Icon: LifeBuoy, iconColor: "text-red-500", action: "navigate", navTarget: "support" },
  { id: "nav-ai", group: "navigate", label: "Go to AI Assistant", description: "AI-powered tools",
    Icon: Bot, iconColor: "text-violet-500", action: "navigate", navTarget: "ai" },
  { id: "nav-chat", group: "navigate", label: "Go to Team Chat", description: "Internal collaboration",
    Icon: MessageSquare, iconColor: "text-blue-500", action: "navigate", navTarget: "chat" },
  { id: "nav-kb", group: "navigate", label: "Go to Knowledge Base", description: "Search best practices",
    Icon: Library, iconColor: "text-amber-600", action: "navigate", navTarget: "kb" },
  { id: "nav-sla", group: "navigate", label: "Go to SLA Tracker", description: "Monitor SLA deadlines",
    Icon: Timer, iconColor: "text-red-500", action: "navigate", navTarget: "sla-tracker" },
  { id: "nav-notes", group: "navigate", label: "Go to Notes", description: "Search all rep notes by account",
    Icon: StickyNote, iconColor: "text-amber-500", action: "navigate", navTarget: "notes" },
  { id: "nav-integrations", group: "navigate", label: "Go to Integrations", description: "Platform connections",
    Icon: Plug, iconColor: "text-emerald-600", action: "navigate", navTarget: "integrations" },

  // ── Quick actions ──
  { id: "quick-escalate", group: "quick", label: "Escalate Ticket", description: "Immediately escalate a critical ticket",
    Icon: AlertCircle, iconColor: "text-red-600", action: "instant", shortcut: "E" },
  { id: "quick-refresh", group: "quick", label: "Refresh SLA Timers", description: "Force refresh all SLA countdown timers",
    Icon: Timer, iconColor: "text-amber-500", action: "instant", shortcut: "R" },
];

const GROUP_META: Record<string, { label: string; Icon: React.ElementType }> = {
  create: { label: "Create", Icon: Plus },
  navigate: { label: "Navigate", Icon: Navigation },
  quick: { label: "Quick Actions", Icon: Zap },
};
const GROUP_ORDER = ["create", "navigate", "quick"];

/* ═══════════════════════════════════════════════════════════
   FORM DEFINITIONS
   ═══════════════════════════════════════════════════════════ */
interface FormField {
  name: string;
  label: string;
  type: "text" | "select" | "textarea";
  placeholder?: string;
  options?: string[];
  required?: boolean;
}

const FORM_DEFS: Record<string, { title: string; icon: React.ElementType; iconColor: string; fields: FormField[]; successMsg: string }> = {
  ticket: {
    title: "Create New Ticket",
    icon: TicketPlus,
    iconColor: "text-red-500",
    fields: [
      { name: "account", label: "Account", type: "select", options: ACCOUNTS.map((a) => a.name), required: true },
      { name: "priority", label: "Priority", type: "select", options: ["Critical", "High", "Medium", "Low"], required: true },
      { name: "issue", label: "Issue Description", type: "textarea", placeholder: "Describe the issue...", required: true },
      { name: "platform", label: "Platform", type: "select", options: ["NetSuite", "Salesforce", "HubSpot", "SAP", "Dynamics 365", "Zoho", "Other"] },
    ],
    successMsg: "Ticket created successfully",
  },
  contact: {
    title: "Add New Contact",
    icon: UserPlus,
    iconColor: "text-violet-500",
    fields: [
      { name: "name", label: "Full Name", type: "text", placeholder: "e.g. Jane Smith", required: true },
      { name: "email", label: "Email", type: "text", placeholder: "jane@company.com", required: true },
      { name: "phone", label: "Phone", type: "text", placeholder: "+1 (555) 000-0000" },
      { name: "account", label: "Account", type: "select", options: ACCOUNTS.map((a) => a.name), required: true },
      { name: "role", label: "Role", type: "text", placeholder: "e.g. VP of Operations" },
    ],
    successMsg: "Contact added successfully",
  },
  note: {
    title: "Create Account Note",
    icon: StickyNote,
    iconColor: "text-amber-500",
    fields: [
      { name: "account", label: "Account", type: "select", options: ACCOUNTS.map((a) => a.name), required: true },
      { name: "type", label: "Note Type", type: "select", options: ["General", "Meeting Summary", "Risk Flag", "Upsell Opportunity", "Action Item"] },
      { name: "content", label: "Note", type: "textarea", placeholder: "Write your note...", required: true },
    ],
    successMsg: "Note saved successfully",
  },
  outreach: {
    title: "Start Outreach Sequence",
    icon: Send,
    iconColor: "text-emerald-500",
    fields: [
      { name: "account", label: "Account", type: "select", options: ACCOUNTS.map((a) => a.name), required: true },
      { name: "type", label: "Sequence Type", type: "select", options: ["Upsell Sequence", "Re-engagement", "QBR Invite", "Health Check Follow-up", "Onboarding", "Custom"], required: true },
      { name: "channel", label: "Channel", type: "select", options: ["Email", "Phone", "Email + Phone", "LinkedIn"] },
      { name: "notes", label: "Notes", type: "textarea", placeholder: "Any additional context..." },
    ],
    successMsg: "Outreach sequence started",
  },
  activity: {
    title: "Log Activity",
    icon: FileText,
    iconColor: "text-blue-500",
    fields: [
      { name: "account", label: "Account", type: "select", options: ACCOUNTS.map((a) => a.name), required: true },
      { name: "type", label: "Activity Type", type: "select", options: ["Call", "Meeting", "Email", "Demo", "QBR", "Escalation", "Other"], required: true },
      { name: "contact", label: "Contact", type: "text", placeholder: "Who did you interact with?" },
      { name: "summary", label: "Summary", type: "textarea", placeholder: "Brief summary of the interaction...", required: true },
      { name: "followUp", label: "Follow-up Action", type: "text", placeholder: "Next step or follow-up..." },
    ],
    successMsg: "Activity logged successfully",
  },
};

/* ═══════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════ */
interface GlobalSearchProps {
  onNavigate: (id: NavId) => void;
}

export default function GlobalSearch({ onNavigate }: GlobalSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeForm, setActiveForm] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [formSubmitting, setFormSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const index = useMemo(() => buildIndex(), []);

  const isCommandMode = query.startsWith(">");
  const searchQuery = isCommandMode ? "" : query;
  const commandQuery = isCommandMode ? query.slice(1).trim().toLowerCase() : "";

  /* ── Search results ── */
  const results = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return index.filter(
      (r) => r.title.toLowerCase().includes(q) || r.subtitle.toLowerCase().includes(q) || (r.badge && r.badge.toLowerCase().includes(q))
    );
  }, [searchQuery, index]);

  const grouped = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {};
    results.forEach((r) => { if (!groups[r.category]) groups[r.category] = []; groups[r.category].push(r); });
    const sorted: { category: string; items: SearchResult[] }[] = [];
    CATEGORY_ORDER.forEach((cat) => { if (groups[cat]) sorted.push({ category: cat, items: groups[cat].slice(0, 5) }); });
    return sorted;
  }, [results]);

  const flatSearchResults = useMemo(() => grouped.flatMap((g) => g.items), [grouped]);

  /* ── Command results ── */
  const filteredCommands = useMemo(() => {
    if (!isCommandMode) return [];
    if (!commandQuery) return COMMANDS;
    const words = commandQuery.split(/\s+/).filter(Boolean);
    return COMMANDS.filter(
      (c) => words.every((w) => c.label.toLowerCase().includes(w) || c.description.toLowerCase().includes(w))
    );
  }, [isCommandMode, commandQuery]);

  const groupedCommands = useMemo(() => {
    const groups: Record<string, CommandDef[]> = {};
    filteredCommands.forEach((c) => { if (!groups[c.group]) groups[c.group] = []; groups[c.group].push(c); });
    const sorted: { group: string; items: CommandDef[] }[] = [];
    GROUP_ORDER.forEach((g) => { if (groups[g]) sorted.push({ group: g, items: groups[g] }); });
    return sorted;
  }, [filteredCommands]);

  const flatCommands = useMemo(() => groupedCommands.flatMap((g) => g.items), [groupedCommands]);

  /* ── Current flat list for keyboard nav ── */
  const flatItems = isCommandMode ? flatCommands : flatSearchResults;

  /* ── Keyboard shortcut ── */
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setOpen(true); }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (open) { setTimeout(() => inputRef.current?.focus(), 50); }
    else { setQuery(""); setActiveIndex(0); setActiveForm(null); setFormData({}); }
  }, [open]);

  useEffect(() => { setActiveIndex(0); }, [query]);

  useEffect(() => {
    if (listRef.current) {
      const el = listRef.current.querySelector(`[data-index="${activeIndex}"]`);
      if (el) el.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  const handleSearchSelect = useCallback((result: SearchResult) => {
    onNavigate(result.navTarget);
    setOpen(false);
  }, [onNavigate]);

  const handleCommandSelect = useCallback((cmd: CommandDef) => {
    if (cmd.action === "navigate" && cmd.navTarget) {
      onNavigate(cmd.navTarget);
      setOpen(false);
    } else if (cmd.action === "form" && cmd.formId) {
      setActiveForm(cmd.formId);
      setFormData({});
    } else if (cmd.action === "instant") {
      toast.success(`${cmd.label} executed`, { description: cmd.description });
      setOpen(false);
    }
  }, [onNavigate]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (activeForm) {
      if (e.key === "Escape") { e.preventDefault(); setActiveForm(null); setFormData({}); }
      return;
    }
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, flatItems.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && flatItems[activeIndex]) {
      e.preventDefault();
      if (isCommandMode) handleCommandSelect(flatItems[activeIndex] as CommandDef);
      else handleSearchSelect(flatItems[activeIndex] as SearchResult);
    } else if (e.key === "Escape") { setOpen(false); }
  }, [flatItems, activeIndex, isCommandMode, handleCommandSelect, handleSearchSelect, activeForm]);

  const handleFormSubmit = useCallback(() => {
    if (!activeForm) return;
    const def = FORM_DEFS[activeForm];
    const missing = def.fields.filter((f) => f.required && !formData[f.name]?.trim());
    if (missing.length > 0) {
      toast.error("Please fill in all required fields", { description: missing.map((f) => f.label).join(", ") });
      return;
    }
    setFormSubmitting(true);
    setTimeout(() => {
      toast.success(def.successMsg, {
        description: Object.entries(formData).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).slice(0, 2).join(" · "),
      });
      setFormSubmitting(false);
      setOpen(false);
    }, 600);
  }, [activeForm, formData]);

  /* ── Render counters ── */
  let flatIdx = -1;
  let cmdFlatIdx = -1;

  return (
    <>
      {/* Trigger */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-1.5 max-w-xs w-full hover:border-primary/30 hover:shadow-sm transition-all group"
      >
        <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
        <span className="text-xs text-muted-foreground truncate flex-1 text-left">
          Search or type &gt; for commands...
        </span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] text-muted-foreground/60 bg-muted px-1.5 py-0.5 rounded font-mono">
          <Command className="w-2.5 h-2.5" />K
        </kbd>
      </button>

      {/* Modal */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }} className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
              onClick={() => setOpen(false)} />

            <motion.div initial={{ opacity: 0, scale: 0.96, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -10 }} transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed z-50 top-[10%] left-1/2 -translate-x-1/2 w-full max-w-xl">

              <div className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden">

                {/* ── Form view ── */}
                {activeForm && FORM_DEFS[activeForm] ? (
                  <FormPanel
                    def={FORM_DEFS[activeForm]}
                    formData={formData}
                    setFormData={setFormData}
                    onSubmit={handleFormSubmit}
                    onBack={() => { setActiveForm(null); setFormData({}); }}
                    submitting={formSubmitting}
                  />
                ) : (
                  <>
                    {/* ── Search / Command input ── */}
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                      {isCommandMode ? (
                        <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                      ) : (
                        <Search className="w-4 h-4 text-primary shrink-0" />
                      )}
                      <input ref={inputRef} type="text" value={query}
                        onChange={(e) => setQuery(e.target.value)} onKeyDown={handleKeyDown}
                        placeholder={isCommandMode ? "Type a command..." : "Search or type > for commands..."}
                        className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none" />
                      {query && (
                        <button onClick={() => { setQuery(""); inputRef.current?.focus(); }}
                          className="text-muted-foreground hover:text-foreground transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                      <kbd onClick={() => setOpen(false)}
                        className="text-[10px] text-muted-foreground/60 bg-muted px-1.5 py-0.5 rounded font-mono cursor-pointer hover:bg-muted/80">
                        ESC
                      </kbd>
                    </div>

                    {/* ── Mode indicator ── */}
                    {isCommandMode && (
                      <div className="flex items-center gap-2 px-4 py-1.5 bg-amber-50 border-b border-amber-100">
                        <Zap className="w-3 h-3 text-amber-600" />
                        <span className="text-[11px] font-medium text-amber-700">Command Mode</span>
                        <span className="text-[10px] text-amber-500">— execute actions directly</span>
                      </div>
                    )}

                    {/* ── Results area ── */}
                    <div ref={listRef} className="max-h-[400px] overflow-auto">

                      {/* Empty state — no query */}
                      {!query && (
                        <div className="px-4 py-5">
                          <p className="text-sm text-muted-foreground mb-3">Start typing to search, or type <kbd className="text-[11px] font-mono bg-muted px-1.5 py-0.5 rounded mx-0.5">&gt;</kbd> for commands</p>
                          <div className="flex flex-wrap gap-2 mb-4">
                            {["Apex", "BlueWave", "T-1041", "Gold", "Overdue"].map((h) => (
                              <button key={h} onClick={() => setQuery(h)}
                                className="text-[11px] text-muted-foreground bg-muted hover:bg-accent px-2 py-1 rounded-md transition-colors">{h}</button>
                            ))}
                          </div>
                          <div className="border-t border-border pt-3">
                            <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-semibold mb-2">Quick Commands</p>
                            <div className="flex flex-wrap gap-2">
                              {[
                                { label: "Create Ticket", formId: "ticket" },
                                { label: "Add Contact", formId: "contact" },
                                { label: "Log Activity", formId: "activity" },
                                { label: "Go to Dashboard", navTarget: "dashboard" as NavId },
                              ].map((c) => (
                                <button key={c.label} onClick={() => {
                                  if (c.formId) { setActiveForm(c.formId); setFormData({}); }
                                  else if (c.navTarget) { onNavigate(c.navTarget); setOpen(false); }
                                }}
                                  className="flex items-center gap-1.5 text-[11px] text-primary/80 bg-primary/5 hover:bg-primary/10 border border-primary/10 px-2.5 py-1 rounded-md transition-colors">
                                  <ChevronRight className="w-3 h-3" />{c.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Search: no results */}
                      {!isCommandMode && searchQuery && grouped.length === 0 && (
                        <div className="px-4 py-8 text-center">
                          <Search className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">No results for "<span className="text-foreground font-medium">{searchQuery}</span>"</p>
                          <p className="text-xs text-muted-foreground/60 mt-1">Try typing <kbd className="font-mono bg-muted px-1 rounded">&gt;</kbd> to run a command instead</p>
                        </div>
                      )}

                      {/* Command: no results */}
                      {isCommandMode && filteredCommands.length === 0 && (
                        <div className="px-4 py-8 text-center">
                          <Zap className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">No commands matching "<span className="text-foreground font-medium">{commandQuery}</span>"</p>
                        </div>
                      )}

                      {/* Search results */}
                      {!isCommandMode && grouped.map((group) => {
                        const meta = categoryMeta[group.category];
                        return (
                          <div key={group.category} className="py-1">
                            <div className="flex items-center gap-2 px-4 py-1.5">
                              <meta.Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                              <span className="text-[10px] tracking-[0.08em] text-muted-foreground font-semibold uppercase">{meta.label}</span>
                              <span className="text-[10px] text-muted-foreground/50">({group.items.length})</span>
                            </div>
                            {group.items.map((item) => {
                              flatIdx++;
                              const isActive = flatIdx === activeIndex;
                              const ci = flatIdx;
                              return (
                                <button key={item.id} data-index={ci} onClick={() => handleSearchSelect(item)}
                                  onMouseEnter={() => setActiveIndex(ci)}
                                  className={`flex items-center gap-3 w-full text-left px-4 py-2.5 transition-colors ${isActive ? "bg-primary/8 border-l-2 border-primary" : "border-l-2 border-transparent hover:bg-accent/50"}`}>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className={`text-[13px] font-medium truncate ${isActive ? "text-primary" : "text-foreground"}`}>{highlightMatch(item.title, searchQuery)}</span>
                                      {item.badge && <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${item.badgeClass}`}>{item.badge}</span>}
                                    </div>
                                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">{highlightMatch(item.subtitle, searchQuery)}</p>
                                  </div>
                                  <ArrowRight className={`w-3.5 h-3.5 shrink-0 transition-colors ${isActive ? "text-primary" : "text-muted-foreground/0"}`} />
                                </button>
                              );
                            })}
                          </div>
                        );
                      })}

                      {/* Command results */}
                      {isCommandMode && groupedCommands.map((group) => {
                        const gm = GROUP_META[group.group];
                        return (
                          <div key={group.group} className="py-1">
                            <div className="flex items-center gap-2 px-4 py-1.5">
                              <gm.Icon className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-[10px] tracking-[0.08em] text-muted-foreground font-semibold uppercase">{gm.label}</span>
                            </div>
                            {group.items.map((cmd) => {
                              cmdFlatIdx++;
                              const isActive = cmdFlatIdx === activeIndex;
                              const ci = cmdFlatIdx;
                              return (
                                <button key={cmd.id} data-index={ci} onClick={() => handleCommandSelect(cmd)}
                                  onMouseEnter={() => setActiveIndex(ci)}
                                  className={`flex items-center gap-3 w-full text-left px-4 py-2.5 transition-colors ${isActive ? "bg-primary/8 border-l-2 border-primary" : "border-l-2 border-transparent hover:bg-accent/50"}`}>
                                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isActive ? "bg-primary/10" : "bg-muted"}`}>
                                    <cmd.Icon className={`w-3.5 h-3.5 ${cmd.iconColor}`} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <span className={`text-[13px] font-medium ${isActive ? "text-primary" : "text-foreground"}`}>{cmd.label}</span>
                                    <p className="text-[11px] text-muted-foreground truncate">{cmd.description}</p>
                                  </div>
                                  {cmd.action === "form" && <span className="text-[9px] text-muted-foreground/50 bg-muted px-1.5 py-0.5 rounded">Form</span>}
                                  {cmd.action === "navigate" && <ArrowRight className={`w-3.5 h-3.5 ${isActive ? "text-primary" : "text-muted-foreground/30"}`} />}
                                  {cmd.shortcut && <kbd className="text-[10px] text-muted-foreground/50 bg-muted px-1.5 py-0.5 rounded font-mono">{cmd.shortcut}</kbd>}
                                </button>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>

                    {/* Footer */}
                    {((!isCommandMode && searchQuery && grouped.length > 0) || (isCommandMode && filteredCommands.length > 0)) && (
                      <div className="flex items-center gap-4 px-4 py-2 border-t border-border bg-muted/30">
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
                          <ChevronUp className="w-3 h-3" /><ChevronDown className="w-3 h-3" /><span>Navigate</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
                          <CornerDownLeft className="w-3 h-3" /><span>Select</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
                          <span className="font-mono">ESC</span><span>Close</span>
                        </div>
                        <div className="flex-1" />
                        <span className="text-[10px] text-muted-foreground/50">
                          {isCommandMode ? `${filteredCommands.length} command${filteredCommands.length !== 1 ? "s" : ""}` : `${flatSearchResults.length} result${flatSearchResults.length !== 1 ? "s" : ""}`}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   FORM PANEL — inline form inside the command palette
   ═══════════════════════════════════════════════════════════ */
interface FormPanelProps {
  def: typeof FORM_DEFS[string];
  formData: Record<string, string>;
  setFormData: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onSubmit: () => void;
  onBack: () => void;
  submitting: boolean;
}

function FormPanel({ def, formData, setFormData, onSubmit, onBack, submitting }: FormPanelProps) {
  const IconComp = def.icon;
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.15 }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded hover:bg-muted">
          <ChevronUp className="w-4 h-4 -rotate-90" />
        </button>
        <IconComp className={`w-4 h-4 ${def.iconColor}`} />
        <span className="text-sm font-semibold text-foreground">{def.title}</span>
        <div className="flex-1" />
        <kbd onClick={onBack}
          className="text-[10px] text-muted-foreground/60 bg-muted px-1.5 py-0.5 rounded font-mono cursor-pointer hover:bg-muted/80">
          ESC
        </kbd>
      </div>

      {/* Fields */}
      <div className="px-4 py-4 space-y-3 max-h-[380px] overflow-auto">
        {def.fields.map((field) => (
          <div key={field.name}>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
              {field.label}{field.required && <span className="text-red-500 ml-0.5">*</span>}
            </label>
            {field.type === "select" ? (
              <select
                value={formData[field.name] || ""}
                onChange={(e) => setFormData((d) => ({ ...d, [field.name]: e.target.value }))}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
              >
                <option value="">Select...</option>
                {field.options?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            ) : field.type === "textarea" ? (
              <textarea
                value={formData[field.name] || ""}
                onChange={(e) => setFormData((d) => ({ ...d, [field.name]: e.target.value }))}
                placeholder={field.placeholder}
                rows={3}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all resize-none"
              />
            ) : (
              <input
                type="text"
                value={formData[field.name] || ""}
                onChange={(e) => setFormData((d) => ({ ...d, [field.name]: e.target.value }))}
                placeholder={field.placeholder}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
              />
            )}
          </div>
        ))}
      </div>

      {/* Submit */}
      <div className="flex items-center gap-3 px-4 py-3 border-t border-border bg-muted/30">
        <button onClick={onBack}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-muted">
          Cancel
        </button>
        <div className="flex-1" />
        <button onClick={onSubmit} disabled={submitting}
          className="flex items-center gap-2 text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-50 px-4 py-2 rounded-lg transition-all shadow-sm">
          {submitting ? (
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full" />
          ) : (
            <Check className="w-3.5 h-3.5" />
          )}
          {submitting ? "Saving..." : "Submit"}
        </button>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════ */
function highlightMatch(text: string, query: string) {
  if (!query.trim()) return text;
  const regex = new RegExp(`(${escapeRegex(query)})`, "gi");
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <span key={i} className="text-primary font-semibold bg-primary/10 rounded-sm px-0.5">{part}</span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
