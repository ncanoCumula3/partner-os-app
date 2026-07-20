/*
 * MitigationEngineContext — Automated mitigation trigger engine
 * 
 * When a rep clicks "Apply Strategy" or "Run AI Analysis", this engine:
 * 1. Generates actionable tasks from AI recommendation steps
 * 2. Schedules executive/stakeholder calls
 * 3. Creates mitigation action items with assignees and due dates
 * 4. Logs all automation events for audit trail
 * 5. Dispatches notifications to the notification center
 */
import { createContext, useContext, useState, useCallback, useMemo, useEffect, type ReactNode } from "react";
import { api } from "@/lib/api";
import type { AIRecommendation, MitigationAction, AccountRiskProfile } from "@/lib/data";

/* ── Types ─────────────────────────────────────────────────── */
export type TaskPriority = "critical" | "high" | "normal" | "low";
export type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled";
export type CallStatus = "scheduled" | "completed" | "cancelled" | "no_show";
export type AutomationEventType = "strategy_applied" | "ai_analysis_run" | "task_generated" | "call_scheduled" | "escalation_created" | "mitigation_created" | "notification_sent";

export interface AutoTask {
  id: string;
  accountId: number;
  account: string;
  title: string;
  description: string;
  assignee: string;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
  source: "ai_strategy" | "ai_analysis" | "manual" | "escalation";
  sourceRecId?: string;        // AI recommendation ID that generated this
  stepNumber?: number;         // Which step in the recommendation
  category: "call" | "email" | "meeting" | "document" | "review" | "outreach" | "escalation" | "general";
  createdAt: string;
  completedAt?: string;
}

export interface ScheduledCall {
  id: string;
  accountId: number;
  account: string;
  title: string;
  description: string;
  participants: string[];
  scheduledDate: string;
  duration: number;            // minutes
  callType: "executive" | "stakeholder" | "qbr" | "escalation" | "discovery" | "value_review";
  status: CallStatus;
  source: "ai_strategy" | "ai_analysis" | "manual";
  sourceRecId?: string;
  createdAt: string;
  agenda?: string[];
}

export interface AutomationEvent {
  id: string;
  type: AutomationEventType;
  accountId: number;
  account: string;
  title: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface MitigationEngineState {
  tasks: AutoTask[];
  scheduledCalls: ScheduledCall[];
  automationLog: AutomationEvent[];
  generatedMitigations: MitigationAction[];
  isAnalyzing: boolean;
  lastAnalysisTime: string | null;
}

interface MitigationEngineContextType extends MitigationEngineState {
  applyStrategy: (rec: AIRecommendation, profile: AccountRiskProfile) => void;
  runAIAnalysis: (profiles: AccountRiskProfile[], highThreshold?: number) => void;
  updateTaskStatus: (taskId: string, status: TaskStatus) => void;
  updateCallStatus: (callId: string, status: CallStatus) => void;
  getTasksForAccount: (accountId: number) => AutoTask[];
  getCallsForAccount: (accountId: number) => ScheduledCall[];
  getRecentEvents: (limit?: number) => AutomationEvent[];
  getPendingTasks: () => AutoTask[];
  getUpcomingCalls: () => ScheduledCall[];
  stats: {
    totalTasksGenerated: number;
    tasksCompleted: number;
    tasksPending: number;
    callsScheduled: number;
    strategiesApplied: number;
    analysesRun: number;
  };
}

const MitigationEngineContext = createContext<MitigationEngineContextType | null>(null);

/* ── Helpers ───────────────────────────────────────────────── */
let taskIdCounter = 1;
let callIdCounter = 1;
let eventIdCounter = 1;
let mitigationIdCounter = 100;

const genTaskId = () => `auto-task-${String(taskIdCounter++).padStart(3, "0")}`;
const genCallId = () => `auto-call-${String(callIdCounter++).padStart(3, "0")}`;
const genEventId = () => `auto-evt-${String(eventIdCounter++).padStart(3, "0")}`;
const genMitId = () => `auto-mit-${String(mitigationIdCounter++).padStart(3, "0")}`;

// After restoring persisted state, advance the id counters past existing ids.
function bumpCounters(s: Partial<MitigationEngineState>) {
  const maxNum = (arr: { id: string }[] | undefined, prefix: string) =>
    Math.max(0, ...(arr ?? []).map((x) => parseInt(String(x.id).replace(prefix, ""), 10)).filter((n) => !Number.isNaN(n)));
  taskIdCounter = Math.max(taskIdCounter, maxNum(s.tasks, "auto-task-") + 1);
  callIdCounter = Math.max(callIdCounter, maxNum(s.scheduledCalls, "auto-call-") + 1);
  eventIdCounter = Math.max(eventIdCounter, maxNum(s.automationLog, "auto-evt-") + 1);
  mitigationIdCounter = Math.max(mitigationIdCounter, maxNum(s.generatedMitigations, "auto-mit-") + 1);
}

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function addHours(hours: number): string {
  const d = new Date();
  d.setHours(d.getHours() + hours);
  return d.toISOString();
}

const TEAM_MEMBERS = ["Jordan Davis", "Sarah Chen", "Priya Nair"];

function assignTeamMember(index: number): string {
  return TEAM_MEMBERS[index % TEAM_MEMBERS.length];
}

/* ── Step-to-Task Converter ────────────────────────────────── */
function convertStepToTask(
  step: string,
  stepIndex: number,
  rec: AIRecommendation,
  profile: AccountRiskProfile,
): AutoTask {
  // Parse the step to determine category and timing
  const lower = step.toLowerCase();
  let category: AutoTask["category"] = "general";
  let dueDays = stepIndex + 1;

  if (lower.includes("call") || lower.includes("phone")) {
    category = "call";
    dueDays = Math.max(1, stepIndex);
  } else if (lower.includes("email") || lower.includes("send")) {
    category = "email";
    dueDays = stepIndex + 1;
  } else if (lower.includes("meeting") || lower.includes("workshop") || lower.includes("on-site")) {
    category = "meeting";
    dueDays = Math.max(3, stepIndex * 3);
  } else if (lower.includes("report") || lower.includes("deck") || lower.includes("proposal") || lower.includes("document")) {
    category = "document";
    dueDays = Math.max(2, stepIndex * 2);
  } else if (lower.includes("review") || lower.includes("assess") || lower.includes("audit")) {
    category = "review";
    dueDays = Math.max(1, stepIndex);
  } else if (lower.includes("outreach") || lower.includes("sequence")) {
    category = "outreach";
    dueDays = stepIndex + 2;
  } else if (lower.includes("escalat")) {
    category = "escalation";
    dueDays = 1;
  }

  // Extract a clean title from the step (remove "Day X:" prefix)
  const cleanTitle = step.replace(/^Day\s+\d+[-–:]?\s*/i, "").replace(/^Step\s+\d+[-–:]?\s*/i, "");
  const shortTitle = cleanTitle.length > 80 ? cleanTitle.substring(0, 77) + "..." : cleanTitle;

  const priority: TaskPriority = profile.compositeScore >= 80 ? "critical" : profile.compositeScore >= 60 ? "high" : "normal";

  return {
    id: genTaskId(),
    accountId: profile.accountId,
    account: profile.account,
    title: shortTitle,
    description: step,
    assignee: assignTeamMember(stepIndex),
    dueDate: addDays(dueDays),
    priority,
    status: "pending",
    source: "ai_strategy",
    sourceRecId: rec.id,
    stepNumber: stepIndex + 1,
    category,
    createdAt: new Date().toISOString(),
  };
}

/* ── Call Generator from Recommendation ────────────────────── */
function generateCallsFromRec(rec: AIRecommendation, profile: AccountRiskProfile): ScheduledCall[] {
  const calls: ScheduledCall[] = [];
  const steps = rec.detailedSteps;

  // Look for call/meeting steps
  steps.forEach((step, i) => {
    const lower = step.toLowerCase();
    if (lower.includes("call") || lower.includes("meeting") || lower.includes("workshop") || lower.includes("qbr")) {
      let callType: ScheduledCall["callType"] = "stakeholder";
      let duration = 30;
      const agenda: string[] = [];

      if (lower.includes("executive") || lower.includes("vp") || lower.includes("cfo") || lower.includes("ceo")) {
        callType = "executive";
        duration = 45;
        agenda.push("Executive alignment on account health", "Service recovery commitments", "Renewal timeline discussion");
      } else if (lower.includes("qbr")) {
        callType = "qbr";
        duration = 60;
        agenda.push("Quarterly business review", "Value delivered recap", "Upcoming roadmap alignment", "Renewal preparation");
      } else if (lower.includes("workshop") || lower.includes("on-site")) {
        callType = "value_review";
        duration = 90;
        agenda.push("Module deep-dive demonstration", "ROI analysis review", "Adoption optimization workshop");
      } else if (lower.includes("escalat")) {
        callType = "escalation";
        duration = 30;
        agenda.push("Escalation review", "Resolution timeline", "Customer impact assessment");
      } else if (lower.includes("discovery")) {
        callType = "discovery";
        duration = 45;
        agenda.push("Current pain points review", "Usage analysis walkthrough", "Renewal expectations");
      }

      const cleanTitle = step.replace(/^Day\s+\d+[-–:]?\s*/i, "").replace(/^Step\s+\d+[-–:]?\s*/i, "");

      calls.push({
        id: genCallId(),
        accountId: profile.accountId,
        account: profile.account,
        title: cleanTitle.length > 60 ? cleanTitle.substring(0, 57) + "..." : cleanTitle,
        description: step,
        participants: [assignTeamMember(i), `${profile.account} Stakeholder`],
        scheduledDate: addHours(24 + i * 48),
        duration,
        callType,
        status: "scheduled",
        source: "ai_strategy",
        sourceRecId: rec.id,
        createdAt: new Date().toISOString(),
        agenda,
      });
    }
  });

  // If no calls were found in steps, generate a default discovery call
  if (calls.length === 0) {
    calls.push({
      id: genCallId(),
      accountId: profile.accountId,
      account: profile.account,
      title: `Mitigation Discovery Call — ${profile.account}`,
      description: `Initial discovery call to discuss ${rec.title} strategy and align on next steps.`,
      participants: [assignTeamMember(0), `${profile.account} Account Manager`],
      scheduledDate: addHours(48),
      duration: 30,
      callType: "discovery",
      status: "scheduled",
      source: "ai_strategy",
      sourceRecId: rec.id,
      createdAt: new Date().toISOString(),
      agenda: ["Review AI-identified risk signals", "Discuss mitigation strategy", "Align on action items and timeline"],
    });
  }

  return calls;
}

/* ── Mitigation Action Generator ───────────────────────────── */
function generateMitigationFromRec(rec: AIRecommendation, profile: AccountRiskProfile): MitigationAction[] {
  // Create 2-3 high-level mitigation actions from the recommendation
  const mitigations: MitigationAction[] = [];
  const signalId = rec.relatedSignals[0] || "auto";

  // First mitigation: immediate action
  mitigations.push({
    id: genMitId(),
    signalId,
    accountId: profile.accountId,
    account: profile.account,
    title: `Execute: ${rec.title}`,
    description: `AI-generated mitigation based on ${rec.confidence}% confidence analysis. ${rec.summary}`,
    assignee: assignTeamMember(0),
    status: "pending",
    dueDate: addDays(3),
    aiGenerated: true,
    priority: profile.compositeScore >= 80 ? "urgent" : "high",
  });

  // Second mitigation: follow-up
  if (rec.detailedSteps.length > 3) {
    mitigations.push({
      id: genMitId(),
      signalId,
      accountId: profile.accountId,
      account: profile.account,
      title: `Follow-up: Validate ${rec.title} progress`,
      description: `Review progress on ${rec.detailedSteps.length} action steps and adjust strategy if needed.`,
      assignee: assignTeamMember(1),
      status: "pending",
      dueDate: addDays(14),
      aiGenerated: true,
      priority: "high",
    });
  }

  return mitigations;
}

/* ── Seed Data ─────────────────────────────────────────────── */
const SEED_TASKS: AutoTask[] = [];
const SEED_CALLS: ScheduledCall[] = [];
const SEED_EVENTS: AutomationEvent[] = [];
const SEED_MITIGATIONS: MitigationAction[] = [];

/* ══════════════════════════════════════════════════════════════
   PROVIDER
   ══════════════════════════════════════════════════════════════ */
export function MitigationEngineProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<AutoTask[]>(SEED_TASKS);
  const [scheduledCalls, setScheduledCalls] = useState<ScheduledCall[]>(SEED_CALLS);
  const [automationLog, setAutomationLog] = useState<AutomationEvent[]>(SEED_EVENTS);
  const [generatedMitigations, setGeneratedMitigations] = useState<MitigationAction[]>(SEED_MITIGATIONS);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalysisTime, setLastAnalysisTime] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  /* ── Load persisted engine state on mount ── */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await api.get<Partial<MitigationEngineState> | null>("/api/state/mitigation");
        if (s && !cancelled) {
          if (Array.isArray(s.tasks)) setTasks(s.tasks);
          if (Array.isArray(s.scheduledCalls)) setScheduledCalls(s.scheduledCalls);
          if (Array.isArray(s.automationLog)) setAutomationLog(s.automationLog);
          if (Array.isArray(s.generatedMitigations)) setGeneratedMitigations(s.generatedMitigations);
          if (s.lastAnalysisTime) setLastAnalysisTime(s.lastAnalysisTime);
          bumpCounters(s);
        }
      } catch {
        /* offline: start empty */
      }
      if (!cancelled) setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ── Persist the whole engine state whenever it changes ── */
  useEffect(() => {
    if (!loaded) return;
    void api
      .put("/api/state/mitigation", {
        tasks,
        scheduledCalls,
        automationLog,
        generatedMitigations,
        lastAnalysisTime,
      })
      .catch(() => {});
  }, [loaded, tasks, scheduledCalls, automationLog, generatedMitigations, lastAnalysisTime]);

  /* ── Log Event ── */
  const logEvent = useCallback((type: AutomationEventType, accountId: number, account: string, title: string, description: string, metadata?: Record<string, any>) => {
    setAutomationLog(prev => [{
      id: genEventId(),
      type,
      accountId,
      account,
      title,
      description,
      timestamp: new Date().toISOString(),
      metadata,
    }, ...prev]);
  }, []);

  /* ── Apply Strategy ── */
  const applyStrategy = useCallback((rec: AIRecommendation, profile: AccountRiskProfile) => {
    // 1. Generate tasks from each step
    const newTasks = rec.detailedSteps.map((step, i) => convertStepToTask(step, i, rec, profile));
    setTasks(prev => [...newTasks, ...prev]);

    // 2. Schedule calls
    const newCalls = generateCallsFromRec(rec, profile);
    setScheduledCalls(prev => [...newCalls, ...prev]);

    // 3. Create mitigation actions
    const newMitigations = generateMitigationFromRec(rec, profile);
    setGeneratedMitigations(prev => [...newMitigations, ...prev]);

    // 4. Log the automation event
    logEvent("strategy_applied", profile.accountId, profile.account,
      `Strategy Applied: ${rec.title}`,
      `Generated ${newTasks.length} tasks, ${newCalls.length} calls, and ${newMitigations.length} mitigation actions from "${rec.title}" (${rec.confidence}% confidence).`,
      { recId: rec.id, tasksGenerated: newTasks.length, callsScheduled: newCalls.length, mitigationsCreated: newMitigations.length }
    );

    // Log individual task generations
    newTasks.forEach(task => {
      logEvent("task_generated", profile.accountId, profile.account,
        `Task Created: ${task.title}`,
        `Auto-generated from "${rec.title}" step ${task.stepNumber}. Assigned to ${task.assignee}, due ${task.dueDate}.`,
        { taskId: task.id, category: task.category }
      );
    });

    // Log call scheduling
    newCalls.forEach(call => {
      logEvent("call_scheduled", profile.accountId, profile.account,
        `Call Scheduled: ${call.title}`,
        `${call.callType} call with ${call.participants.join(", ")}. Duration: ${call.duration}min.`,
        { callId: call.id, callType: call.callType }
      );
    });
  }, [logEvent]);

  /* ── Run AI Analysis ── */
  const runAIAnalysis = useCallback((profiles: AccountRiskProfile[], highThreshold: number = 70) => {
    setIsAnalyzing(true);

    // Simulate AI analysis with a delay
    setTimeout(() => {
      const criticalProfiles = profiles.filter(p => p.compositeScore >= 60);

      criticalProfiles.forEach(profile => {
        // Generate a discovery task for each at-risk account
        const discoveryTask: AutoTask = {
          id: genTaskId(),
          accountId: profile.accountId,
          account: profile.account,
          title: `AI Analysis: Review ${profile.signalCount} signals for ${profile.account}`,
          description: `AI scan detected ${profile.criticalSignals} critical signals across ${profile.account}. Composite risk score: ${profile.compositeScore}/100. ARR exposed: $${(profile.arrExposed / 1000).toFixed(0)}K. Immediate review recommended.`,
          assignee: assignTeamMember(profile.accountId),
          dueDate: addDays(1),
          priority: profile.compositeScore >= 80 ? "critical" : "high",
          status: "pending",
          source: "ai_analysis",
          category: "review",
          createdAt: new Date().toISOString(),
        };
        setTasks(prev => [discoveryTask, ...prev]);

        // Schedule an urgent call for critical accounts
        if (profile.compositeScore >= highThreshold) {
          const urgentCall: ScheduledCall = {
            id: genCallId(),
            accountId: profile.accountId,
            account: profile.account,
            title: `Urgent Risk Review — ${profile.account}`,
            description: `AI analysis flagged ${profile.account} with risk score ${profile.compositeScore}. Immediate stakeholder alignment needed to prevent $${(profile.arrExposed / 1000).toFixed(0)}K ARR loss.`,
            participants: [assignTeamMember(profile.accountId), "VP Customer Success"],
            scheduledDate: addHours(24),
            duration: 30,
            callType: "escalation",
            status: "scheduled",
            source: "ai_analysis",
            createdAt: new Date().toISOString(),
            agenda: [
              `Review ${profile.signalCount} active signals`,
              "Assess immediate risk mitigation options",
              "Assign ownership for critical actions",
              "Set 48-hour follow-up checkpoint",
            ],
          };
          setScheduledCalls(prev => [urgentCall, ...prev]);

          logEvent("call_scheduled", profile.accountId, profile.account,
            `Urgent Call Scheduled: ${profile.account}`,
            `AI analysis triggered urgent escalation call for risk score ${profile.compositeScore}.`,
            { callType: "escalation" }
          );
        }

        logEvent("task_generated", profile.accountId, profile.account,
          `AI Review Task: ${profile.account}`,
          `AI analysis generated review task for ${profile.signalCount} signals, ${profile.criticalSignals} critical.`,
        );
      });

      logEvent("ai_analysis_run", 0, "All Accounts",
        "AI Analysis Complete",
        `Scanned ${profiles.length} accounts. Found ${criticalProfiles.length} at-risk accounts. Generated ${criticalProfiles.length} review tasks and ${criticalProfiles.filter(p => p.compositeScore >= highThreshold).length} urgent calls.`,
        { accountsScanned: profiles.length, atRiskFound: criticalProfiles.length }
      );

      setIsAnalyzing(false);
      setLastAnalysisTime(new Date().toISOString());
    }, 2000);
  }, [logEvent]);

  /* ── Task Status Update ── */
  const updateTaskStatus = useCallback((taskId: string, status: TaskStatus) => {
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, status, completedAt: status === "completed" ? new Date().toISOString() : undefined } : t
    ));
  }, []);

  /* ── Call Status Update ── */
  const updateCallStatus = useCallback((callId: string, status: CallStatus) => {
    setScheduledCalls(prev => prev.map(c =>
      c.id === callId ? { ...c, status } : c
    ));
  }, []);

  /* ── Getters ── */
  const getTasksForAccount = useCallback((accountId: number) =>
    tasks.filter(t => t.accountId === accountId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [tasks]
  );

  const getCallsForAccount = useCallback((accountId: number) =>
    scheduledCalls.filter(c => c.accountId === accountId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [scheduledCalls]
  );

  const getRecentEvents = useCallback((limit = 20) =>
    automationLog.slice(0, limit),
    [automationLog]
  );

  const getPendingTasks = useCallback(() =>
    tasks.filter(t => t.status === "pending" || t.status === "in_progress").sort((a, b) => {
      const prio = { critical: 0, high: 1, normal: 2, low: 3 };
      return prio[a.priority] - prio[b.priority] || new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }),
    [tasks]
  );

  const getUpcomingCalls = useCallback(() =>
    scheduledCalls.filter(c => c.status === "scheduled").sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()),
    [scheduledCalls]
  );

  /* ── Stats ── */
  const stats = useMemo(() => ({
    totalTasksGenerated: tasks.length,
    tasksCompleted: tasks.filter(t => t.status === "completed").length,
    tasksPending: tasks.filter(t => t.status === "pending" || t.status === "in_progress").length,
    callsScheduled: scheduledCalls.filter(c => c.status === "scheduled").length,
    strategiesApplied: automationLog.filter(e => e.type === "strategy_applied").length,
    analysesRun: automationLog.filter(e => e.type === "ai_analysis_run").length,
  }), [tasks, scheduledCalls, automationLog]);

  const value = useMemo(() => ({
    tasks, scheduledCalls, automationLog, generatedMitigations,
    isAnalyzing, lastAnalysisTime,
    applyStrategy, runAIAnalysis,
    updateTaskStatus, updateCallStatus,
    getTasksForAccount, getCallsForAccount, getRecentEvents,
    getPendingTasks, getUpcomingCalls,
    stats,
  }), [
    tasks, scheduledCalls, automationLog, generatedMitigations,
    isAnalyzing, lastAnalysisTime,
    applyStrategy, runAIAnalysis,
    updateTaskStatus, updateCallStatus,
    getTasksForAccount, getCallsForAccount, getRecentEvents,
    getPendingTasks, getUpcomingCalls,
    stats,
  ]);

  return <MitigationEngineContext.Provider value={value}>{children}</MitigationEngineContext.Provider>;
}

export function useMitigationEngine() {
  const ctx = useContext(MitigationEngineContext);
  if (!ctx) throw new Error("useMitigationEngine must be used within MitigationEngineProvider");
  return ctx;
}
