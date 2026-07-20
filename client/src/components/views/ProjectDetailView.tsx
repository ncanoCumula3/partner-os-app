/*
 * ProjectDetailView — Drill-down project management view
 * Tabs: Overview, Tasks (Kanban + Table), Timeline (Gantt), Budget, Notes, Updates
 * Warm adaptive "Golden Hour" theme
 */
import { useState, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getProjectBudgetPct, getProjectDaysRemaining,
  getProjectDuration, getProjectElapsedPct, getTasksByStatus,
  projectTypeLabels, projectTypeColors, billingModelLabels,
  projectStatusLabels, projectStatusColors, healthColors,
  taskStatusLabels, taskStatusColors, taskPriorityColors,
  milestoneStatusColors, noteCategoryLabels, noteCategoryColors,
  type ServiceProject, type ProjectTask, type TaskStatus, type ProjectPhase,
  type NoteCategory, type ProjectNote, type ProjectStatus, type ProjectHealth,
} from "@/lib/projects";
import { useProjects } from "@/contexts/ProjectsContext";
import { ACCOUNTS } from "@/lib/data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  ArrowLeft, Calendar, CheckCircle2, ChevronRight, Clock, DollarSign,
  AlertTriangle, Users, Target, Layers, Flag, MessageSquare,
  BarChart3, ListTodo, GanttChart, FileText, CircleDot,
  Pause, Play, AlertCircle, TrendingUp, Briefcase, Timer,
  GripVertical, UserCircle, ChevronDown, Pin, PinOff, Pencil,
  Trash2, Plus, StickyNote, Search, Filter, X,
} from "lucide-react";

/* ── Helpers ────────────────────────────────────────────────── */

function fmtCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtDateShort(d: string): string {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

type Tab = "overview" | "tasks" | "timeline" | "budget" | "notes" | "updates";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Overview", icon: Layers },
  { id: "tasks", label: "Tasks", icon: ListTodo },
  { id: "timeline", label: "Timeline", icon: GanttChart },
  { id: "budget", label: "Budget", icon: DollarSign },
  { id: "notes", label: "Notes", icon: StickyNote },
  { id: "updates", label: "Updates", icon: MessageSquare },
];

/* ── Sub-Components ─────────────────────────────────────────── */

/* Metric Tile */
function MetricTile({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-muted/30 rounded-lg px-4 py-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">{label}</p>
      <p className={cn("text-lg font-bold leading-tight", color || "text-foreground")}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

/* Phase Progress Row */
function PhaseRow({ phase, isLast }: { phase: ProjectPhase; isLast: boolean }) {
  const sc = phase.status === "completed" ? "bg-emerald-500" : phase.status === "in_progress" ? "bg-blue-500" : "bg-muted-foreground/20";
  const tc = phase.status === "completed" ? "text-emerald-700" : phase.status === "in_progress" ? "text-blue-700" : "text-muted-foreground";
  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-col items-center">
        <div className={cn("w-3 h-3 rounded-full border-2 shrink-0",
          phase.status === "completed" ? "bg-emerald-500 border-emerald-500" :
          phase.status === "in_progress" ? "bg-blue-500 border-blue-500" :
          "bg-card border-muted-foreground/30"
        )} />
        {!isLast && <div className={cn("w-0.5 h-8", phase.status === "completed" ? "bg-emerald-300" : "bg-muted-foreground/15")} />}
      </div>
      <div className="flex-1 flex items-center justify-between py-1">
        <div>
          <p className={cn("text-sm font-medium", tc)}>{phase.name}</p>
          <p className="text-[10px] text-muted-foreground">{fmtDateShort(phase.startDate)} → {fmtDateShort(phase.endDate)}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 rounded-full bg-muted/50 overflow-hidden">
            <div className={cn("h-full rounded-full", sc)} style={{ width: `${phase.completionPct}%` }} />
          </div>
          <span className={cn("text-[11px] font-mono font-semibold", tc)}>{phase.completionPct}%</span>
        </div>
      </div>
    </div>
  );
}

/* Task Card (for Kanban) — draggable with reassignment + inline time logging */
function TaskCard({
  task,
  teamMembers,
  onReassign,
  onDragStart,
  onLogTime,
}: {
  task: ProjectTask;
  teamMembers: string[];
  onReassign: (taskId: number, newAssignee: string) => void;
  onDragStart: (e: React.DragEvent, taskId: number) => void;
  onLogTime: (taskId: number, hours: number, description: string, person: string, date: string) => void;
}) {
  const [showReassign, setShowReassign] = useState(false);
  const [showTimeLog, setShowTimeLog] = useState(false);
  const [logHours, setLogHours] = useState("");
  const [logDesc, setLogDesc] = useState("");
  const [logPerson, setLogPerson] = useState(task.assignee);
  const [logDate, setLogDate] = useState("2026-04-15");
  const pc = taskPriorityColors[task.priority];
  const hoursProgress = task.hoursEstimated > 0 ? Math.min(100, Math.round((task.hoursLogged / task.hoursEstimated) * 100)) : 0;

  const handleSubmitTime = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const hrs = parseFloat(logHours);
    if (!hrs || hrs <= 0 || hrs > 24) return;
    onLogTime(task.id, hrs, logDesc || task.title, logPerson, logDate);
    setLogHours("");
    setLogDesc("");
    setShowTimeLog(false);
  };

  return (
    <div
      draggable={!showTimeLog}
      onDragStart={(e) => { if (!showTimeLog) onDragStart(e, task.id); }}
      className={cn(
        "bg-card border border-border rounded-lg p-3 transition-all relative group",
        showTimeLog ? "ring-2 ring-primary/20 border-primary/30" : "hover:border-primary/30 cursor-grab active:cursor-grabbing active:shadow-lg active:scale-[1.02] active:border-primary/50 active:z-10"
      )}
    >
      {/* Drag handle + Time log button */}
      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); setShowTimeLog(!showTimeLog); setShowReassign(false); }}
          className={cn(
            "w-5 h-5 rounded flex items-center justify-center transition-colors",
            showTimeLog ? "bg-primary text-primary-foreground" : "hover:bg-primary/10 text-muted-foreground hover:text-primary"
          )}
          title="Log time"
        >
          <Timer className="w-3 h-3" />
        </button>
        <GripVertical className="w-3.5 h-3.5 text-muted-foreground opacity-40" />
      </div>

      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-xs font-medium text-foreground leading-snug pr-10">{task.title}</p>
        <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-medium shrink-0", pc.bg, pc.text)}>
          {task.priority}
        </span>
      </div>
      {task.description && (
        <p className="text-[10px] text-muted-foreground mb-2 line-clamp-1">{task.description}</p>
      )}

      {/* Hours progress micro-bar */}
      <div className="mb-2">
        <div className="h-1 rounded-full bg-muted/50 overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all",
              hoursProgress >= 100 ? "bg-red-400" : hoursProgress >= 75 ? "bg-amber-400" : "bg-blue-400"
            )}
            style={{ width: `${hoursProgress}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        {/* Assignee — clickable to reassign */}
        <button
          onClick={(e) => { e.stopPropagation(); setShowReassign(!showReassign); setShowTimeLog(false); }}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors group/assign"
        >
          <UserCircle className="w-3 h-3" />
          <span className="group-hover/assign:underline">{task.assignee.split(" ")[0]}</span>
          <ChevronDown className="w-2.5 h-2.5 opacity-0 group-hover/assign:opacity-100 transition-opacity" />
        </button>
        {/* Hours — clickable to log time */}
        <button
          onClick={(e) => { e.stopPropagation(); setShowTimeLog(!showTimeLog); setShowReassign(false); }}
          className={cn(
            "text-[10px] flex items-center gap-1 transition-colors",
            showTimeLog ? "text-primary font-semibold" : "text-muted-foreground hover:text-primary"
          )}
        >
          <Clock className="w-3 h-3" /> {task.hoursLogged}/{task.hoursEstimated}h
        </button>
      </div>

      {/* Reassignment dropdown */}
      {showReassign && (
        <div className="mt-2 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-20 relative">
          {teamMembers.map(member => (
            <button
              key={member}
              onClick={(e) => {
                e.stopPropagation();
                onReassign(task.id, member);
                setShowReassign(false);
              }}
              className={cn(
                "w-full text-left px-3 py-1.5 text-[10px] hover:bg-primary/10 transition-colors flex items-center gap-2",
                member === task.assignee ? "bg-primary/5 font-semibold text-primary" : "text-foreground"
              )}
            >
              <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[8px] font-bold text-muted-foreground">
                {member.split(" ").map(n => n[0]).join("")}
              </div>
              {member}
              {member === task.assignee && <span className="ml-auto text-[8px] text-primary">current</span>}
            </button>
          ))}
        </div>
      )}

      {/* ── Inline Time Entry Form ── */}
      {showTimeLog && (
        <form onSubmit={handleSubmitTime} className="mt-3 pt-3 border-t border-border space-y-2" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2">
            <Timer className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="text-[10px] font-semibold text-primary">Log Time</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] text-muted-foreground font-medium block mb-0.5">Hours *</label>
              <input
                type="number"
                step="0.25"
                min="0.25"
                max="24"
                value={logHours}
                onChange={(e) => setLogHours(e.target.value)}
                placeholder="2.5"
                className="w-full text-[11px] px-2 py-1.5 rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="text-[9px] text-muted-foreground font-medium block mb-0.5">Date</label>
              <input
                type="date"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
                className="w-full text-[11px] px-2 py-1.5 rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
            </div>
          </div>
          <div>
            <label className="text-[9px] text-muted-foreground font-medium block mb-0.5">Team Member</label>
            <select
              value={logPerson}
              onChange={(e) => setLogPerson(e.target.value)}
              className="w-full text-[11px] px-2 py-1.5 rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
            >
              {teamMembers.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[9px] text-muted-foreground font-medium block mb-0.5">Description</label>
            <input
              type="text"
              value={logDesc}
              onChange={(e) => setLogDesc(e.target.value)}
              placeholder={task.title}
              className="w-full text-[11px] px-2 py-1.5 rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              className="flex-1 text-[10px] font-semibold px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5"
            >
              <Play className="w-3 h-3" /> Log {logHours ? `${logHours}h` : "Time"}
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowTimeLog(false); }}
              className="text-[10px] px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="flex items-center justify-between mt-1.5">
        <span className="text-[10px] text-muted-foreground">{fmtDateShort(task.dueDate)}</span>
        {task.status !== "done" && new Date(task.dueDate) < new Date("2026-04-15") && (
          <span className="text-[9px] text-red-600 font-medium">Overdue</span>
        )}
      </div>
    </div>
  );
}

/* Gantt-style Timeline Bar */
function GanttChart_({ project }: { project: ServiceProject }) {
  const startDate = new Date(project.startDate);
  const endDate = new Date(project.targetEndDate);
  const totalDays = Math.max(1, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const now = new Date("2026-04-15");
  const todayPct = Math.min(100, Math.max(0, ((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) / totalDays * 100));

  const getBarStyle = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    const left = Math.max(0, ((s.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) / totalDays * 100);
    const width = Math.max(2, ((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) / totalDays * 100);
    return { left: `${left}%`, width: `${Math.min(width, 100 - left)}%` };
  };

  // Generate month markers
  const months: { label: string; pct: number }[] = [];
  const cursor = new Date(startDate);
  cursor.setDate(1);
  cursor.setMonth(cursor.getMonth() + 1);
  while (cursor < endDate) {
    const pct = ((cursor.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) / totalDays * 100;
    months.push({ label: cursor.toLocaleDateString("en-US", { month: "short" }), pct });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
        <GanttChart className="w-4 h-4 text-primary" /> Project Timeline
      </h3>

      {/* Month headers */}
      <div className="relative h-6 mb-2 border-b border-border">
        <span className="absolute left-0 text-[9px] text-muted-foreground font-medium">
          {startDate.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
        </span>
        {months.map((m, i) => (
          <span key={i} className="absolute text-[9px] text-muted-foreground font-medium" style={{ left: `${m.pct}%` }}>
            {m.label}
          </span>
        ))}
        <span className="absolute right-0 text-[9px] text-muted-foreground font-medium">
          {endDate.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
        </span>
      </div>

      {/* Phase bars */}
      <div className="space-y-3">
        {project.phases.map((ph) => {
          const style = getBarStyle(ph.startDate, ph.endDate);
          const barColor = ph.status === "completed" ? "bg-emerald-400" : ph.status === "in_progress" ? "bg-blue-400" : "bg-muted-foreground/20";
          const progressColor = ph.status === "completed" ? "bg-emerald-600" : ph.status === "in_progress" ? "bg-blue-600" : "";
          return (
            <div key={ph.id} className="flex items-center gap-3">
              <div className="w-40 shrink-0">
                <p className="text-[11px] font-medium text-foreground truncate">{ph.name}</p>
                <p className="text-[9px] text-muted-foreground">{fmtDateShort(ph.startDate)} → {fmtDateShort(ph.endDate)}</p>
              </div>
              <div className="flex-1 relative h-6">
                {/* Month grid lines */}
                {months.map((m, i) => (
                  <div key={i} className="absolute top-0 bottom-0 w-px bg-border" style={{ left: `${m.pct}%` }} />
                ))}
                {/* Phase bar */}
                <div className={cn("absolute top-1 h-4 rounded-sm", barColor)} style={style}>
                  {ph.completionPct > 0 && ph.completionPct < 100 && (
                    <div className={cn("h-full rounded-sm", progressColor)} style={{ width: `${ph.completionPct}%` }} />
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Milestones */}
        <div className="flex items-center gap-3 pt-2 border-t border-border">
          <div className="w-40 shrink-0">
            <p className="text-[11px] font-medium text-foreground">Milestones</p>
          </div>
          <div className="flex-1 relative h-6">
            {months.map((m, i) => (
              <div key={i} className="absolute top-0 bottom-0 w-px bg-border" style={{ left: `${m.pct}%` }} />
            ))}
            {project.milestones.map((ms) => {
              const msDate = new Date(ms.dueDate);
              const pct = Math.max(0, Math.min(100, ((msDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) / totalDays * 100));
              const mc = milestoneStatusColors[ms.status];
              return (
                <div
                  key={ms.id}
                  className="absolute top-0.5"
                  style={{ left: `${pct}%`, transform: "translateX(-50%)" }}
                  title={`${ms.name} — ${fmtDate(ms.dueDate)}`}
                >
                  <div className={cn("w-4 h-4 rotate-45 rounded-sm border-2", mc.dot, "border-card")} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Today marker */}
        <div className="flex items-center gap-3">
          <div className="w-40 shrink-0" />
          <div className="flex-1 relative h-0">
            <div
              className="absolute -top-[calc(100%+4rem)] bottom-0 w-0.5 bg-red-400 z-10"
              style={{ left: `${todayPct}%`, height: "calc(100% + 8rem)" }}
            >
              <span className="absolute -top-4 -translate-x-1/2 text-[8px] text-red-500 font-bold whitespace-nowrap">TODAY</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────────── */

interface ProjectDetailViewProps {
  projectId: number;
  onBack: () => void;
}

export default function ProjectDetailView({ projectId, onBack }: ProjectDetailViewProps) {
  const { getProject, updateProject, addTimeEntry, addNote, updateNote, deleteNote, togglePinNote } = useProjects();
  const [showEdit, setShowEdit] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [taskView, setTaskView] = useState<"kanban" | "table">("kanban");

  const project = useMemo(() => getProject(projectId), [projectId, getProject]);
  const account = useMemo(() => project ? ACCOUNTS.find(a => a.id === project.accountId) : null, [project]);

  // Mutable task state for drag-and-drop and reassignment
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<TaskStatus | null>(null);

  // Notes state
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteCategory, setNoteCategory] = useState<NoteCategory>("general");
  const [noteSearch, setNoteSearch] = useState("");
  const [noteCategoryFilter, setNoteCategoryFilter] = useState<NoteCategory | "all">("all");

  // Initialize tasks from project data when project changes
  useMemo(() => {
    if (project) setTasks([...project.tasks]);
  }, [project]);

  // Drag handlers
  const handleDragStart = useCallback((e: React.DragEvent, taskId: number) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(taskId));
    // Make the drag image slightly transparent
    const el = e.currentTarget as HTMLElement;
    el.style.opacity = "0.5";
    setTimeout(() => { el.style.opacity = "1"; }, 0);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTarget(status);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDropTarget(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, newStatus: TaskStatus) => {
    e.preventDefault();
    const taskId = Number(e.dataTransfer.getData("text/plain"));
    if (!taskId) return;
    const updated = tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t);
    setTasks(updated);
    updateProject(projectId, { tasks: updated });
    setDraggedTaskId(null);
    setDropTarget(null);
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      toast.success(`"${task.title}" moved to ${taskStatusLabels[newStatus]}`);
    }
  }, [tasks, projectId, updateProject]);

  const handleDragEnd = useCallback(() => {
    setDraggedTaskId(null);
    setDropTarget(null);
  }, []);

  // Reassignment handler
  const handleReassign = useCallback((taskId: number, newAssignee: string) => {
    const updated = tasks.map(t => t.id === taskId ? { ...t, assignee: newAssignee } : t);
    setTasks(updated);
    updateProject(projectId, { tasks: updated });
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      toast.success(`"${task.title}" reassigned to ${newAssignee}`);
    }
  }, [tasks, projectId, updateProject]);

  // Time logging handler — updates local task state + persists via context
  const handleLogTime = useCallback((taskId: number, hours: number, description: string, person: string, date: string) => {
    if (!project) return;
    // Update local task state for immediate UI feedback
    setTasks(prev =>
      prev.map(t => t.id === taskId ? { ...t, hoursLogged: t.hoursLogged + hours } : t)
    );
    // Persist to context so Budget tab, Dashboard, etc. update
    addTimeEntry(project.id, { taskId, hours, person, description, date });
    const task = tasks.find(t => t.id === taskId);
    toast.success(
      `Logged ${hours}h for "${task?.title || 'task'}" by ${person.split(' ')[0]}`,
      { description: `${description} · ${new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` }
    );
  }, [project, tasks, addTimeEntry]);

  if (!project || !account) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Project not found</p>
        <button onClick={onBack} className="mt-3 text-primary text-sm font-medium">Go back</button>
      </div>
    );
  }

  const daysLeft = getProjectDaysRemaining(project);
  const budgetPct = getProjectBudgetPct(project);
  const elapsedPct = getProjectElapsedPct(project);
  const hc = healthColors[project.health];
  const sc = projectStatusColors[project.status];
  const tasksByStatus = getTasksByStatus(tasks);
  const doneTasks = tasksByStatus.done.length;
  const totalTasks = tasks.length;
  const blockedTasks = tasksByStatus.blocked.length;
  const overdueTasks = tasks.filter(t => t.status !== "done" && new Date(t.dueDate) < new Date("2026-04-15")).length;
  const hoursUtilization = project.hoursEstimated > 0 ? Math.round((project.hoursLogged / project.hoursEstimated) * 100) : 0;

  return (
    <>
      {/* Back + Header */}
      <div className="mb-5">
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors mb-3">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Projects
        </button>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", sc.bg)}>
              {project.status === "completed" ? <CheckCircle2 className={cn("w-5 h-5", sc.text)} /> :
               project.status === "on_hold" ? <Pause className={cn("w-5 h-5", sc.text)} /> :
               <Layers className={cn("w-5 h-5", sc.text)} />}
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">{project.name}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs text-muted-foreground">{account.name}</span>
                <span className="text-muted-foreground/40">·</span>
                <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-medium", projectTypeColors[project.type].bg, projectTypeColors[project.type].text, projectTypeColors[project.type].border)}>
                  {projectTypeLabels[project.type]}
                </span>
                <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", sc.bg, sc.text)}>
                  {projectStatusLabels[project.status]}
                </span>
                <span className="text-[10px] text-muted-foreground">{billingModelLabels[project.billingModel]}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEdit(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
              title="Edit project"
            >
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
            <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg", hc.bg)}>
              <div className={cn("w-2.5 h-2.5 rounded-full", hc.dot, project.health === "off_track" && "animate-pulse")} />
              <span className={cn("text-sm font-bold", hc.text)}>{hc.label}</span>
            </div>
          </div>
        </div>
      </div>

      <ProjectEditDialog
        open={showEdit}
        project={project}
        onClose={() => setShowEdit(false)}
        onSubmit={(updates) => { updateProject(project.id, updates); toast.success("Project updated"); }}
      />

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-5 bg-muted/30 rounded-lg p-1 w-fit">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
              activeTab === tab.id
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon className="w-3.5 h-3.5" /> {tab.label}
            {tab.id === "tasks" && blockedTasks > 0 && (
              <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold">{blockedTasks}</span>
            )}
          </button>
        ))}
      </div>

      {/* ═══ OVERVIEW TAB ═══ */}
      {activeTab === "overview" && (
        <div className="space-y-5">
          {/* Metric Tiles */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <MetricTile label="Completion" value={`${project.completionPct}%`} sub={`${doneTasks}/${totalTasks} tasks done`} />
            <MetricTile label="Budget" value={fmtCurrency(project.budgetConsumed)} sub={`of ${fmtCurrency(project.contractValue)} (${budgetPct}%)`} color={budgetPct >= 90 ? "text-red-600" : undefined} />
            <MetricTile label="Hours" value={`${project.hoursLogged}`} sub={`of ${project.hoursEstimated} est. (${hoursUtilization}%)`} />
            <MetricTile label="Timeline" value={project.status === "completed" ? "Done" : daysLeft > 0 ? `${daysLeft}d left` : `${Math.abs(daysLeft)}d over`} sub={`${fmtDateShort(project.startDate)} → ${fmtDateShort(project.targetEndDate)}`} color={daysLeft < 0 ? "text-red-600" : undefined} />
            <MetricTile label="Team Size" value={project.teamMembers.length} sub={`PM: ${project.projectManager}`} />
            <MetricTile label="Overdue Tasks" value={overdueTasks} sub={blockedTasks > 0 ? `${blockedTasks} blocked` : "None blocked"} color={overdueTasks > 0 ? "text-amber-600" : "text-emerald-600"} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Phase Progress */}
            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" /> Phase Progress
              </h3>
              <div className="space-y-0">
                {project.phases.map((ph, i) => (
                  <PhaseRow key={ph.id} phase={ph} isLast={i === project.phases.length - 1} />
                ))}
              </div>
            </div>

            {/* Milestones */}
            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Flag className="w-4 h-4 text-primary" /> Milestones
              </h3>
              <div className="space-y-3">
                {project.milestones.map(ms => {
                  const mc = milestoneStatusColors[ms.status];
                  return (
                    <div key={ms.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div className="flex items-center gap-2.5">
                        <div className={cn("w-2.5 h-2.5 rounded-full shrink-0", mc.dot)} />
                        <div>
                          <p className="text-xs font-medium text-foreground">{ms.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {ms.completedDate ? `Completed ${fmtDateShort(ms.completedDate)}` : `Due ${fmtDateShort(ms.dueDate)}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", mc.bg, mc.text)}>
                          {ms.status === "completed" ? "Done" : ms.status === "overdue" ? "Overdue" : ms.status === "at_risk" ? "At Risk" : "Upcoming"}
                        </span>
                        {ms.paymentAmount && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">{fmtCurrency(ms.paymentAmount)}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Description & Team */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" /> Description
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{project.description}</p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {project.tags.map(tag => (
                  <span key={tag} className="text-[9px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">{tag}</span>
                ))}
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> Team
              </h3>
              <div className="space-y-2.5">
                {project.teamMembers.map(member => {
                  const memberTasks = project.tasks.filter(t => t.assignee === member);
                  const memberHours = project.timeEntries.filter(te => te.person === member).reduce((s, te) => s + te.hours, 0);
                  const isPM = member === project.projectManager;
                  return (
                    <div key={member} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                          {member.split(" ").map(n => n[0]).join("")}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-foreground">{member}</p>
                          <p className="text-[10px] text-muted-foreground">{isPM ? "Project Manager" : "Team Member"}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-muted-foreground">{memberTasks.length} tasks · {memberHours}h logged</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ TASKS TAB ═══ */}
      {activeTab === "tasks" && (
        <div>
          {/* View toggle */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-muted-foreground">{totalTasks} tasks · {doneTasks} done · {overdueTasks} overdue · {blockedTasks} blocked</p>
            <div className="flex gap-1 bg-muted/30 rounded-md p-0.5">
              <button onClick={() => setTaskView("kanban")} className={cn("text-[10px] px-2.5 py-1 rounded font-medium transition-colors", taskView === "kanban" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}>
                Kanban
              </button>
              <button onClick={() => setTaskView("table")} className={cn("text-[10px] px-2.5 py-1 rounded font-medium transition-colors", taskView === "table" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}>
                Table
              </button>
            </div>
          </div>

          {taskView === "kanban" ? (
            /* Kanban Board — Drag & Drop */
            <div className="grid grid-cols-5 gap-3" onDragEnd={handleDragEnd}>
              {(["todo", "in_progress", "review", "done", "blocked"] as TaskStatus[]).map(status => {
                const columnTasks = tasksByStatus[status];
                const sc = taskStatusColors[status];
                const isOver = dropTarget === status;
                return (
                  <div
                    key={status}
                    className={cn(
                      "min-w-0 rounded-lg p-2 transition-all",
                      isOver ? "bg-primary/5 ring-2 ring-primary/20 ring-inset" : "bg-transparent"
                    )}
                    onDragOver={(e) => handleDragOver(e, status)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, status)}
                  >
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <div className={cn("w-2 h-2 rounded-full", sc.dot)} />
                      <span className="text-[11px] font-semibold text-foreground">{taskStatusLabels[status]}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto">{columnTasks.length}</span>
                    </div>
                    <div className="space-y-2 min-h-[80px]">
                      {columnTasks.map(task => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          teamMembers={project.teamMembers}
                          onReassign={handleReassign}
                          onDragStart={handleDragStart}
                          onLogTime={handleLogTime}
                        />
                      ))}
                      {columnTasks.length === 0 && (
                        <div className={cn(
                          "py-6 text-center text-[10px] border border-dashed rounded-lg transition-colors",
                          isOver ? "border-primary/40 text-primary/60 bg-primary/5" : "border-border text-muted-foreground/50"
                        )}>
                          {isOver ? "Drop here" : "No tasks"}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Table View */
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="grid grid-cols-[2fr_0.8fr_0.6fr_0.7fr_0.6fr_0.8fr] gap-3 px-4 py-2.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium border-b border-border">
                <span>Task</span>
                <span>Assignee</span>
                <span>Priority</span>
                <span>Status</span>
                <span>Hours</span>
                <span>Due Date</span>
              </div>
              {tasks.map(task => {
                const pc = taskPriorityColors[task.priority];
                const tsc = taskStatusColors[task.status];
                const isOverdue = task.status !== "done" && new Date(task.dueDate) < new Date("2026-04-15");
                return (
                  <div key={task.id} className="grid grid-cols-[2fr_0.8fr_0.6fr_0.7fr_0.6fr_0.8fr] gap-3 px-4 py-2.5 border-b border-border last:border-0 hover:bg-primary/[0.03] transition-colors text-xs items-center">
                    <div>
                      <p className="font-medium text-foreground">{task.title}</p>
                      {task.description && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{task.description}</p>}
                    </div>
                    <span className="text-muted-foreground">{task.assignee.split(" ")[0]}</span>
                    <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-medium w-fit", pc.bg, pc.text)}>{task.priority}</span>
                    <div className="flex items-center gap-1">
                      <div className={cn("w-1.5 h-1.5 rounded-full", tsc.dot)} />
                      <span className={cn("text-[10px] font-medium", tsc.text)}>{taskStatusLabels[task.status]}</span>
                    </div>
                    <span className="font-mono text-muted-foreground">{task.hoursLogged}/{task.hoursEstimated}h</span>
                    <span className={cn("font-mono", isOverdue ? "text-red-600 font-semibold" : "text-muted-foreground")}>
                      {fmtDateShort(task.dueDate)} {isOverdue && "⚠"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══ TIMELINE TAB ═══ */}
      {activeTab === "timeline" && (
        <div className="space-y-5">
          <GanttChart_ project={project} />

          {/* Milestone Legend */}
          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">Milestone Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {project.milestones.map(ms => {
                const mc = milestoneStatusColors[ms.status];
                return (
                  <div key={ms.id} className={cn("rounded-lg border p-3", mc.bg, "border-current/10")}>
                    <div className="flex items-center gap-2 mb-1">
                      <div className={cn("w-2 h-2 rounded-full", mc.dot)} />
                      <span className={cn("text-xs font-semibold", mc.text)}>{ms.name}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {ms.completedDate ? `Completed ${fmtDate(ms.completedDate)}` : `Due ${fmtDate(ms.dueDate)}`}
                    </p>
                    {ms.paymentAmount && (
                      <p className="text-[10px] font-medium text-foreground mt-1">Payment: {fmtCurrency(ms.paymentAmount)}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ═══ BUDGET TAB ═══ */}
      {activeTab === "budget" && (
        <div className="space-y-5">
          {/* Budget Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">Contract Value</h3>
              <p className="text-2xl font-bold text-foreground">{fmtCurrency(project.contractValue)}</p>
              <p className="text-xs text-muted-foreground mt-1">{billingModelLabels[project.billingModel]}</p>
              {project.hourlyRate && (
                <p className="text-xs text-muted-foreground mt-0.5">${project.hourlyRate}/hr rate</p>
              )}
            </div>
            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">Budget Consumed</h3>
              <p className={cn("text-2xl font-bold", budgetPct >= 90 ? "text-red-600" : budgetPct >= 75 ? "text-amber-600" : "text-foreground")}>
                {fmtCurrency(project.budgetConsumed)}
              </p>
              <div className="mt-2">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                  <span>{budgetPct}% consumed</span>
                  <span>{fmtCurrency(project.contractValue - project.budgetConsumed)} remaining</span>
                </div>
                <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", budgetPct >= 90 ? "bg-red-500" : budgetPct >= 75 ? "bg-amber-500" : "bg-emerald-500")}
                    style={{ width: `${Math.min(budgetPct, 100)}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">Hours Utilization</h3>
              <p className="text-2xl font-bold text-foreground">{project.hoursLogged} <span className="text-sm font-normal text-muted-foreground">/ {project.hoursEstimated}h</span></p>
              <div className="mt-2">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                  <span>{hoursUtilization}% utilized</span>
                  <span>{project.hoursEstimated - project.hoursLogged}h remaining</span>
                </div>
                <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", hoursUtilization >= 90 ? "bg-red-500" : hoursUtilization >= 75 ? "bg-amber-500" : "bg-blue-500")}
                    style={{ width: `${Math.min(hoursUtilization, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Budget vs Completion Analysis */}
          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Budget vs. Progress Analysis</h3>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Budget Consumed vs. Completion</p>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Budget consumed</span>
                      <span className="font-mono font-semibold">{budgetPct}%</span>
                    </div>
                    <div className="h-3 rounded-full bg-muted/50 overflow-hidden">
                      <div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.min(budgetPct, 100)}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Project completion</span>
                      <span className="font-mono font-semibold">{project.completionPct}%</span>
                    </div>
                    <div className="h-3 rounded-full bg-muted/50 overflow-hidden">
                      <div className="h-full rounded-full bg-blue-500" style={{ width: `${project.completionPct}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Time elapsed</span>
                      <span className="font-mono font-semibold">{elapsedPct}%</span>
                    </div>
                    <div className="h-3 rounded-full bg-muted/50 overflow-hidden">
                      <div className="h-full rounded-full bg-slate-400" style={{ width: `${elapsedPct}%` }} />
                    </div>
                  </div>
                </div>
                {budgetPct > project.completionPct + 10 && (
                  <div className="mt-3 flex items-start gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-amber-700">Budget consumption ({budgetPct}%) is outpacing project completion ({project.completionPct}%). Review scope and resource allocation.</p>
                  </div>
                )}
              </div>

              {/* Milestone Payments */}
              {project.milestones.some(ms => ms.paymentAmount) && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Milestone Payments</p>
                  <div className="space-y-2">
                    {project.milestones.filter(ms => ms.paymentAmount).map(ms => {
                      const mc = milestoneStatusColors[ms.status];
                      return (
                        <div key={ms.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                          <div className="flex items-center gap-2">
                            <div className={cn("w-2 h-2 rounded-full", mc.dot)} />
                            <span className="text-xs text-foreground">{ms.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-mono font-semibold text-foreground">{fmtCurrency(ms.paymentAmount!)}</span>
                            <span className={cn("text-[9px] ml-2 px-1.5 py-0.5 rounded font-medium", mc.bg, mc.text)}>
                              {ms.status === "completed" ? "Paid" : "Pending"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <span className="text-xs font-semibold text-foreground">Total</span>
                      <span className="text-xs font-mono font-bold text-foreground">
                        {fmtCurrency(project.milestones.reduce((s, ms) => s + (ms.paymentAmount || 0), 0))}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">Collected</span>
                      <span className="text-[10px] font-mono text-emerald-600 font-semibold">
                        {fmtCurrency(project.milestones.filter(ms => ms.status === "completed").reduce((s, ms) => s + (ms.paymentAmount || 0), 0))}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Recent Time Entries */}
          {project.timeEntries.length > 0 && (
            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Timer className="w-4 h-4 text-primary" /> Recent Time Entries
              </h3>
              <div className="space-y-0">
                {project.timeEntries.slice(-8).reverse().map(te => (
                  <div key={te.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary">
                        {te.person.split(" ").map(n => n[0]).join("")}
                      </div>
                      <div>
                        <p className="text-xs text-foreground">{te.description}</p>
                        <p className="text-[10px] text-muted-foreground">{te.person} · {fmtDateShort(te.date)}</p>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-semibold text-foreground">{te.hours}h</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ NOTES TAB ═══ */}
      {activeTab === "notes" && project && (() => {
        const allNotes = project.notes || [];
        const filtered = allNotes
          .filter(n => noteCategoryFilter === "all" || n.category === noteCategoryFilter)
          .filter(n => !noteSearch || n.title.toLowerCase().includes(noteSearch.toLowerCase()) || n.content.toLowerCase().includes(noteSearch.toLowerCase()) || n.author.toLowerCase().includes(noteSearch.toLowerCase()));
        const pinned = filtered.filter(n => n.pinned);
        const unpinned = filtered.filter(n => !n.pinned);
        const sorted = [...pinned, ...unpinned];

        const resetForm = () => {
          setNoteTitle(""); setNoteContent(""); setNoteCategory("general");
          setShowNoteForm(false); setEditingNoteId(null);
        };

        const handleSaveNote = () => {
          if (!noteTitle.trim() || !noteContent.trim()) {
            toast.error("Title and content are required"); return;
          }
          if (editingNoteId !== null) {
            updateNote(project.id, editingNoteId, { title: noteTitle.trim(), content: noteContent.trim(), category: noteCategory });
            toast.success("Note updated");
          } else {
            addNote(project.id, {
              projectId: project.id,
              author: project.projectManager,
              createdAt: new Date().toISOString(),
              title: noteTitle.trim(),
              content: noteContent.trim(),
              category: noteCategory,
              pinned: false,
            });
            toast.success("Note added");
          }
          resetForm();
        };

        const startEdit = (note: ProjectNote) => {
          setEditingNoteId(note.id); setNoteTitle(note.title);
          setNoteContent(note.content); setNoteCategory(note.category);
          setShowNoteForm(true);
        };

        const fmtNoteDate = (d: string) => {
          const dt = new Date(d);
          const now = new Date();
          const diffMs = now.getTime() - dt.getTime();
          const diffH = Math.floor(diffMs / 3600000);
          if (diffH < 1) return "Just now";
          if (diffH < 24) return `${diffH}h ago`;
          const diffD = Math.floor(diffH / 24);
          if (diffD < 7) return `${diffD}d ago`;
          return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: dt.getFullYear() !== now.getFullYear() ? "numeric" : undefined });
        };

        const categories: (NoteCategory | "all")[] = ["all", "general", "technical", "decision", "risk", "client_feedback", "internal"];

        return (
          <div className="space-y-5">
            {/* Header with search, filter, and new note button */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text" value={noteSearch} onChange={e => setNoteSearch(e.target.value)}
                  placeholder="Search notes..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {categories.map(cat => {
                  const isActive = noteCategoryFilter === cat;
                  const label = cat === "all" ? "All" : noteCategoryLabels[cat];
                  const colors = cat !== "all" ? noteCategoryColors[cat] : null;
                  return (
                    <button key={cat} onClick={() => setNoteCategoryFilter(cat)}
                      className={cn("px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all border",
                        isActive ? (colors ? `${colors.bg} ${colors.text} border-current/20` : "bg-foreground text-background border-transparent")
                        : "bg-muted/30 text-muted-foreground border-transparent hover:bg-muted/60"
                      )}>
                      {label}
                    </button>
                  );
                })}
              </div>
              <button onClick={() => { resetForm(); setShowNoteForm(true); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors">
                <Plus className="w-3.5 h-3.5" /> New Note
              </button>
            </div>

            {/* New / Edit Note Form */}
            <AnimatePresence>
              {showNoteForm && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  className="bg-card rounded-xl border border-primary/20 overflow-hidden">
                  <div className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-foreground">{editingNoteId ? "Edit Note" : "New Note"}</h3>
                      <button onClick={resetForm} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                    </div>
                    <input type="text" value={noteTitle} onChange={e => setNoteTitle(e.target.value)}
                      placeholder="Note title..." className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm font-medium placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    <textarea value={noteContent} onChange={e => setNoteContent(e.target.value)}
                      placeholder="Write your note here... Document decisions, technical findings, client feedback, or risks."
                      rows={5} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y min-h-[100px]" />
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Category</span>
                      <div className="flex gap-1.5 flex-wrap">
                        {(["general", "technical", "decision", "risk", "client_feedback", "internal"] as NoteCategory[]).map(cat => {
                          const colors = noteCategoryColors[cat];
                          return (
                            <button key={cat} onClick={() => setNoteCategory(cat)}
                              className={cn("px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all border",
                                noteCategory === cat ? `${colors.bg} ${colors.text} border-current/20` : "bg-muted/30 text-muted-foreground border-transparent hover:bg-muted/60"
                              )}>
                              {noteCategoryLabels[cat]}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={resetForm} className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-muted/50 transition-colors">Cancel</button>
                      <button onClick={handleSaveNote} disabled={!noteTitle.trim() || !noteContent.trim()}
                        className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                        {editingNoteId ? "Update Note" : "Save Note"}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Notes List */}
            {sorted.length === 0 ? (
              <div className="bg-card rounded-xl border border-border p-10 text-center">
                <StickyNote className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No notes yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Click "New Note" to document decisions, findings, or client feedback</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sorted.map(note => {
                  const colors = noteCategoryColors[note.category];
                  return (
                    <motion.div key={note.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className={cn("bg-card rounded-xl border p-4 group transition-all",
                        note.pinned ? "border-primary/25 ring-1 ring-primary/10" : "border-border hover:border-border/80"
                      )}>
                      <div className="flex items-start gap-3">
                        <div className={cn("w-2 h-2 rounded-full mt-2 shrink-0", colors.dot)} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-semibold text-foreground truncate">{note.title}</h4>
                            {note.pinned && <Pin className="w-3 h-3 text-primary shrink-0" />}
                            <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full font-medium shrink-0", colors.bg, colors.text)}>
                              {noteCategoryLabels[note.category]}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{note.content}</p>
                          <div className="flex items-center gap-3 mt-2.5">
                            <span className="text-[10px] text-muted-foreground/70">
                              <span className="font-medium text-muted-foreground">{note.author}</span> · {fmtNoteDate(note.createdAt)}
                              {note.updatedAt && <span className="italic"> · edited {fmtNoteDate(note.updatedAt)}</span>}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button onClick={() => togglePinNote(project.id, note.id)} title={note.pinned ? "Unpin" : "Pin"}
                            className="p-1.5 rounded-md hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors">
                            {note.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                          </button>
                          <button onClick={() => startEdit(note)} title="Edit"
                            className="p-1.5 rounded-md hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => { deleteNote(project.id, note.id); toast.success("Note deleted"); }} title="Delete"
                            className="p-1.5 rounded-md hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Summary footer */}
            <div className="flex items-center justify-between text-[10px] text-muted-foreground/60 px-1">
              <span>{allNotes.length} total note{allNotes.length !== 1 ? "s" : ""} · {pinned.length} pinned</span>
              <span>Showing {sorted.length} of {allNotes.length}</span>
            </div>
          </div>
        );
      })()}

      {/* ═══ UPDATES TAB ═══ */}
      {activeTab === "updates" && (
        <div className="space-y-5">
          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" /> Project Updates
            </h3>
            <div className="space-y-4">
              {project.updates.map(update => {
                const typeConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
                  status: { icon: CircleDot, color: "text-blue-600 bg-blue-50", label: "Status Update" },
                  note: { icon: FileText, color: "text-slate-600 bg-slate-50", label: "Note" },
                  risk: { icon: AlertTriangle, color: "text-red-600 bg-red-50", label: "Risk Alert" },
                  milestone: { icon: Flag, color: "text-emerald-600 bg-emerald-50", label: "Milestone" },
                  budget: { icon: DollarSign, color: "text-amber-600 bg-amber-50", label: "Budget" },
                };
                const tc = typeConfig[update.type] || typeConfig.note;
                return (
                  <div key={update.id} className="flex gap-3">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", tc.color)}>
                      <tc.icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-foreground">{update.author}</span>
                        <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-medium", tc.color)}>{tc.label}</span>
                        <span className="text-[10px] text-muted-foreground ml-auto">{fmtDate(update.date)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{update.content}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Project edit dialog (core fields upsert) ──────────────────────────────
const STATUS_OPTS: ProjectStatus[] = ["planning", "in_progress", "on_hold", "completed", "cancelled"];
const HEALTH_OPTS: ProjectHealth[] = ["on_track", "at_risk", "off_track"];
const PRIORITY_OPTS: ServiceProject["priority"][] = ["high", "medium", "low"];

function ProjectEditDialog({
  open, project, onClose, onSubmit,
}: {
  open: boolean;
  project: ServiceProject;
  onClose: () => void;
  onSubmit: (updates: Partial<ServiceProject>) => void;
}) {
  const [form, setForm] = useState({
    name: project.name,
    status: project.status,
    health: project.health,
    priority: project.priority,
    projectManager: project.projectManager,
    contractValue: project.contractValue,
    budgetConsumed: project.budgetConsumed,
    hoursEstimated: project.hoursEstimated,
    completionPct: project.completionPct,
    startDate: project.startDate,
    targetEndDate: project.targetEndDate,
    platform: project.platform,
    description: project.description,
  });

  useMemo(() => {
    setForm({
      name: project.name, status: project.status, health: project.health,
      priority: project.priority, projectManager: project.projectManager,
      contractValue: project.contractValue, budgetConsumed: project.budgetConsumed,
      hoursEstimated: project.hoursEstimated, completionPct: project.completionPct,
      startDate: project.startDate, targetEndDate: project.targetEndDate,
      platform: project.platform, description: project.description,
    });
  }, [project, open]);

  if (!open) return null;

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm(f => ({ ...f, [k]: v }));
  const field = "w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40";
  const label = "text-xs font-medium text-muted-foreground mb-1 block";

  const submit = () => {
    if (!form.name.trim()) return;
    onSubmit({ ...form });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="text-lg font-bold text-foreground">Edit Project</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={label}>Project name *</label>
            <input className={field} value={form.name} onChange={e => set("name", e.target.value)} />
          </div>
          <div>
            <label className={label}>Status</label>
            <select className={field} value={form.status} onChange={e => set("status", e.target.value as ProjectStatus)}>
              {STATUS_OPTS.map(s => <option key={s} value={s}>{projectStatusLabels[s]}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Health</label>
            <select className={field} value={form.health} onChange={e => set("health", e.target.value as ProjectHealth)}>
              {HEALTH_OPTS.map(h => <option key={h} value={h}>{healthColors[h].label}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Priority</label>
            <select className={field} value={form.priority} onChange={e => set("priority", e.target.value as ServiceProject["priority"])}>
              {PRIORITY_OPTS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Project manager</label>
            <input className={field} value={form.projectManager} onChange={e => set("projectManager", e.target.value)} />
          </div>
          <div>
            <label className={label}>Contract value (USD)</label>
            <input type="number" className={field} value={form.contractValue} onChange={e => set("contractValue", Number(e.target.value))} />
          </div>
          <div>
            <label className={label}>Budget consumed (USD)</label>
            <input type="number" className={field} value={form.budgetConsumed} onChange={e => set("budgetConsumed", Number(e.target.value))} />
          </div>
          <div>
            <label className={label}>Hours estimated</label>
            <input type="number" className={field} value={form.hoursEstimated} onChange={e => set("hoursEstimated", Number(e.target.value))} />
          </div>
          <div>
            <label className={label}>Completion %</label>
            <input type="number" min={0} max={100} className={field} value={form.completionPct} onChange={e => set("completionPct", Number(e.target.value))} />
          </div>
          <div>
            <label className={label}>Start date</label>
            <input type="date" className={field} value={form.startDate} onChange={e => set("startDate", e.target.value)} />
          </div>
          <div>
            <label className={label}>Target end date</label>
            <input type="date" className={field} value={form.targetEndDate} onChange={e => set("targetEndDate", e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className={label}>Platform</label>
            <input className={field} value={form.platform} onChange={e => set("platform", e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className={label}>Description</label>
            <textarea className={field} rows={3} value={form.description} onChange={e => set("description", e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2 p-5 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:text-foreground">Cancel</button>
          <button onClick={submit} disabled={!form.name.trim()} className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground disabled:opacity-50">Save changes</button>
        </div>
      </div>
    </div>
  );
}
