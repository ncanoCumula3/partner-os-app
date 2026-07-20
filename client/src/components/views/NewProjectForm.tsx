/**
 * NewProjectForm — Multi-step project creation wizard
 * Steps: Basics → Schedule & Budget → Phases & Milestones → Team → Review & Create
 */
import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ACCOUNTS } from "@/lib/data";
import {
  projectTypeLabels, billingModelLabels, projectStatusLabels,
  type ServiceProject, type ProjectType, type BillingModel, type ProjectStatus,
  type ProjectPhase, type ProjectMilestone, type PhaseStatus,
} from "@/lib/projects";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  ArrowLeft, ArrowRight, Check, Plus, Trash2, FolderKanban,
  Building2, Calendar, DollarSign, Users, ClipboardList, Sparkles,
  AlertCircle, ChevronDown,
} from "lucide-react";

/* ── Types ─────────────────────────────────────────────────── */

interface NewProjectFormProps {
  onSubmit: (project: Omit<ServiceProject, "id">) => void;
  onCancel: () => void;
}

interface FormPhase {
  name: string;
  startDate: string;
  endDate: string;
  order: number;
}

interface FormMilestone {
  name: string;
  dueDate: string;
  paymentAmount: string;
}

type Step = 1 | 2 | 3 | 4 | 5;

const STEP_LABELS: Record<Step, { title: string; subtitle: string; icon: React.ElementType }> = {
  1: { title: "Project Basics", subtitle: "Name, account, type, and description", icon: FolderKanban },
  2: { title: "Schedule & Budget", subtitle: "Dates, billing model, and contract value", icon: Calendar },
  3: { title: "Phases & Milestones", subtitle: "Define project phases and payment milestones", icon: ClipboardList },
  4: { title: "Team", subtitle: "Assign project manager and team members", icon: Users },
  5: { title: "Review & Create", subtitle: "Review all details before creating", icon: Sparkles },
};

/* ── Known team members from existing projects ─────────────── */
const KNOWN_MEMBERS = [
  "Jordan Davis", "Sarah Chen", "Priya Nair", "Alex Torres",
  "Marcus Lin", "Dana Reyes", "Tom Hargrove", "Sofia Ruiz",
];

const PLATFORMS = ["NetSuite", "Salesforce", "HubSpot", "SAP", "Oracle", "Microsoft Dynamics", "Workday", "Other"];

/* ── Component ─────────────────────────────────────────────── */

export default function NewProjectForm({ onSubmit, onCancel }: NewProjectFormProps) {
  const [step, setStep] = useState<Step>(1);

  // Step 1 — Basics
  const [name, setName] = useState("");
  const [accountId, setAccountId] = useState<number | null>(null);
  const [projectType, setProjectType] = useState<ProjectType>("implementation");
  const [platform, setPlatform] = useState("NetSuite");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");
  const [tags, setTags] = useState("");

  // Step 2 — Schedule & Budget
  const [startDate, setStartDate] = useState("2026-05-01");
  const [targetEndDate, setTargetEndDate] = useState("2026-11-30");
  const [billingModel, setBillingModel] = useState<BillingModel>("fixed_fee");
  const [contractValue, setContractValue] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [hoursEstimated, setHoursEstimated] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("planning");

  // Step 3 — Phases & Milestones
  const [phases, setPhases] = useState<FormPhase[]>([
    { name: "Discovery & Planning", startDate: "2026-05-01", endDate: "2026-06-01", order: 1 },
    { name: "Design & Configuration", startDate: "2026-06-02", endDate: "2026-07-15", order: 2 },
    { name: "Development", startDate: "2026-07-16", endDate: "2026-09-30", order: 3 },
    { name: "Testing & QA", startDate: "2026-10-01", endDate: "2026-10-31", order: 4 },
    { name: "Go-Live", startDate: "2026-11-01", endDate: "2026-11-30", order: 5 },
  ]);
  const [milestones, setMilestones] = useState<FormMilestone[]>([
    { name: "Project Kickoff", dueDate: "2026-05-01", paymentAmount: "" },
    { name: "Design Approval", dueDate: "2026-06-01", paymentAmount: "" },
  ]);

  // Step 4 — Team
  const [projectManager, setProjectManager] = useState("Jordan Davis");
  const [teamMembers, setTeamMembers] = useState<string[]>(["Jordan Davis"]);
  const [newMember, setNewMember] = useState("");

  /* ── Validation ──────────────────────────────────────────── */

  const step1Valid = name.trim().length >= 3 && accountId !== null && description.trim().length >= 10;
  const step2Valid = !!(startDate && targetEndDate && contractValue && Number(contractValue) > 0 &&
    hoursEstimated && Number(hoursEstimated) > 0 && new Date(targetEndDate) > new Date(startDate));
  const step3Valid = phases.length >= 1 && phases.every(p => p.name.trim().length > 0);
  const step4Valid = projectManager.trim().length > 0 && teamMembers.length >= 1;

  const canAdvance = (s: Step): boolean => {
    switch (s) {
      case 1: return step1Valid;
      case 2: return step2Valid;
      case 3: return step3Valid;
      case 4: return step4Valid;
      case 5: return true;
      default: return false;
    }
  };

  /* ── Phase / Milestone Handlers ─────────────────────────── */

  const addPhase = () => {
    setPhases(prev => [...prev, {
      name: "",
      startDate: prev.length > 0 ? prev[prev.length - 1].endDate : startDate,
      endDate: targetEndDate,
      order: prev.length + 1,
    }]);
  };

  const removePhase = (idx: number) => {
    setPhases(prev => prev.filter((_, i) => i !== idx).map((p, i) => ({ ...p, order: i + 1 })));
  };

  const updatePhase = (idx: number, field: keyof FormPhase, value: string | number) => {
    setPhases(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  const addMilestone = () => {
    setMilestones(prev => [...prev, { name: "", dueDate: targetEndDate, paymentAmount: "" }]);
  };

  const removeMilestone = (idx: number) => {
    setMilestones(prev => prev.filter((_, i) => i !== idx));
  };

  const updateMilestone = (idx: number, field: keyof FormMilestone, value: string) => {
    setMilestones(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m));
  };

  /* ── Team Handlers ──────────────────────────────────────── */

  const addTeamMember = (member: string) => {
    if (member.trim() && !teamMembers.includes(member.trim())) {
      setTeamMembers(prev => [...prev, member.trim()]);
    }
    setNewMember("");
  };

  const removeTeamMember = (member: string) => {
    if (member === projectManager) {
      toast.error("Cannot remove the project manager from the team");
      return;
    }
    setTeamMembers(prev => prev.filter(m => m !== member));
  };

  /* ── Submit ─────────────────────────────────────────────── */

  const handleSubmit = () => {
    const builtPhases: ProjectPhase[] = phases.map((p, i) => ({
      id: i + 1,
      name: p.name,
      status: "not_started" as PhaseStatus,
      startDate: p.startDate,
      endDate: p.endDate,
      completionPct: 0,
      order: p.order,
    }));

    const builtMilestones: ProjectMilestone[] = milestones.map((m, i) => ({
      id: i + 1,
      name: m.name,
      dueDate: m.dueDate,
      status: "upcoming" as const,
      paymentAmount: m.paymentAmount ? Number(m.paymentAmount) : undefined,
    }));

    const project: Omit<ServiceProject, "id"> = {
      accountId: accountId!,
      name: name.trim(),
      type: projectType,
      billingModel,
      status,
      health: "on_track",
      priority,
      startDate,
      targetEndDate,
      contractValue: Number(contractValue),
      budgetConsumed: 0,
      hourlyRate: hourlyRate ? Number(hourlyRate) : undefined,
      hoursEstimated: Number(hoursEstimated),
      hoursLogged: 0,
      projectManager,
      teamMembers,
      completionPct: 0,
      phases: builtPhases,
      milestones: builtMilestones,
      tasks: [],
      updates: [{
        id: 1,
        date: new Date().toISOString().split("T")[0],
        author: projectManager,
        type: "status",
        content: `Project "${name.trim()}" created. Initial status: ${projectStatusLabels[status]}.`,
      }],
      timeEntries: [],
      notes: [],
      description: description.trim(),
      platform,
      tags: tags.split(",").map(t => t.trim()).filter(Boolean),
    };

    onSubmit(project);
  };

  /* ── Render Helpers ─────────────────────────────────────── */

  const accountName = accountId ? ACCOUNTS.find(a => a.id === accountId)?.name : "—";

  const fmtCurrency = (n: number) => {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
    return `$${n.toLocaleString()}`;
  };

  /* ── Field Components ───────────────────────────────────── */

  function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
    return (
      <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
        {children} {required && <span className="text-red-500">*</span>}
      </label>
    );
  }

  function InputField({ value, onChange, placeholder, type = "text", ...props }: {
    value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
    [k: string]: any;
  }) {
    return (
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
        {...props}
      />
    );
  }

  function SelectField({ value, onChange, children }: {
    value: string; onChange: (v: string) => void; children: React.ReactNode;
  }) {
    return (
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground appearance-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors pr-8"
        >
          {children}
        </select>
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>
    );
  }

  /* ── Step Content ───────────────────────────────────────── */

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <FieldLabel required>Project Name</FieldLabel>
                <InputField value={name} onChange={setName} placeholder="e.g., NetSuite ERP Full Implementation" />
                {name.trim().length > 0 && name.trim().length < 3 && (
                  <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Minimum 3 characters</p>
                )}
              </div>
              <div>
                <FieldLabel required>Account</FieldLabel>
                <SelectField value={accountId?.toString() || ""} onChange={v => setAccountId(v ? Number(v) : null)}>
                  <option value="">Select an account...</option>
                  {ACCOUNTS.map(a => (
                    <option key={a.id} value={a.id}>{a.name} — {a.platform}</option>
                  ))}
                </SelectField>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <FieldLabel required>Project Type</FieldLabel>
                <SelectField value={projectType} onChange={v => setProjectType(v as ProjectType)}>
                  {(Object.entries(projectTypeLabels) as [ProjectType, string][]).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </SelectField>
              </div>
              <div>
                <FieldLabel required>Platform</FieldLabel>
                <SelectField value={platform} onChange={setPlatform}>
                  {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                </SelectField>
              </div>
              <div>
                <FieldLabel>Priority</FieldLabel>
                <SelectField value={priority} onChange={v => setPriority(v as "high" | "medium" | "low")}>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </SelectField>
              </div>
            </div>

            <div>
              <FieldLabel required>Description</FieldLabel>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe the project scope, objectives, and key deliverables..."
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors resize-none"
              />
              {description.trim().length > 0 && description.trim().length < 10 && (
                <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Minimum 10 characters</p>
              )}
            </div>

            <div>
              <FieldLabel>Tags</FieldLabel>
              <InputField value={tags} onChange={setTags} placeholder="Comma-separated tags, e.g., ERP, Financials, Inventory" />
              <p className="text-[10px] text-muted-foreground mt-1">Separate tags with commas</p>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <FieldLabel required>Start Date</FieldLabel>
                <InputField type="date" value={startDate} onChange={setStartDate} />
              </div>
              <div>
                <FieldLabel required>Target End Date</FieldLabel>
                <InputField type="date" value={targetEndDate} onChange={setTargetEndDate} />
                {startDate && targetEndDate && new Date(targetEndDate) <= new Date(startDate) && (
                  <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> End date must be after start date</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <FieldLabel required>Billing Model</FieldLabel>
                <SelectField value={billingModel} onChange={v => setBillingModel(v as BillingModel)}>
                  {(Object.entries(billingModelLabels) as [BillingModel, string][]).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </SelectField>
              </div>
              <div>
                <FieldLabel required>Contract Value ($)</FieldLabel>
                <InputField type="number" value={contractValue} onChange={setContractValue} placeholder="e.g., 150000" />
              </div>
              <div>
                <FieldLabel>Initial Status</FieldLabel>
                <SelectField value={status} onChange={v => setStatus(v as ProjectStatus)}>
                  <option value="planning">Planning</option>
                  <option value="in_progress">In Progress</option>
                </SelectField>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <FieldLabel required>Estimated Hours</FieldLabel>
                <InputField type="number" value={hoursEstimated} onChange={setHoursEstimated} placeholder="e.g., 1200" />
              </div>
              {billingModel === "time_materials" && (
                <div>
                  <FieldLabel>Hourly Rate ($)</FieldLabel>
                  <InputField type="number" value={hourlyRate} onChange={setHourlyRate} placeholder="e.g., 175" />
                </div>
              )}
            </div>

            {/* Budget summary */}
            {contractValue && hoursEstimated && (
              <div className="bg-primary/5 rounded-lg p-4 border border-primary/10">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-primary mb-2">Budget Summary</p>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-[10px]">Contract Value</p>
                    <p className="font-bold text-foreground">{fmtCurrency(Number(contractValue))}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-[10px]">Est. Hours</p>
                    <p className="font-bold text-foreground">{Number(hoursEstimated).toLocaleString()}h</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-[10px]">Effective Rate</p>
                    <p className="font-bold text-foreground">
                      ${Math.round(Number(contractValue) / Number(hoursEstimated))}/hr
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            {/* Phases */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">Project Phases</h3>
                <button onClick={addPhase} className="flex items-center gap-1 text-[10px] font-semibold text-primary hover:text-primary/80 transition-colors">
                  <Plus className="w-3 h-3" /> Add Phase
                </button>
              </div>
              <div className="space-y-3">
                {phases.map((phase, idx) => (
                  <div key={idx} className="bg-muted/20 rounded-lg p-3 border border-border">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-primary/60 w-5 text-center">{idx + 1}</span>
                      <div className="flex-1 grid grid-cols-[2fr_1fr_1fr] gap-3">
                        <input
                          value={phase.name}
                          onChange={e => updatePhase(idx, "name", e.target.value)}
                          placeholder="Phase name"
                          className="px-2.5 py-1.5 rounded border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                        <input
                          type="date"
                          value={phase.startDate}
                          onChange={e => updatePhase(idx, "startDate", e.target.value)}
                          className="px-2.5 py-1.5 rounded border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                        <input
                          type="date"
                          value={phase.endDate}
                          onChange={e => updatePhase(idx, "endDate", e.target.value)}
                          className="px-2.5 py-1.5 rounded border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>
                      {phases.length > 1 && (
                        <button onClick={() => removePhase(idx)} className="text-muted-foreground hover:text-red-500 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Milestones */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">Milestones</h3>
                <button onClick={addMilestone} className="flex items-center gap-1 text-[10px] font-semibold text-primary hover:text-primary/80 transition-colors">
                  <Plus className="w-3 h-3" /> Add Milestone
                </button>
              </div>
              <div className="space-y-3">
                {milestones.map((ms, idx) => (
                  <div key={idx} className="bg-muted/20 rounded-lg p-3 border border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-primary/40 shrink-0" />
                      <div className="flex-1 grid grid-cols-[2fr_1fr_1fr] gap-3">
                        <input
                          value={ms.name}
                          onChange={e => updateMilestone(idx, "name", e.target.value)}
                          placeholder="Milestone name"
                          className="px-2.5 py-1.5 rounded border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                        <input
                          type="date"
                          value={ms.dueDate}
                          onChange={e => updateMilestone(idx, "dueDate", e.target.value)}
                          className="px-2.5 py-1.5 rounded border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                        <input
                          type="number"
                          value={ms.paymentAmount}
                          onChange={e => updateMilestone(idx, "paymentAmount", e.target.value)}
                          placeholder="Payment ($)"
                          className="px-2.5 py-1.5 rounded border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>
                      <button onClick={() => removeMilestone(idx)} className="text-muted-foreground hover:text-red-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {milestones.length === 0 && (
                  <div className="text-center py-6 text-[10px] text-muted-foreground/50 border border-dashed border-border rounded-lg">
                    No milestones yet — add one to track key deliverables
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-5">
            <div>
              <FieldLabel required>Project Manager</FieldLabel>
              <SelectField value={projectManager} onChange={v => {
                setProjectManager(v);
                if (!teamMembers.includes(v)) setTeamMembers(prev => [v, ...prev]);
              }}>
                {KNOWN_MEMBERS.map(m => <option key={m} value={m}>{m}</option>)}
              </SelectField>
            </div>

            <div>
              <FieldLabel required>Team Members</FieldLabel>
              <div className="flex flex-wrap gap-2 mb-3">
                {teamMembers.map(member => (
                  <div
                    key={member}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors",
                      member === projectManager
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "bg-muted/30 text-foreground border-border hover:border-red-300 group"
                    )}
                  >
                    <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[8px] font-bold text-muted-foreground">
                      {member.split(" ").map(n => n[0]).join("")}
                    </div>
                    {member}
                    {member === projectManager && (
                      <span className="text-[8px] bg-primary/20 text-primary px-1.5 py-px rounded-full ml-1">PM</span>
                    )}
                    {member !== projectManager && (
                      <button
                        onClick={() => removeTeamMember(member)}
                        className="text-muted-foreground hover:text-red-500 transition-colors ml-1"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Add member */}
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <SelectField value={newMember} onChange={setNewMember}>
                    <option value="">Select a team member to add...</option>
                    {KNOWN_MEMBERS.filter(m => !teamMembers.includes(m)).map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </SelectField>
                </div>
                <button
                  onClick={() => newMember && addTeamMember(newMember)}
                  disabled={!newMember}
                  className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Custom member input */}
              <div className="mt-3">
                <p className="text-[10px] text-muted-foreground mb-1.5">Or add a custom team member:</p>
                <div className="flex gap-2">
                  <input
                    value={newMember}
                    onChange={e => setNewMember(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && newMember.trim()) { addTeamMember(newMember); } }}
                    placeholder="Full name..."
                    className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  />
                  <button
                    onClick={() => newMember.trim() && addTeamMember(newMember)}
                    disabled={!newMember.trim()}
                    className="px-3 py-2 bg-muted text-foreground rounded-lg text-xs font-semibold hover:bg-muted/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-5">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Basics */}
              <div className="bg-muted/20 rounded-lg p-4 border border-border">
                <div className="flex items-center gap-2 mb-3">
                  <FolderKanban className="w-4 h-4 text-primary" />
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Project Basics</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span className="font-medium text-foreground">{name}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Account</span><span className="font-medium text-foreground">{accountName}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="font-medium text-foreground">{projectTypeLabels[projectType]}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Platform</span><span className="font-medium text-foreground">{platform}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Priority</span><span className="font-medium text-foreground capitalize">{priority}</span></div>
                </div>
              </div>

              {/* Schedule & Budget */}
              <div className="bg-muted/20 rounded-lg p-4 border border-border">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="w-4 h-4 text-primary" />
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Schedule & Budget</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Start</span><span className="font-medium text-foreground">{startDate}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">End</span><span className="font-medium text-foreground">{targetEndDate}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Billing</span><span className="font-medium text-foreground">{billingModelLabels[billingModel]}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Contract</span><span className="font-medium text-foreground">{fmtCurrency(Number(contractValue))}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Hours</span><span className="font-medium text-foreground">{Number(hoursEstimated).toLocaleString()}h</span></div>
                </div>
              </div>

              {/* Phases */}
              <div className="bg-muted/20 rounded-lg p-4 border border-border">
                <div className="flex items-center gap-2 mb-3">
                  <ClipboardList className="w-4 h-4 text-primary" />
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phases ({phases.length})</h4>
                </div>
                <div className="space-y-1.5">
                  {phases.map((p, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="text-[10px] font-bold text-primary/60 w-4">{i + 1}.</span>
                      <span className="text-foreground">{p.name || "(unnamed)"}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Team */}
              <div className="bg-muted/20 rounded-lg p-4 border border-border">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-primary" />
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Team ({teamMembers.length})</h4>
                </div>
                <div className="space-y-1.5">
                  {teamMembers.map(m => (
                    <div key={m} className="flex items-center gap-2 text-xs">
                      <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[8px] font-bold text-muted-foreground">
                        {m.split(" ").map(n => n[0]).join("")}
                      </div>
                      <span className="text-foreground">{m}</span>
                      {m === projectManager && <span className="text-[8px] bg-primary/20 text-primary px-1.5 py-px rounded-full">PM</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Milestones summary */}
            {milestones.length > 0 && (
              <div className="bg-muted/20 rounded-lg p-4 border border-border">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4 text-primary" />
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Milestones ({milestones.length})</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {milestones.map((ms, i) => (
                    <div key={i} className="flex items-center justify-between text-xs py-1">
                      <span className="text-foreground">{ms.name || "(unnamed)"}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{ms.dueDate}</span>
                        {ms.paymentAmount && <span className="font-mono font-semibold text-foreground">{fmtCurrency(Number(ms.paymentAmount))}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            <div className="bg-muted/20 rounded-lg p-4 border border-border">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Description</h4>
              <p className="text-sm text-foreground leading-relaxed">{description}</p>
              {tags && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {tags.split(",").map(t => t.trim()).filter(Boolean).map(tag => (
                    <span key={tag} className="text-[9px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
    }
  };

  /* ── Main Render ────────────────────────────────────────── */

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={onCancel} className="p-2 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-foreground">Create New Project</h2>
            <p className="text-xs text-muted-foreground">Fill in the details to create a new implementation or services project</p>
          </div>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-1 mb-8">
        {([1, 2, 3, 4, 5] as Step[]).map(s => {
          const StepIcon = STEP_LABELS[s].icon;
          const isActive = s === step;
          const isCompleted = s < step;
          const isValid = canAdvance(s);
          return (
            <div key={s} className="flex items-center flex-1">
              <button
                onClick={() => {
                  // Allow going back, or forward only if all previous steps valid
                  if (s < step) setStep(s);
                  else if (s === step + 1 && canAdvance(step)) setStep(s);
                }}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-left w-full",
                  isActive ? "bg-primary/10 border border-primary/20" :
                  isCompleted ? "bg-emerald-50 border border-emerald-200 hover:bg-emerald-100" :
                  "bg-muted/20 border border-transparent hover:bg-muted/40"
                )}
              >
                <div className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold",
                  isActive ? "bg-primary text-primary-foreground" :
                  isCompleted ? "bg-emerald-500 text-white" :
                  "bg-muted text-muted-foreground"
                )}>
                  {isCompleted ? <Check className="w-3.5 h-3.5" /> : s}
                </div>
                <div className="hidden lg:block min-w-0">
                  <p className={cn("text-[10px] font-semibold truncate", isActive ? "text-primary" : isCompleted ? "text-emerald-700" : "text-muted-foreground")}>
                    {STEP_LABELS[s].title}
                  </p>
                </div>
              </button>
              {s < 5 && <div className={cn("w-4 h-0.5 shrink-0 mx-0.5", s < step ? "bg-emerald-400" : "bg-muted-foreground/15")} />}
            </div>
          );
        })}
      </div>

      {/* Step Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          {(() => { const Icon = STEP_LABELS[step].icon; return <Icon className="w-5 h-5 text-primary" />; })()}
          <h3 className="text-lg font-semibold text-foreground">{STEP_LABELS[step].title}</h3>
        </div>
        <p className="text-xs text-muted-foreground">{STEP_LABELS[step].subtitle}</p>
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {renderStep()}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8 pt-5 border-t border-border">
        <button
          onClick={() => step > 1 ? setStep((step - 1) as Step) : onCancel()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {step > 1 ? "Previous" : "Cancel"}
        </button>

        <div className="flex items-center gap-3">
          {!canAdvance(step) && step < 5 && (
            <p className="text-[10px] text-amber-600 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Complete all required fields to continue
            </p>
          )}
          {step < 5 ? (
            <button
              onClick={() => setStep((step + 1) as Step)}
              disabled={!canAdvance(step)}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm"
            >
              <Sparkles className="w-4 h-4" /> Create Project
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
