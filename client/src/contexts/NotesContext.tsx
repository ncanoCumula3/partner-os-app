/*
 * NotesContext — shared notes store linked to accounts & sections
 * Every note is tied to an account, a section (pipeline/support/outreach/csat/ar/playbooks),
 * an optional item reference, and the authoring rep.
 */
import { createContext, useContext, useState, useCallback, useMemo, useEffect, type ReactNode } from "react";
import { api } from "@/lib/api";

export type NoteSection = "pipeline" | "support" | "outreach" | "csat" | "ar" | "playbooks" | "renewals" | "downsell" | "general";

export interface Note {
  id: string;
  account: string;
  section: NoteSection;
  itemRef: string;          // e.g. deal name, ticket id, invoice #
  content: string;
  author: string;
  createdAt: string;        // ISO string
  type: "General" | "Meeting Summary" | "Risk Flag" | "Upsell Opportunity" | "Action Item" | "Follow-up";
}

interface NotesContextType {
  notes: Note[];
  addNote: (note: Omit<Note, "id" | "createdAt">) => void;
  deleteNote: (id: string) => void;
  getNotesForItem: (section: NoteSection, itemRef: string) => Note[];
  getNotesForAccount: (account: string) => Note[];
  searchNotes: (query: string, accountFilter?: string) => Note[];
}

const NotesContext = createContext<NotesContextType | null>(null);

/* ── Seed notes so the UI isn't empty ── */
const SEED_NOTES: Note[] = [
  {
    id: "n-001", account: "Driftwood Capital", section: "pipeline", itemRef: "Driftwood Capital",
    content: "Tom confirmed budget is approved for Advanced Analytics module. Legal review of MSA amendment expected by end of week. Strong buying signal — prioritize this deal.",
    author: "Jordan Davis", createdAt: "2026-04-10T14:30:00Z", type: "Upsell Opportunity",
  },
  {
    id: "n-002", account: "Driftwood Capital", section: "outreach", itemRef: "Driftwood Capital",
    content: "Upsell sequence performing well — 100% open rate on first 3 emails. Tom clicked the ROI calculator link twice. Schedule a follow-up call before Step 4 sends.",
    author: "Jordan Davis", createdAt: "2026-04-09T10:15:00Z", type: "Follow-up",
  },
  {
    id: "n-003", account: "BlueWave Logistics", section: "support", itemRef: "T-1041",
    content: "Marcus is increasingly frustrated with the multi-currency issue. Escalated to engineering — ETA 48hrs. Offered a service credit as goodwill gesture. Need to resolve before renewal conversation.",
    author: "Sarah Chen", createdAt: "2026-04-08T16:45:00Z", type: "Risk Flag",
  },
  {
    id: "n-004", account: "BlueWave Logistics", section: "ar", itemRef: "INV-2039",
    content: "Payment delay likely related to the ongoing support issue (T-1041). Marcus mentioned he won't approve payment until the technical issue is resolved. Recommend resolving ticket first.",
    author: "Jordan Davis", createdAt: "2026-04-07T09:00:00Z", type: "General",
  },
  {
    id: "n-005", account: "Apex Manufacturing", section: "pipeline", itemRef: "Apex Manufacturing",
    content: "Dana is the internal champion but needs VP of IT buy-in. QBR on Apr 18 is the key milestone — prepare a technical deep-dive deck focusing on ROI for the 3 new modules.",
    author: "Sarah Chen", createdAt: "2026-04-09T11:20:00Z", type: "Meeting Summary",
  },
  {
    id: "n-006", account: "Apex Manufacturing", section: "csat", itemRef: "Apex Manufacturing",
    content: "CSAT score stable at 4/5. Dana mentioned documentation turnaround could be faster. Created internal task to improve doc SLA from 72hrs to 48hrs.",
    author: "Sarah Chen", createdAt: "2026-04-06T13:00:00Z", type: "Action Item",
  },
  {
    id: "n-007", account: "ClearPath Retail", section: "pipeline", itemRef: "ClearPath Retail",
    content: "Priya is interested in email automation cross-sell but it's very early stage. Need to build a business case showing ROI vs their current Mailchimp setup.",
    author: "Jordan Davis", createdAt: "2026-04-03T15:30:00Z", type: "General",
  },
  {
    id: "n-008", account: "Edgeline Foods", section: "csat", itemRef: "Edgeline Foods",
    content: "Sofia flagged that support response times on complex issues are still too slow. Health score dropped to 54. Initiated At-Risk Account Recovery playbook.",
    author: "Jordan Davis", createdAt: "2026-04-05T08:45:00Z", type: "Risk Flag",
  },
  {
    id: "n-009", account: "Edgeline Foods", section: "playbooks", itemRef: "At-Risk Account Recovery",
    content: "Started the recovery playbook for Edgeline Foods. Completed Step 1 (Immediate Assessment) — root cause is slow support response on complex NetSuite issues. Moving to Step 2 (Internal War Room).",
    author: "Jordan Davis", createdAt: "2026-04-06T10:00:00Z", type: "Follow-up",
  },
  {
    id: "n-010", account: "Driftwood Capital", section: "csat", itemRef: "Driftwood Capital",
    content: "Excellent feedback from Tom — score 5/5. Specifically praised the NetSuite configuration work. Use this as a case study reference for similar accounts.",
    author: "Jordan Davis", createdAt: "2026-04-08T12:00:00Z", type: "General",
  },
];

const genId = () => `n-${Date.now().toString(36)}${Math.floor(Math.random() * 10000)}`;

export function NotesProvider({ children }: { children: ReactNode }) {
  const [notes, setNotes] = useState<Note[]>([]);

  // Load from the API; seed the DB from bundled notes if it's empty.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let list = await api.get<Note[]>("/api/notes");
        if (!list.length) {
          await Promise.all(SEED_NOTES.map((n) => api.post("/api/notes", n)));
          list = SEED_NOTES;
        }
        if (!cancelled) setNotes(list);
      } catch {
        if (!cancelled) setNotes(SEED_NOTES);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const addNote = useCallback((note: Omit<Note, "id" | "createdAt">) => {
    const newNote: Note = { ...note, id: genId(), createdAt: new Date().toISOString() };
    setNotes((prev) => [newNote, ...prev]);
    void api.post("/api/notes", newNote).catch(() => {});
  }, []);

  const deleteNote = useCallback((id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    void api.del(`/api/notes/${id}`).catch(() => {});
  }, []);

  const getNotesForItem = useCallback(
    (section: NoteSection, itemRef: string) =>
      notes
        .filter((n) => n.section === section && n.itemRef === itemRef)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [notes]
  );

  const getNotesForAccount = useCallback(
    (account: string) =>
      notes
        .filter((n) => n.account === account)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [notes]
  );

  const searchNotes = useCallback(
    (query: string, accountFilter?: string) => {
      const q = query.toLowerCase();
      return notes
        .filter((n) => {
          if (accountFilter && n.account !== accountFilter) return false;
          if (!q) return true;
          return (
            n.content.toLowerCase().includes(q) ||
            n.account.toLowerCase().includes(q) ||
            n.itemRef.toLowerCase().includes(q) ||
            n.author.toLowerCase().includes(q) ||
            n.type.toLowerCase().includes(q)
          );
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },
    [notes]
  );

  const value = useMemo(
    () => ({ notes, addNote, deleteNote, getNotesForItem, getNotesForAccount, searchNotes }),
    [notes, addNote, deleteNote, getNotesForItem, getNotesForAccount, searchNotes]
  );

  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>;
}

export function useNotes() {
  const ctx = useContext(NotesContext);
  if (!ctx) throw new Error("useNotes must be used within NotesProvider");
  return ctx;
}
