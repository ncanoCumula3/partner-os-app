/*
 * NotesView — searchable notes hub with account & section filtering
 * All rep notes across Pipeline, Support, Outreach, CSAT, AR, and Playbooks
 * are aggregated here and searchable by account, content, author, or type.
 */
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNotes, type NoteSection } from "@/contexts/NotesContext";
import { ACCOUNTS } from "@/lib/data";
import type { NavId } from "@/lib/data";
import { cn } from "@/lib/utils";
import {
  Search, StickyNote, Building2, User, Clock, Trash2,
  FileText, MessageSquare, AlertTriangle, TrendingUp,
  CheckCircle2, Filter, X, ArrowRight,
  TrendingDown, LifeBuoy, Send, Star, Receipt, BookOpen, CalendarClock, ShieldAlert,
} from "lucide-react";

interface NotesViewProps {
  onNavigate: (id: string) => void;
}

const NOTE_TYPES = [
  "General", "Meeting Summary", "Risk Flag",
  "Upsell Opportunity", "Action Item", "Follow-up",
] as const;

const typeIcons: Record<string, React.ElementType> = {
  General: FileText,
  "Meeting Summary": MessageSquare,
  "Risk Flag": AlertTriangle,
  "Upsell Opportunity": TrendingUp,
  "Action Item": CheckCircle2,
  "Follow-up": Clock,
};

const typeColors: Record<string, string> = {
  General: "text-slate-600 bg-slate-50",
  "Meeting Summary": "text-blue-700 bg-blue-50",
  "Risk Flag": "text-red-700 bg-red-50",
  "Upsell Opportunity": "text-emerald-700 bg-emerald-50",
  "Action Item": "text-amber-700 bg-amber-50",
  "Follow-up": "text-violet-700 bg-violet-50",
};

const sectionMeta: Record<NoteSection, { label: string; Icon: React.ElementType; navTarget: NavId; color: string }> = {
  pipeline: { label: "Pipeline", Icon: TrendingDown, navTarget: "pipeline", color: "text-emerald-600 bg-emerald-50" },
  support: { label: "Support", Icon: LifeBuoy, navTarget: "support", color: "text-red-600 bg-red-50" },
  outreach: { label: "Engagement Hub", Icon: Send, navTarget: "outreach", color: "text-blue-600 bg-blue-50" },
  csat: { label: "CSAT", Icon: Star, navTarget: "csat", color: "text-amber-600 bg-amber-50" },
  ar: { label: "AR Tracker", Icon: Receipt, navTarget: "ar", color: "text-orange-600 bg-orange-50" },
  playbooks: { label: "Playbooks", Icon: BookOpen, navTarget: "playbooks", color: "text-violet-600 bg-violet-50" },
  renewals: { label: "Renewals", Icon: CalendarClock, navTarget: "renewals", color: "text-indigo-600 bg-indigo-50" },
  downsell: { label: "Downsell Mitigation", Icon: ShieldAlert, navTarget: "downsell", color: "text-rose-600 bg-rose-50" },
  general: { label: "General", Icon: FileText, navTarget: "dashboard", color: "text-slate-600 bg-slate-50" },
};

export default function NotesView({ onNavigate }: NotesViewProps) {
  const { notes, searchNotes, deleteNote } = useNotes();
  const [query, setQuery] = useState("");
  const [accountFilter, setAccountFilter] = useState<string>("");
  const [sectionFilter, setSectionFilter] = useState<NoteSection | "">("");
  const [typeFilter, setTypeFilter] = useState<string>("");

  const accountNames = useMemo(() => {
    const names = new Set(notes.map((n) => n.account));
    return Array.from(names).sort();
  }, [notes]);

  const filteredNotes = useMemo(() => {
    let results = searchNotes(query, accountFilter || undefined);
    if (sectionFilter) {
      results = results.filter((n) => n.section === sectionFilter);
    }
    if (typeFilter) {
      results = results.filter((n) => n.type === typeFilter);
    }
    return results;
  }, [query, accountFilter, sectionFilter, typeFilter, searchNotes]);

  const hasFilters = accountFilter || sectionFilter || typeFilter;

  // Stats
  const totalNotes = notes.length;
  const accountsWithNotes = new Set(notes.map((n) => n.account)).size;
  const riskFlags = notes.filter((n) => n.type === "Risk Flag").length;
  const actionItems = notes.filter((n) => n.type === "Action Item").length;

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHrs / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const clearFilters = () => {
    setAccountFilter("");
    setSectionFilter("");
    setTypeFilter("");
    setQuery("");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-xl font-bold text-foreground">Notes</h2>
        <p className="text-xs text-muted-foreground mt-1">
          All rep notes across every section — search by account, content, author, or type
        </p>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Notes", value: String(totalNotes), icon: StickyNote, color: "text-foreground" },
          { label: "Accounts", value: String(accountsWithNotes), icon: Building2, color: "text-primary" },
          { label: "Risk Flags", value: String(riskFlags), icon: AlertTriangle, color: "text-red-600" },
          { label: "Action Items", value: String(actionItems), icon: CheckCircle2, color: "text-amber-600" },
        ].map((k, i) => (
          <motion.div
            key={k.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="card-elevated rounded-xl border border-border bg-card p-4"
          >
            <div className="flex items-center gap-2 mb-1">
              <k.icon className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[10px] tracking-[0.1em] text-muted-foreground font-medium uppercase">{k.label}</span>
            </div>
            <div className={cn("text-xl font-bold font-mono", k.color)}>{k.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Search & Filters */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card-elevated rounded-xl border border-border bg-card p-4 space-y-3"
      >
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes by content, account, author, or type..."
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 text-foreground placeholder:text-muted-foreground transition-all"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />

          {/* Account filter */}
          <select
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            className="text-xs bg-background border border-border rounded-lg px-3 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
          >
            <option value="">All Accounts</option>
            {accountNames.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>

          {/* Section filter */}
          <select
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value as NoteSection | "")}
            className="text-xs bg-background border border-border rounded-lg px-3 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
          >
            <option value="">All Sections</option>
            {Object.entries(sectionMeta).filter(([k]) => k !== "general").map(([key, meta]) => (
              <option key={key} value={key}>{meta.label}</option>
            ))}
          </select>

          {/* Type filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs bg-background border border-border rounded-lg px-3 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
          >
            <option value="">All Types</option>
            {NOTE_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-[10px] text-primary hover:text-primary/80 font-medium flex items-center gap-1 ml-1"
            >
              <X className="w-3 h-3" /> Clear all
            </button>
          )}

          <span className="text-[10px] text-muted-foreground ml-auto">
            {filteredNotes.length} note{filteredNotes.length !== 1 ? "s" : ""} found
          </span>
        </div>
      </motion.div>

      {/* Notes List */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="space-y-3"
      >
        {filteredNotes.length === 0 && (
          <div className="card-elevated rounded-xl border border-dashed border-border bg-card p-12 text-center">
            <StickyNote className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground font-medium">No notes found</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {hasFilters || query ? "Try adjusting your search or filters" : "Add notes from any drill-down panel to see them here"}
            </p>
          </div>
        )}

        <AnimatePresence>
          {filteredNotes.map((note, i) => {
            const TypeIcon = typeIcons[note.type] || FileText;
            const sectionInfo = sectionMeta[note.section];
            const SectionIcon = sectionInfo.Icon;
            const account = ACCOUNTS.find((a) => a.name === note.account);

            return (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: i * 0.02 }}
                className="group card-elevated rounded-xl border border-border bg-card p-4 hover:border-primary/20 transition-all"
              >
                {/* Top row: account + section + type + time */}
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  {/* Account chip */}
                  <button
                    onClick={() => setAccountFilter(note.account)}
                    className="flex items-center gap-1.5 text-[10px] font-medium text-primary bg-primary/5 hover:bg-primary/10 px-2 py-1 rounded-md transition-colors"
                  >
                    <Building2 className="w-3 h-3" />
                    {note.account}
                  </button>

                  {/* Section chip */}
                  <span className={cn("text-[10px] px-2 py-1 rounded-md font-medium flex items-center gap-1", sectionInfo.color)}>
                    <SectionIcon className="w-3 h-3" />
                    {sectionInfo.label}
                  </span>

                  {/* Type chip */}
                  <span className={cn("text-[10px] px-2 py-1 rounded-md font-medium flex items-center gap-1", typeColors[note.type])}>
                    <TypeIcon className="w-3 h-3" />
                    {note.type}
                  </span>

                  {/* Item reference */}
                  {note.itemRef && note.itemRef !== note.account && (
                    <span className="text-[10px] text-muted-foreground bg-muted px-2 py-1 rounded-md">
                      {note.itemRef}
                    </span>
                  )}

                  <div className="flex-1" />

                  {/* Time */}
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1 shrink-0">
                    <Clock className="w-3 h-3" />
                    {formatDate(note.createdAt)}
                  </span>
                </div>

                {/* Content */}
                <p className="text-xs text-foreground leading-relaxed mb-2">{note.content}</p>

                {/* Bottom row: author + actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {note.author}
                    </span>
                    {account && (
                      <span className="text-[10px] text-muted-foreground">
                        Health: <span className={cn("font-semibold", account.health >= 70 ? "text-emerald-600" : account.health >= 50 ? "text-amber-600" : "text-red-600")}>{account.health}</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onNavigate(sectionInfo.navTarget)}
                      className="opacity-0 group-hover:opacity-100 text-[10px] text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-all"
                    >
                      Go to {sectionInfo.label} <ArrowRight className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => deleteNote(note.id)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
