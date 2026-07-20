/*
 * ActivityNotes — reusable notes section for drill-down panels
 * Displays existing notes and allows reps to add new ones.
 * Each note is linked to an account + section + item reference.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNotes, type NoteSection } from "@/contexts/NotesContext";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import {
  StickyNote, Plus, Send, X, Trash2, Clock, User,
  AlertTriangle, TrendingUp, FileText, MessageSquare, CheckCircle2,
} from "lucide-react";

const NOTE_TYPES = [
  "General",
  "Meeting Summary",
  "Risk Flag",
  "Upsell Opportunity",
  "Action Item",
  "Follow-up",
] as const;

type NoteType = (typeof NOTE_TYPES)[number];

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

interface ActivityNotesProps {
  account: string;
  section: NoteSection;
  itemRef: string;
  compact?: boolean;
}

export default function ActivityNotes({ account, section, itemRef, compact }: ActivityNotesProps) {
  const { getNotesForItem, addNote, deleteNote } = useNotes();
  const notes = getNotesForItem(section, itemRef);

  const [isAdding, setIsAdding] = useState(false);
  const [content, setContent] = useState("");
  const [noteType, setNoteType] = useState<NoteType>("General");

  const handleSubmit = () => {
    if (!content.trim()) return;
    addNote({
      account,
      section,
      itemRef,
      content: content.trim(),
      author: "Jordan Davis",
      type: noteType,
    });
    setContent("");
    setNoteType("General");
    setIsAdding(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape") {
      setIsAdding(false);
      setContent("");
    }
  };

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
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <section>
      <Separator className="bg-border/40 mb-6" />
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[11px] tracking-[0.1em] uppercase text-muted-foreground font-medium flex items-center gap-2">
          <StickyNote className="w-3.5 h-3.5" />
          Rep Notes ({notes.length})
        </h3>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1 text-[10px] font-medium text-primary hover:text-primary/80 transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add Note
          </button>
        )}
      </div>

      {/* Add Note Form */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
              {/* Note type selector */}
              <div className="flex flex-wrap gap-1.5">
                {NOTE_TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setNoteType(t)}
                    className={cn(
                      "text-[10px] px-2 py-1 rounded-md font-medium transition-all",
                      noteType === t
                        ? typeColors[t] + " ring-1 ring-current/20"
                        : "text-muted-foreground bg-muted hover:bg-muted/80"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Content textarea */}
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Write your note... (Cmd+Enter to save)"
                autoFocus
                rows={compact ? 2 : 3}
                className="w-full text-xs bg-background border border-border rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground"
              />

              {/* Actions */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">
                  Linked to <span className="font-medium text-foreground">{account}</span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setIsAdding(false); setContent(""); }}
                    className="text-[10px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                  >
                    <X className="w-3 h-3" /> Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!content.trim()}
                    className={cn(
                      "text-[10px] font-medium flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all",
                      content.trim()
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "bg-muted text-muted-foreground cursor-not-allowed"
                    )}
                  >
                    <Send className="w-3 h-3" /> Save Note
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notes List */}
      {notes.length === 0 && !isAdding && (
        <div className="rounded-xl border border-dashed border-border p-4 text-center">
          <StickyNote className="w-4 h-4 text-muted-foreground/40 mx-auto mb-1.5" />
          <p className="text-[11px] text-muted-foreground">No notes yet — click "Add Note" to start</p>
        </div>
      )}

      <div className="space-y-2">
        <AnimatePresence>
          {notes.map((note) => {
            const TypeIcon = typeIcons[note.type] || FileText;
            return (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="group rounded-lg border border-border bg-card p-3 hover:border-border/80 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-medium flex items-center gap-1 shrink-0", typeColors[note.type])}>
                      <TypeIcon className="w-2.5 h-2.5" />
                      {note.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {formatDate(note.createdAt)}
                    </span>
                    <button
                      onClick={() => deleteNote(note.id)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-foreground leading-relaxed">{note.content}</p>
                <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground">
                  <User className="w-2.5 h-2.5" />
                  {note.author}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </section>
  );
}
