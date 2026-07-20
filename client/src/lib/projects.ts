/**
 * Partner OS — Implementation & Services Project Management
 * Types, seed data, and helper functions
 */

/* ── Types ──────────────────────────────────────────────────── */

export type ProjectType = "implementation" | "enhancement" | "migration" | "consulting";
export type BillingModel = "fixed_fee" | "time_materials" | "milestone_based";
export type ProjectStatus = "planning" | "in_progress" | "on_hold" | "completed" | "cancelled";
export type ProjectHealth = "on_track" | "at_risk" | "off_track";
export type TaskStatus = "todo" | "in_progress" | "review" | "done" | "blocked";
export type TaskPriority = "critical" | "high" | "medium" | "low";
export type MilestoneStatus = "upcoming" | "completed" | "overdue" | "at_risk";
export type PhaseStatus = "not_started" | "in_progress" | "completed";

export interface ProjectPhase {
  id: number;
  name: string;
  status: PhaseStatus;
  startDate: string;
  endDate: string;
  completionPct: number;
  order: number;
}

export interface ProjectTask {
  id: number;
  phaseId: number;
  title: string;
  assignee: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  hoursEstimated: number;
  hoursLogged: number;
  description?: string;
  tags?: string[];
}

export interface ProjectMilestone {
  id: number;
  name: string;
  dueDate: string;
  completedDate?: string;
  status: MilestoneStatus;
  paymentAmount?: number;
  phaseId?: number;
}

export interface ProjectUpdate {
  id: number;
  date: string;
  author: string;
  type: "status" | "note" | "risk" | "milestone" | "budget";
  content: string;
}

export interface TimeEntry {
  id: number;
  taskId: number;
  date: string;
  hours: number;
  person: string;
  description: string;
}

export type NoteCategory = "general" | "technical" | "decision" | "risk" | "client_feedback" | "internal";

export interface ProjectNote {
  id: number;
  projectId: number;
  author: string;
  createdAt: string;
  updatedAt?: string;
  title: string;
  content: string;
  category: NoteCategory;
  pinned: boolean;
  taskId?: number;  // optional link to a task
  phaseId?: number; // optional link to a phase
}

export const noteCategoryLabels: Record<NoteCategory, string> = {
  general: "General",
  technical: "Technical",
  decision: "Decision",
  risk: "Risk / Issue",
  client_feedback: "Client Feedback",
  internal: "Internal",
};

export const noteCategoryColors: Record<NoteCategory, { bg: string; text: string; dot: string }> = {
  general: { bg: "bg-slate-50", text: "text-slate-700", dot: "bg-slate-400" },
  technical: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  decision: { bg: "bg-violet-50", text: "text-violet-700", dot: "bg-violet-500" },
  risk: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
  client_feedback: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  internal: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
};

export interface ServiceProject {
  id: number;
  accountId: number;
  name: string;
  type: ProjectType;
  billingModel: BillingModel;
  status: ProjectStatus;
  health: ProjectHealth;
  priority: "high" | "medium" | "low";
  startDate: string;
  targetEndDate: string;
  actualEndDate?: string;
  contractValue: number;
  budgetConsumed: number;
  hourlyRate?: number;
  hoursEstimated: number;
  hoursLogged: number;
  projectManager: string;
  teamMembers: string[];
  completionPct: number;
  phases: ProjectPhase[];
  milestones: ProjectMilestone[];
  tasks: ProjectTask[];
  updates: ProjectUpdate[];
  timeEntries: TimeEntry[];
  notes: ProjectNote[];
  description: string;
  platform: string;
  tags: string[];
}

/* ── Color / Label Helpers ──────────────────────────────────── */

export const projectTypeLabels: Record<ProjectType, string> = {
  implementation: "Implementation",
  enhancement: "Enhancement",
  migration: "Migration",
  consulting: "Consulting",
};

export const projectTypeColors: Record<ProjectType, { bg: string; text: string; border: string }> = {
  implementation: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  enhancement: { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200" },
  migration: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  consulting: { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200" },
};

export const billingModelLabels: Record<BillingModel, string> = {
  fixed_fee: "Fixed Fee",
  time_materials: "Time & Materials",
  milestone_based: "Milestone-Based",
};

export const projectStatusLabels: Record<ProjectStatus, string> = {
  planning: "Planning",
  in_progress: "In Progress",
  on_hold: "On Hold",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const projectStatusColors: Record<ProjectStatus, { bg: string; text: string; dot: string }> = {
  planning: { bg: "bg-slate-50", text: "text-slate-700", dot: "bg-slate-400" },
  in_progress: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  on_hold: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  completed: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  cancelled: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-400" },
};

export const healthColors: Record<ProjectHealth, { bg: string; text: string; dot: string; label: string }> = {
  on_track: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "On Track" },
  at_risk: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500", label: "At Risk" },
  off_track: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500", label: "Off Track" },
};

export const taskStatusLabels: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  review: "In Review",
  done: "Done",
  blocked: "Blocked",
};

export const taskStatusColors: Record<TaskStatus, { bg: string; text: string; dot: string }> = {
  todo: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
  in_progress: { bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500" },
  review: { bg: "bg-violet-100", text: "text-violet-700", dot: "bg-violet-500" },
  done: { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
  blocked: { bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500" },
};

export const taskPriorityColors: Record<TaskPriority, { bg: string; text: string }> = {
  critical: { bg: "bg-red-100", text: "text-red-700" },
  high: { bg: "bg-orange-100", text: "text-orange-700" },
  medium: { bg: "bg-amber-100", text: "text-amber-700" },
  low: { bg: "bg-slate-100", text: "text-slate-600" },
};

export const milestoneStatusColors: Record<MilestoneStatus, { bg: string; text: string; dot: string }> = {
  upcoming: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-400" },
  completed: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  overdue: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
  at_risk: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
};

/* ── Computation Helpers ────────────────────────────────────── */

export function getProjectBudgetPct(p: ServiceProject): number {
  if (p.contractValue <= 0) return 0;
  return Math.round((p.budgetConsumed / p.contractValue) * 100);
}

export function getProjectDaysRemaining(p: ServiceProject): number {
  const end = new Date(p.targetEndDate);
  const now = new Date("2026-04-15");
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function getProjectDuration(p: ServiceProject): number {
  const start = new Date(p.startDate);
  const end = new Date(p.targetEndDate);
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

export function getProjectElapsedPct(p: ServiceProject): number {
  const start = new Date(p.startDate);
  const end = new Date(p.targetEndDate);
  const now = new Date("2026-04-15");
  const total = end.getTime() - start.getTime();
  if (total <= 0) return 100;
  const elapsed = now.getTime() - start.getTime();
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
}

export function getTasksByStatus(tasks: ProjectTask[]): Record<TaskStatus, ProjectTask[]> {
  const result: Record<TaskStatus, ProjectTask[]> = {
    todo: [], in_progress: [], review: [], done: [], blocked: [],
  };
  tasks.forEach(t => result[t.status].push(t));
  return result;
}

export function getProjectsForAccount(accountId: number): ServiceProject[] {
  return SERVICE_PROJECTS.filter(p => p.accountId === accountId);
}

export function getActiveProjects(): ServiceProject[] {
  return SERVICE_PROJECTS.filter(p => p.status === "in_progress" || p.status === "planning");
}

export function getProjectKPIs(projects: ServiceProject[]) {
  const active = projects.filter(p => p.status === "in_progress" || p.status === "planning");
  const totalContractValue = projects.reduce((s, p) => s + p.contractValue, 0);
  const totalBudgetConsumed = projects.reduce((s, p) => s + p.budgetConsumed, 0);
  const onTrack = active.filter(p => p.health === "on_track").length;
  const atRisk = active.filter(p => p.health === "at_risk").length;
  const offTrack = active.filter(p => p.health === "off_track").length;
  const allTasks = projects.flatMap(p => p.tasks);
  const overdueTasks = allTasks.filter(t => t.status !== "done" && new Date(t.dueDate) < new Date("2026-04-15"));
  const completedProjects = projects.filter(p => p.status === "completed").length;
  const avgCompletion = active.length > 0
    ? Math.round(active.reduce((s, p) => s + p.completionPct, 0) / active.length)
    : 0;
  const totalHoursLogged = projects.reduce((s, p) => s + p.hoursLogged, 0);
  const totalHoursEstimated = projects.reduce((s, p) => s + p.hoursEstimated, 0);

  return {
    activeCount: active.length,
    completedCount: completedProjects,
    totalContractValue,
    totalBudgetConsumed,
    budgetUtilization: totalContractValue > 0 ? Math.round((totalBudgetConsumed / totalContractValue) * 100) : 0,
    onTrack,
    atRisk,
    offTrack,
    overdueTasks: overdueTasks.length,
    avgCompletion,
    totalHoursLogged,
    totalHoursEstimated,
    hoursUtilization: totalHoursEstimated > 0 ? Math.round((totalHoursLogged / totalHoursEstimated) * 100) : 0,
  };
}

/* ── Seed Data ──────────────────────────────────────────────── */

export const SERVICE_PROJECTS: ServiceProject[] = [
  // ─── Project 1: Apex Manufacturing — NetSuite Implementation ───
  {
    id: 1,
    accountId: 1,
    name: "NetSuite ERP Full Implementation",
    type: "implementation",
    billingModel: "milestone_based",
    status: "in_progress",
    health: "on_track",
    priority: "high",
    startDate: "2026-01-15",
    targetEndDate: "2026-07-31",
    contractValue: 185000,
    budgetConsumed: 98500,
    hoursEstimated: 1200,
    hoursLogged: 680,
    projectManager: "Jordan Davis",
    teamMembers: ["Jordan Davis", "Sarah Chen", "Priya Nair", "Alex Torres"],
    completionPct: 58,
    description: "Full NetSuite ERP implementation including Financials, Inventory, Manufacturing, CRM, and Analytics modules. Includes data migration from legacy system, custom workflows, and user training.",
    platform: "NetSuite",
    tags: ["ERP", "Financials", "Inventory", "Manufacturing"],
    phases: [
      { id: 1, name: "Discovery & Planning", status: "completed", startDate: "2026-01-15", endDate: "2026-02-14", completionPct: 100, order: 1 },
      { id: 2, name: "Design & Configuration", status: "completed", startDate: "2026-02-15", endDate: "2026-03-21", completionPct: 100, order: 2 },
      { id: 3, name: "Data Migration", status: "in_progress", startDate: "2026-03-22", endDate: "2026-04-25", completionPct: 65, order: 3 },
      { id: 4, name: "Development & Customization", status: "in_progress", startDate: "2026-04-01", endDate: "2026-05-15", completionPct: 40, order: 4 },
      { id: 5, name: "Testing & QA", status: "not_started", startDate: "2026-05-16", endDate: "2026-06-15", completionPct: 0, order: 5 },
      { id: 6, name: "Training & Documentation", status: "not_started", startDate: "2026-06-16", endDate: "2026-07-10", completionPct: 0, order: 6 },
      { id: 7, name: "Go-Live & Hypercare", status: "not_started", startDate: "2026-07-11", endDate: "2026-07-31", completionPct: 0, order: 7 },
    ],
    milestones: [
      { id: 1, name: "Project Kickoff", dueDate: "2026-01-15", completedDate: "2026-01-15", status: "completed" },
      { id: 2, name: "Requirements Sign-off", dueDate: "2026-02-14", completedDate: "2026-02-12", status: "completed", paymentAmount: 37000 },
      { id: 3, name: "Design Approval", dueDate: "2026-03-21", completedDate: "2026-03-20", status: "completed", paymentAmount: 37000 },
      { id: 4, name: "Data Migration Complete", dueDate: "2026-04-25", status: "upcoming", paymentAmount: 37000 },
      { id: 5, name: "UAT Sign-off", dueDate: "2026-06-15", status: "upcoming", paymentAmount: 37000 },
      { id: 6, name: "Go-Live", dueDate: "2026-07-15", status: "upcoming", paymentAmount: 37000 },
    ],
    tasks: [
      { id: 101, phaseId: 3, title: "Extract legacy financial data", assignee: "Sarah Chen", status: "done", priority: "high", dueDate: "2026-04-05", hoursEstimated: 24, hoursLogged: 22 },
      { id: 102, phaseId: 3, title: "Cleanse customer master data", assignee: "Priya Nair", status: "done", priority: "high", dueDate: "2026-04-08", hoursEstimated: 16, hoursLogged: 18 },
      { id: 103, phaseId: 3, title: "Map inventory SKUs to NetSuite items", assignee: "Alex Torres", status: "in_progress", priority: "high", dueDate: "2026-04-18", hoursEstimated: 32, hoursLogged: 20 },
      { id: 104, phaseId: 3, title: "Validate migrated GL balances", assignee: "Sarah Chen", status: "todo", priority: "critical", dueDate: "2026-04-22", hoursEstimated: 16, hoursLogged: 0 },
      { id: 105, phaseId: 4, title: "Build custom approval workflows", assignee: "Jordan Davis", status: "in_progress", priority: "high", dueDate: "2026-04-28", hoursEstimated: 40, hoursLogged: 18 },
      { id: 106, phaseId: 4, title: "Configure manufacturing BOM structures", assignee: "Alex Torres", status: "in_progress", priority: "medium", dueDate: "2026-05-02", hoursEstimated: 32, hoursLogged: 12 },
      { id: 107, phaseId: 4, title: "Develop custom dashboard reports", assignee: "Priya Nair", status: "todo", priority: "medium", dueDate: "2026-05-08", hoursEstimated: 24, hoursLogged: 0 },
      { id: 108, phaseId: 4, title: "Build CRM integration scripts", assignee: "Sarah Chen", status: "todo", priority: "medium", dueDate: "2026-05-12", hoursEstimated: 20, hoursLogged: 0 },
      { id: 109, phaseId: 5, title: "Create UAT test scripts", assignee: "Jordan Davis", status: "todo", priority: "high", dueDate: "2026-05-20", hoursEstimated: 16, hoursLogged: 0 },
      { id: 110, phaseId: 5, title: "Execute regression testing", assignee: "Priya Nair", status: "todo", priority: "high", dueDate: "2026-06-05", hoursEstimated: 40, hoursLogged: 0 },
      { id: 111, phaseId: 6, title: "Prepare training materials", assignee: "Jordan Davis", status: "todo", priority: "medium", dueDate: "2026-06-20", hoursEstimated: 24, hoursLogged: 0 },
      { id: 112, phaseId: 6, title: "Conduct end-user training sessions", assignee: "Sarah Chen", status: "todo", priority: "high", dueDate: "2026-07-05", hoursEstimated: 32, hoursLogged: 0 },
      { id: 113, phaseId: 7, title: "Production cutover", assignee: "Jordan Davis", status: "todo", priority: "critical", dueDate: "2026-07-15", hoursEstimated: 16, hoursLogged: 0 },
      { id: 114, phaseId: 7, title: "Post go-live support & monitoring", assignee: "Alex Torres", status: "todo", priority: "high", dueDate: "2026-07-31", hoursEstimated: 40, hoursLogged: 0 },
    ],
    updates: [
      { id: 1, date: "2026-04-14", author: "Jordan Davis", type: "status", content: "Data migration Phase 3 proceeding well. Inventory SKU mapping taking slightly longer than expected due to legacy data inconsistencies, but within buffer." },
      { id: 2, date: "2026-04-10", author: "Sarah Chen", type: "milestone", content: "Financial data extraction completed successfully. All GL balances reconciled against source system." },
      { id: 3, date: "2026-04-07", author: "Jordan Davis", type: "note", content: "Client requested additional custom fields on the Sales Order form. Change request submitted — minimal impact to timeline." },
      { id: 4, date: "2026-03-20", author: "Jordan Davis", type: "milestone", content: "Design phase completed on schedule. All configuration documents approved by client." },
    ],
    timeEntries: [
      { id: 1, taskId: 101, date: "2026-04-03", hours: 8, person: "Sarah Chen", description: "Financial data extraction — AP/AR aging" },
      { id: 2, taskId: 101, date: "2026-04-04", hours: 7, person: "Sarah Chen", description: "GL balance extraction and validation" },
      { id: 3, taskId: 101, date: "2026-04-05", hours: 7, person: "Sarah Chen", description: "Final reconciliation and sign-off" },
      { id: 4, taskId: 102, date: "2026-04-06", hours: 8, person: "Priya Nair", description: "Customer master data cleansing" },
      { id: 5, taskId: 102, date: "2026-04-07", hours: 6, person: "Priya Nair", description: "Vendor master data cleansing" },
      { id: 6, taskId: 102, date: "2026-04-08", hours: 4, person: "Priya Nair", description: "Data validation and duplicate removal" },
      { id: 7, taskId: 103, date: "2026-04-10", hours: 8, person: "Alex Torres", description: "SKU mapping — raw materials" },
      { id: 8, taskId: 103, date: "2026-04-11", hours: 6, person: "Alex Torres", description: "SKU mapping — finished goods" },
      { id: 9, taskId: 103, date: "2026-04-14", hours: 6, person: "Alex Torres", description: "SKU mapping — WIP items" },
      { id: 10, taskId: 105, date: "2026-04-10", hours: 8, person: "Jordan Davis", description: "PO approval workflow design" },
      { id: 11, taskId: 105, date: "2026-04-14", hours: 10, person: "Jordan Davis", description: "PO approval workflow SuiteScript" },
      { id: 12, taskId: 106, date: "2026-04-12", hours: 6, person: "Alex Torres", description: "BOM structure configuration" },
      { id: 13, taskId: 106, date: "2026-04-14", hours: 6, person: "Alex Torres", description: "BOM routing setup" },
    ],
    notes: [
      { id: 1, projectId: 1, author: "Jordan Davis", createdAt: "2026-04-14T14:30:00Z", title: "Data migration approach finalized", content: "After evaluating both bulk import and SuiteScript approaches, the team decided to use CSV import for master data and SuiteScript for transactional data. This gives us better error handling for the 50K+ transaction records while keeping the simpler master data path efficient.", category: "decision" as NoteCategory, pinned: true },
      { id: 2, projectId: 1, author: "Sarah Chen", createdAt: "2026-04-12T10:15:00Z", title: "GL mapping discrepancy found", content: "Found 23 GL accounts in legacy system that don't have a direct NetSuite equivalent. Created a mapping spreadsheet and scheduled a review with the client's controller for Thursday. Need resolution before we can proceed with financial data migration.", category: "technical" as NoteCategory, pinned: false },
      { id: 3, projectId: 1, author: "Alex Torres", createdAt: "2026-04-10T16:45:00Z", title: "BOM structure complexity higher than estimated", content: "The manufacturing BOM has 7 levels of nesting vs. the 3-4 we scoped. This will add approximately 20 hours to the BOM configuration task. Flagging for PM review and potential change order.", category: "risk" as NoteCategory, pinned: true },
      { id: 4, projectId: 1, author: "Jordan Davis", createdAt: "2026-04-08T09:00:00Z", title: "Client kickoff feedback", content: "CFO expressed concern about parallel-run timeline. They want at least 2 full month-end closes running in parallel before cutover. This may push go-live by 2-3 weeks. Will discuss impact in next steering committee.", category: "client_feedback" as NoteCategory, pinned: false },
      { id: 5, projectId: 1, author: "Priya Nair", createdAt: "2026-04-05T11:30:00Z", title: "Data cleansing progress update", content: "Completed customer and vendor master data cleansing. Removed 340 duplicate records and standardized address formats. Item master is next — expecting higher complexity due to legacy SKU naming conventions.", category: "general" as NoteCategory, pinned: false },
    ],
  },

  // ─── Project 2: BlueWave Logistics — Salesforce Enhancement ───
  {
    id: 2,
    accountId: 2,
    name: "Salesforce CPQ & Revenue Cloud Enhancement",
    type: "enhancement",
    billingModel: "time_materials",
    status: "in_progress",
    health: "at_risk",
    priority: "high",
    startDate: "2026-02-01",
    targetEndDate: "2026-05-30",
    contractValue: 72000,
    budgetConsumed: 54200,
    hourlyRate: 175,
    hoursEstimated: 420,
    hoursLogged: 310,
    projectManager: "Sarah Chen",
    teamMembers: ["Sarah Chen", "Jordan Davis", "Marcus Lin"],
    completionPct: 62,
    description: "Enhancement of existing Salesforce instance with CPQ (Configure, Price, Quote) and Revenue Cloud modules. Includes custom pricing rules, approval workflows, and revenue recognition automation.",
    platform: "Salesforce",
    tags: ["CPQ", "Revenue Cloud", "Automation"],
    phases: [
      { id: 1, name: "Requirements & Analysis", status: "completed", startDate: "2026-02-01", endDate: "2026-02-21", completionPct: 100, order: 1 },
      { id: 2, name: "CPQ Configuration", status: "completed", startDate: "2026-02-22", endDate: "2026-03-28", completionPct: 100, order: 2 },
      { id: 3, name: "Revenue Cloud Setup", status: "in_progress", startDate: "2026-03-29", endDate: "2026-04-30", completionPct: 55, order: 3 },
      { id: 4, name: "Integration & Testing", status: "not_started", startDate: "2026-05-01", endDate: "2026-05-22", completionPct: 0, order: 4 },
      { id: 5, name: "Deployment & Training", status: "not_started", startDate: "2026-05-23", endDate: "2026-05-30", completionPct: 0, order: 5 },
    ],
    milestones: [
      { id: 1, name: "Requirements Approved", dueDate: "2026-02-21", completedDate: "2026-02-20", status: "completed" },
      { id: 2, name: "CPQ Go-Live", dueDate: "2026-03-28", completedDate: "2026-04-02", status: "completed" },
      { id: 3, name: "Revenue Cloud Go-Live", dueDate: "2026-04-30", status: "at_risk" },
      { id: 4, name: "Full Deployment", dueDate: "2026-05-30", status: "upcoming" },
    ],
    tasks: [
      { id: 201, phaseId: 3, title: "Configure revenue recognition rules", assignee: "Sarah Chen", status: "done", priority: "critical", dueDate: "2026-04-10", hoursEstimated: 24, hoursLogged: 28 },
      { id: 202, phaseId: 3, title: "Build multi-currency invoice templates", assignee: "Marcus Lin", status: "blocked", priority: "critical", dueDate: "2026-04-12", hoursEstimated: 16, hoursLogged: 20, description: "Blocked by currency API rate limit issue" },
      { id: 203, phaseId: 3, title: "Automate revenue scheduling", assignee: "Sarah Chen", status: "in_progress", priority: "high", dueDate: "2026-04-20", hoursEstimated: 20, hoursLogged: 12 },
      { id: 204, phaseId: 3, title: "Custom pricing waterfall report", assignee: "Jordan Davis", status: "in_progress", priority: "medium", dueDate: "2026-04-25", hoursEstimated: 16, hoursLogged: 8 },
      { id: 205, phaseId: 4, title: "ERP integration testing", assignee: "Marcus Lin", status: "todo", priority: "high", dueDate: "2026-05-08", hoursEstimated: 32, hoursLogged: 0 },
      { id: 206, phaseId: 4, title: "End-to-end quote-to-cash testing", assignee: "Sarah Chen", status: "todo", priority: "critical", dueDate: "2026-05-15", hoursEstimated: 24, hoursLogged: 0 },
      { id: 207, phaseId: 5, title: "Sales team training sessions", assignee: "Jordan Davis", status: "todo", priority: "high", dueDate: "2026-05-26", hoursEstimated: 16, hoursLogged: 0 },
      { id: 208, phaseId: 5, title: "Production deployment", assignee: "Sarah Chen", status: "todo", priority: "critical", dueDate: "2026-05-30", hoursEstimated: 8, hoursLogged: 0 },
    ],
    updates: [
      { id: 1, date: "2026-04-14", author: "Sarah Chen", type: "risk", content: "Multi-currency invoice template blocked by Salesforce API rate limiting. Engaged Salesforce support — ETA 3-5 business days for resolution. May impact Revenue Cloud go-live date." },
      { id: 2, date: "2026-04-10", author: "Sarah Chen", type: "status", content: "Revenue recognition rules configured and tested. Moving to automation phase. Budget tracking at 75% consumed with 62% completion — monitoring closely." },
      { id: 3, date: "2026-04-02", author: "Jordan Davis", type: "milestone", content: "CPQ module went live 4 days late due to complex pricing rule edge cases. Sales team adoption going well." },
    ],
    timeEntries: [
      { id: 20, taskId: 201, date: "2026-04-08", hours: 8, person: "Sarah Chen", description: "Revenue recognition rule configuration" },
      { id: 21, taskId: 201, date: "2026-04-09", hours: 8, person: "Sarah Chen", description: "Testing revenue schedules" },
      { id: 22, taskId: 202, date: "2026-04-10", hours: 8, person: "Marcus Lin", description: "Multi-currency template development" },
      { id: 23, taskId: 202, date: "2026-04-11", hours: 6, person: "Marcus Lin", description: "Debugging API rate limit issue" },
      { id: 24, taskId: 203, date: "2026-04-12", hours: 6, person: "Sarah Chen", description: "Revenue scheduling automation" },
      { id: 25, taskId: 204, date: "2026-04-14", hours: 8, person: "Jordan Davis", description: "Pricing waterfall report design" },
    ],
    notes: [
      { id: 10, projectId: 2, author: "Sarah Chen", createdAt: "2026-04-13T15:20:00Z", title: "Multi-currency API rate limit blocking progress", content: "Salesforce API rate limit is causing failures when processing invoices in 5+ currencies simultaneously. Opened a case with Salesforce support. Marcus is investigating a batch processing workaround.", category: "technical" as NoteCategory, pinned: true },
      { id: 11, projectId: 2, author: "Jordan Davis", createdAt: "2026-04-11T10:00:00Z", title: "Budget overrun risk — T&M tracking", content: "Current burn rate puts us at 75% budget consumed with only 62% completion. The multi-currency blocker is the primary driver. If not resolved this week, we need to discuss a change order with the client.", category: "risk" as NoteCategory, pinned: true },
      { id: 12, projectId: 2, author: "Marcus Lin", createdAt: "2026-04-09T14:00:00Z", title: "CPQ pricing rules — edge case discovered", content: "Volume discount tiers don't cascade correctly when combined with partner pricing. Need to add a custom Apex trigger to handle the priority logic. Estimated 8 additional hours.", category: "technical" as NoteCategory, pinned: false },
    ],
  },

  // ─── Project 3: ClearPath Retail — HubSpot Consulting ───
  {
    id: 3,
    accountId: 3,
    name: "HubSpot Marketing Automation Strategy",
    type: "consulting",
    billingModel: "fixed_fee",
    status: "in_progress",
    health: "on_track",
    priority: "medium",
    startDate: "2026-03-01",
    targetEndDate: "2026-05-15",
    contractValue: 28000,
    budgetConsumed: 16800,
    hoursEstimated: 180,
    hoursLogged: 108,
    projectManager: "Priya Nair",
    teamMembers: ["Priya Nair", "Jordan Davis"],
    completionPct: 60,
    description: "Strategic consulting engagement to optimize HubSpot marketing automation. Includes audit of current workflows, lead scoring model redesign, campaign architecture, and reporting framework.",
    platform: "HubSpot",
    tags: ["Marketing Automation", "Lead Scoring", "Strategy"],
    phases: [
      { id: 1, name: "Current State Audit", status: "completed", startDate: "2026-03-01", endDate: "2026-03-14", completionPct: 100, order: 1 },
      { id: 2, name: "Strategy Development", status: "completed", startDate: "2026-03-15", endDate: "2026-03-31", completionPct: 100, order: 2 },
      { id: 3, name: "Implementation Roadmap", status: "in_progress", startDate: "2026-04-01", endDate: "2026-04-25", completionPct: 50, order: 3 },
      { id: 4, name: "Enablement & Handoff", status: "not_started", startDate: "2026-04-26", endDate: "2026-05-15", completionPct: 0, order: 4 },
    ],
    milestones: [
      { id: 1, name: "Audit Report Delivered", dueDate: "2026-03-14", completedDate: "2026-03-14", status: "completed", paymentAmount: 7000 },
      { id: 2, name: "Strategy Deck Approved", dueDate: "2026-03-31", completedDate: "2026-03-30", status: "completed", paymentAmount: 7000 },
      { id: 3, name: "Roadmap Finalized", dueDate: "2026-04-25", status: "upcoming", paymentAmount: 7000 },
      { id: 4, name: "Final Handoff", dueDate: "2026-05-15", status: "upcoming", paymentAmount: 7000 },
    ],
    tasks: [
      { id: 301, phaseId: 3, title: "Design lead scoring model v2", assignee: "Priya Nair", status: "done", priority: "high", dueDate: "2026-04-10", hoursEstimated: 16, hoursLogged: 14 },
      { id: 302, phaseId: 3, title: "Map campaign architecture", assignee: "Priya Nair", status: "in_progress", priority: "high", dueDate: "2026-04-18", hoursEstimated: 20, hoursLogged: 10 },
      { id: 303, phaseId: 3, title: "Build reporting dashboard specs", assignee: "Jordan Davis", status: "todo", priority: "medium", dueDate: "2026-04-22", hoursEstimated: 12, hoursLogged: 0 },
      { id: 304, phaseId: 4, title: "Create implementation playbook", assignee: "Priya Nair", status: "todo", priority: "high", dueDate: "2026-05-05", hoursEstimated: 16, hoursLogged: 0 },
      { id: 305, phaseId: 4, title: "Conduct team enablement workshop", assignee: "Jordan Davis", status: "todo", priority: "medium", dueDate: "2026-05-12", hoursEstimated: 8, hoursLogged: 0 },
    ],
    updates: [
      { id: 1, date: "2026-04-14", author: "Priya Nair", type: "status", content: "Lead scoring model v2 completed and reviewed with ClearPath marketing team. Campaign architecture mapping in progress — on track for Apr 25 roadmap delivery." },
      { id: 2, date: "2026-03-30", author: "Priya Nair", type: "milestone", content: "Strategy deck approved by ClearPath leadership. Identified 3 quick-win automation opportunities." },
    ],
    timeEntries: [
      { id: 30, taskId: 301, date: "2026-04-07", hours: 6, person: "Priya Nair", description: "Lead scoring model analysis" },
      { id: 31, taskId: 301, date: "2026-04-08", hours: 8, person: "Priya Nair", description: "Lead scoring model design" },
      { id: 32, taskId: 302, date: "2026-04-14", hours: 6, person: "Priya Nair", description: "Campaign architecture mapping" },
    ],
    notes: [
      { id: 20, projectId: 3, author: "Priya Nair", createdAt: "2026-04-14T11:00:00Z", title: "Lead scoring model redesign complete", content: "Finished the new lead scoring model based on behavioral signals (page visits, email engagement, form fills) and firmographic data. The model weights demo requests 3x higher than whitepaper downloads. Client approved the model in today's review.", category: "decision" as NoteCategory, pinned: true },
      { id: 21, projectId: 3, author: "Priya Nair", createdAt: "2026-04-10T09:30:00Z", title: "Current HubSpot audit findings", content: "Audit revealed 47 active workflows, 12 of which are redundant or conflicting. Recommended consolidating to 28 workflows. Also found 3 nurture sequences with <2% engagement — recommending sunset.", category: "general" as NoteCategory, pinned: false },
    ],
  },

  // ─── Project 4: Driftwood Capital — Salesforce Implementation ───
  {
    id: 4,
    accountId: 4,
    name: "Salesforce Financial Services Cloud Implementation",
    type: "implementation",
    billingModel: "fixed_fee",
    status: "planning",
    health: "on_track",
    priority: "high",
    startDate: "2026-05-01",
    targetEndDate: "2026-11-30",
    contractValue: 320000,
    budgetConsumed: 12000,
    hoursEstimated: 2000,
    hoursLogged: 48,
    projectManager: "Jordan Davis",
    teamMembers: ["Jordan Davis", "Sarah Chen", "Alex Torres", "Priya Nair"],
    completionPct: 5,
    description: "Enterprise-scale Salesforce Financial Services Cloud implementation for wealth management operations. Includes client lifecycle management, portfolio analytics, compliance workflows, and advisor productivity tools.",
    platform: "Salesforce",
    tags: ["FSC", "Wealth Management", "Compliance", "Analytics"],
    phases: [
      { id: 1, name: "Pre-Project Planning", status: "in_progress", startDate: "2026-04-01", endDate: "2026-04-30", completionPct: 60, order: 1 },
      { id: 2, name: "Discovery & Requirements", status: "not_started", startDate: "2026-05-01", endDate: "2026-06-15", completionPct: 0, order: 2 },
      { id: 3, name: "Architecture & Design", status: "not_started", startDate: "2026-06-16", endDate: "2026-07-31", completionPct: 0, order: 3 },
      { id: 4, name: "Build & Configure", status: "not_started", startDate: "2026-08-01", endDate: "2026-09-30", completionPct: 0, order: 4 },
      { id: 5, name: "Testing & Validation", status: "not_started", startDate: "2026-10-01", endDate: "2026-10-31", completionPct: 0, order: 5 },
      { id: 6, name: "Deployment & Go-Live", status: "not_started", startDate: "2026-11-01", endDate: "2026-11-30", completionPct: 0, order: 6 },
    ],
    milestones: [
      { id: 1, name: "SOW Signed", dueDate: "2026-04-15", completedDate: "2026-04-10", status: "completed", paymentAmount: 64000 },
      { id: 2, name: "Requirements Complete", dueDate: "2026-06-15", status: "upcoming", paymentAmount: 64000 },
      { id: 3, name: "Design Sign-off", dueDate: "2026-07-31", status: "upcoming", paymentAmount: 64000 },
      { id: 4, name: "UAT Complete", dueDate: "2026-10-31", status: "upcoming", paymentAmount: 64000 },
      { id: 5, name: "Go-Live", dueDate: "2026-11-30", status: "upcoming", paymentAmount: 64000 },
    ],
    tasks: [
      { id: 401, phaseId: 1, title: "Finalize project charter", assignee: "Jordan Davis", status: "done", priority: "high", dueDate: "2026-04-10", hoursEstimated: 8, hoursLogged: 6 },
      { id: 402, phaseId: 1, title: "Assemble project team & RACI", assignee: "Jordan Davis", status: "in_progress", priority: "high", dueDate: "2026-04-18", hoursEstimated: 8, hoursLogged: 4 },
      { id: 403, phaseId: 1, title: "Set up project infrastructure", assignee: "Sarah Chen", status: "in_progress", priority: "medium", dueDate: "2026-04-22", hoursEstimated: 12, hoursLogged: 6 },
      { id: 404, phaseId: 1, title: "Stakeholder kickoff preparation", assignee: "Jordan Davis", status: "todo", priority: "high", dueDate: "2026-04-28", hoursEstimated: 8, hoursLogged: 0 },
      { id: 405, phaseId: 2, title: "Conduct discovery workshops", assignee: "Jordan Davis", status: "todo", priority: "critical", dueDate: "2026-05-15", hoursEstimated: 40, hoursLogged: 0 },
      { id: 406, phaseId: 2, title: "Document business requirements", assignee: "Priya Nair", status: "todo", priority: "high", dueDate: "2026-06-01", hoursEstimated: 32, hoursLogged: 0 },
    ],
    updates: [
      { id: 1, date: "2026-04-14", author: "Jordan Davis", type: "status", content: "Pre-project planning on track. SOW signed ahead of schedule. Team assembly in progress — targeting full kickoff May 1." },
      { id: 2, date: "2026-04-10", author: "Jordan Davis", type: "milestone", content: "Statement of Work signed by Driftwood Capital. $64K initial payment received." },
    ],
    timeEntries: [
      { id: 40, taskId: 401, date: "2026-04-08", hours: 6, person: "Jordan Davis", description: "Project charter drafting" },
      { id: 41, taskId: 402, date: "2026-04-14", hours: 4, person: "Jordan Davis", description: "Team RACI matrix" },
      { id: 42, taskId: 403, date: "2026-04-12", hours: 6, person: "Sarah Chen", description: "Sandbox provisioning and CI/CD setup" },
    ],
    notes: [
      { id: 30, projectId: 4, author: "Jordan Davis", createdAt: "2026-04-14T16:00:00Z", title: "Compliance requirements confirmed", content: "Met with Driftwood Capital's compliance officer. Confirmed we need SOC 2 Type II controls for data handling, SEC Rule 17a-4 for record retention, and FINRA suitability requirements for the advisor tools. Adding compliance review gates to each phase.", category: "decision" as NoteCategory, pinned: true },
      { id: 31, projectId: 4, author: "Sarah Chen", createdAt: "2026-04-12T13:45:00Z", title: "Sandbox environment ready", content: "Provisioned the Salesforce FSC sandbox with CI/CD pipeline via GitHub Actions. All team members have access. Test data seeding script is ready — includes 500 sample client records with portfolio data.", category: "technical" as NoteCategory, pinned: false },
    ],
  },

  // ─── Project 5: Edgeline Foods — NetSuite Enhancement (At Risk) ───
  {
    id: 5,
    accountId: 5,
    name: "NetSuite Inventory Optimization Enhancement",
    type: "enhancement",
    billingModel: "time_materials",
    status: "on_hold",
    health: "off_track",
    priority: "high",
    startDate: "2026-01-10",
    targetEndDate: "2026-04-30",
    contractValue: 45000,
    budgetConsumed: 38200,
    hourlyRate: 165,
    hoursEstimated: 280,
    hoursLogged: 232,
    projectManager: "Sarah Chen",
    teamMembers: ["Sarah Chen", "Priya Nair"],
    completionPct: 68,
    description: "Enhancement of NetSuite inventory management with demand forecasting, automated reorder points, and warehouse optimization. Project on hold due to client budget concerns and potential downsell.",
    platform: "NetSuite",
    tags: ["Inventory", "Demand Forecasting", "Optimization"],
    phases: [
      { id: 1, name: "Analysis & Planning", status: "completed", startDate: "2026-01-10", endDate: "2026-01-31", completionPct: 100, order: 1 },
      { id: 2, name: "Demand Forecasting Module", status: "completed", startDate: "2026-02-01", endDate: "2026-02-28", completionPct: 100, order: 2 },
      { id: 3, name: "Reorder Automation", status: "in_progress", startDate: "2026-03-01", endDate: "2026-03-31", completionPct: 75, order: 3 },
      { id: 4, name: "Warehouse Optimization", status: "not_started", startDate: "2026-04-01", endDate: "2026-04-20", completionPct: 0, order: 4 },
      { id: 5, name: "Testing & Deployment", status: "not_started", startDate: "2026-04-21", endDate: "2026-04-30", completionPct: 0, order: 5 },
    ],
    milestones: [
      { id: 1, name: "Forecasting Module Live", dueDate: "2026-02-28", completedDate: "2026-03-05", status: "completed" },
      { id: 2, name: "Reorder Automation Live", dueDate: "2026-03-31", status: "overdue" },
      { id: 3, name: "Full Deployment", dueDate: "2026-04-30", status: "at_risk" },
    ],
    tasks: [
      { id: 501, phaseId: 3, title: "Configure reorder point calculations", assignee: "Sarah Chen", status: "done", priority: "high", dueDate: "2026-03-15", hoursEstimated: 20, hoursLogged: 24 },
      { id: 502, phaseId: 3, title: "Build automated PO generation", assignee: "Priya Nair", status: "blocked", priority: "critical", dueDate: "2026-03-25", hoursEstimated: 24, hoursLogged: 18, description: "Blocked — client paused project due to budget review" },
      { id: 503, phaseId: 3, title: "Vendor lead time integration", assignee: "Sarah Chen", status: "blocked", priority: "high", dueDate: "2026-03-31", hoursEstimated: 16, hoursLogged: 8, description: "Blocked — awaiting client decision on project continuation" },
      { id: 504, phaseId: 4, title: "Warehouse zone optimization", assignee: "Priya Nair", status: "todo", priority: "medium", dueDate: "2026-04-15", hoursEstimated: 24, hoursLogged: 0 },
      { id: 505, phaseId: 5, title: "Integration testing", assignee: "Sarah Chen", status: "todo", priority: "high", dueDate: "2026-04-25", hoursEstimated: 16, hoursLogged: 0 },
    ],
    updates: [
      { id: 1, date: "2026-04-14", author: "Sarah Chen", type: "risk", content: "Project remains on hold. Edgeline Foods reviewing budget allocation. Risk of scope reduction — client may drop warehouse optimization phase entirely. Budget at 85% consumed with only 68% completion." },
      { id: 2, date: "2026-04-01", author: "Sarah Chen", type: "status", content: "Client requested project pause effective immediately. Budget concerns cited. Scheduled review meeting for April 15." },
      { id: 3, date: "2026-03-25", author: "Priya Nair", type: "risk", content: "Automated PO generation blocked — client stakeholder unavailable for approval workflow decisions." },
    ],
    timeEntries: [
      { id: 50, taskId: 501, date: "2026-03-12", hours: 8, person: "Sarah Chen", description: "Reorder point algorithm development" },
      { id: 51, taskId: 501, date: "2026-03-13", hours: 8, person: "Sarah Chen", description: "Reorder point testing" },
      { id: 52, taskId: 502, date: "2026-03-20", hours: 8, person: "Priya Nair", description: "PO generation workflow" },
      { id: 53, taskId: 502, date: "2026-03-22", hours: 6, person: "Priya Nair", description: "PO generation — vendor mapping" },
      { id: 54, taskId: 503, date: "2026-03-28", hours: 8, person: "Sarah Chen", description: "Lead time integration — partial" },
    ],
    notes: [
      { id: 40, projectId: 5, author: "Jordan Davis", createdAt: "2026-04-10T10:00:00Z", title: "Project on hold — client budget review", content: "Edgeline Foods has paused this project pending internal budget review. Their CFO is evaluating whether to continue with the full scope or reduce to basic inventory only. We should not log additional hours until we get a green light. Next check-in scheduled for April 20.", category: "risk" as NoteCategory, pinned: true },
      { id: 41, projectId: 5, author: "Sarah Chen", createdAt: "2026-03-28T14:00:00Z", title: "Reorder point algorithm validated", content: "The demand forecasting algorithm passed validation against 6 months of historical data. Accuracy within 8% for A-class items and 15% for B-class. C-class items need a different approach — simple min/max may be more appropriate.", category: "technical" as NoteCategory, pinned: false },
      { id: 42, projectId: 5, author: "Priya Nair", createdAt: "2026-03-25T11:30:00Z", title: "Client expressed frustration with timeline", content: "During our last call, the operations director expressed frustration that the automated PO generation isn't live yet. They're still processing 200+ POs manually per week. Need to manage expectations given the budget hold.", category: "client_feedback" as NoteCategory, pinned: false },
    ],
  },

  // ─── Project 6: Apex Manufacturing — Data Migration ───
  {
    id: 6,
    accountId: 1,
    name: "Legacy ERP Data Migration",
    type: "migration",
    billingModel: "fixed_fee",
    status: "completed",
    health: "on_track",
    priority: "medium",
    startDate: "2025-10-01",
    targetEndDate: "2025-12-31",
    actualEndDate: "2025-12-28",
    contractValue: 42000,
    budgetConsumed: 39500,
    hoursEstimated: 260,
    hoursLogged: 245,
    projectManager: "Sarah Chen",
    teamMembers: ["Sarah Chen", "Alex Torres"],
    completionPct: 100,
    description: "Migration of 8 years of financial, inventory, and customer data from legacy ERP system to NetSuite. Included data cleansing, transformation, validation, and parallel-run period.",
    platform: "NetSuite",
    tags: ["Data Migration", "Legacy ERP", "ETL"],
    phases: [
      { id: 1, name: "Data Assessment", status: "completed", startDate: "2025-10-01", endDate: "2025-10-15", completionPct: 100, order: 1 },
      { id: 2, name: "Mapping & Transformation", status: "completed", startDate: "2025-10-16", endDate: "2025-11-15", completionPct: 100, order: 2 },
      { id: 3, name: "Migration Execution", status: "completed", startDate: "2025-11-16", endDate: "2025-12-10", completionPct: 100, order: 3 },
      { id: 4, name: "Validation & Sign-off", status: "completed", startDate: "2025-12-11", endDate: "2025-12-28", completionPct: 100, order: 4 },
    ],
    milestones: [
      { id: 1, name: "Data Assessment Complete", dueDate: "2025-10-15", completedDate: "2025-10-14", status: "completed", paymentAmount: 10500 },
      { id: 2, name: "Mapping Approved", dueDate: "2025-11-15", completedDate: "2025-11-13", status: "completed", paymentAmount: 10500 },
      { id: 3, name: "Migration Complete", dueDate: "2025-12-10", completedDate: "2025-12-10", status: "completed", paymentAmount: 10500 },
      { id: 4, name: "Final Sign-off", dueDate: "2025-12-31", completedDate: "2025-12-28", status: "completed", paymentAmount: 10500 },
    ],
    tasks: [
      { id: 601, phaseId: 1, title: "Inventory data profiling", assignee: "Alex Torres", status: "done", priority: "high", dueDate: "2025-10-10", hoursEstimated: 16, hoursLogged: 14 },
      { id: 602, phaseId: 2, title: "Build ETL pipelines", assignee: "Sarah Chen", status: "done", priority: "critical", dueDate: "2025-11-05", hoursEstimated: 40, hoursLogged: 42 },
      { id: 603, phaseId: 3, title: "Execute production migration", assignee: "Sarah Chen", status: "done", priority: "critical", dueDate: "2025-12-08", hoursEstimated: 24, hoursLogged: 22 },
      { id: 604, phaseId: 4, title: "Reconciliation report", assignee: "Alex Torres", status: "done", priority: "high", dueDate: "2025-12-20", hoursEstimated: 16, hoursLogged: 18 },
    ],
    updates: [
      { id: 1, date: "2025-12-28", author: "Sarah Chen", type: "milestone", content: "Project completed 3 days ahead of schedule. All data validated and signed off by Apex Manufacturing." },
    ],
    timeEntries: [],
    notes: [
      { id: 50, projectId: 6, author: "Sarah Chen", createdAt: "2025-12-28T10:00:00Z", title: "Migration completed successfully", content: "All 8 years of data migrated and validated. Zero data loss confirmed via reconciliation reports. Client signed off on all 4 milestones. Lessons learned document shared with the team.", category: "general" as NoteCategory, pinned: true },
    ],
  },
];
