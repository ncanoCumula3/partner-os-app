/*
 * SLAConfigView — Customizable SLA configuration engine
 * Categories: Support, Customer Inquiry, Product/Feature Info, Consulting Services
 * Urgency: Critical, High, Medium, Low
 * Wide service coverage: CRM/ERP support, marketing, sales, biz dev, tax/audit, etc.
 * Warm adaptive theme
 */
import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAdminSettings, type SLARule as AdminSLARule } from "@/contexts/AdminSettingsContext";
import {
  Clock, AlertTriangle, Settings2, ChevronDown, ChevronRight,
  Shield, Zap, Timer, Bell, Save, RotateCcw, Plus, Pencil,
  LifeBuoy, Mail, Phone, Package, Briefcase, TrendingUp,
  FileText, Calculator, Users, Megaphone, Target, Building2,
  CheckCircle2, Info, X,
} from "lucide-react";

/* ── Types ──────────────────────────────────────────────────── */
interface SLARule {
  id: string;
  category: string;
  subcategory: string;
  channel: string;
  urgency: "Critical" | "High" | "Medium" | "Low";
  firstResponse: number; // minutes
  resolution: number; // minutes
  escalationAfter: number; // minutes
  escalateTo: string;
  notifyBefore: number; // minutes before breach
  active: boolean;
}

interface ServiceCategory {
  id: string;
  name: string;
  icon: React.ElementType;
  description: string;
  subcategories: string[];
  color: string;
}

/* ── Constants ──────────────────────────────────────────────── */
const SERVICE_CATEGORIES: ServiceCategory[] = [
  {
    id: "support",
    name: "Technical Support",
    icon: LifeBuoy,
    description: "CRM, ERP, and application support tickets",
    subcategories: [
      "Bug / Error Resolution",
      "Configuration Issue",
      "Data Migration Support",
      "Integration Troubleshooting",
      "Performance Optimization",
      "Security Incident",
      "User Access / Permissions",
      "Custom Development Support",
    ],
    color: "text-red-600",
  },
  {
    id: "inquiry",
    name: "Customer Inquiries",
    icon: Mail,
    description: "Inbound questions via email, phone, or chat",
    subcategories: [
      "General Account Question",
      "Billing / Invoice Inquiry",
      "Contract / Renewal Question",
      "Feature Request",
      "Training / Onboarding Help",
      "Compliance / Audit Question",
    ],
    color: "text-primary",
  },
  {
    id: "product",
    name: "Product & Feature Info",
    icon: Package,
    description: "Requests for information about products, features, and capabilities",
    subcategories: [
      "New Product Demo Request",
      "Feature Capability Inquiry",
      "CRM Module Information",
      "ERP Module Information",
      "Integration Capabilities",
      "Pricing / Packaging Info",
      "Roadmap / Upcoming Features",
    ],
    color: "text-amber-600",
  },
  {
    id: "consulting",
    name: "Consulting Services",
    icon: Briefcase,
    description: "Business development, marketing, sales, tax, audit, and advisory",
    subcategories: [
      "Business Development Strategy",
      "Marketing Services",
      "Sales Enablement",
      "Go-to-Market Planning",
      "Tax Advisory",
      "Audit & Compliance",
      "Financial Planning & Analysis",
      "Digital Transformation",
      "Process Optimization",
      "Change Management",
      "Technology Advisory",
      "M&A Due Diligence",
    ],
    color: "text-primary",
  },
];

const CHANNELS = ["Email", "Phone", "Chat", "Portal", "In-Person", "API/Webhook"];

const URGENCY_LEVELS = [
  { id: "Critical" as const, label: "Critical", color: "text-red-600 bg-red-500/10 border-red-200", icon: AlertTriangle, description: "System down, data loss, security breach" },
  { id: "High" as const, label: "High", color: "text-orange-400 bg-orange-400/10 border-orange-400/20", icon: Zap, description: "Major feature broken, business impact" },
  { id: "Medium" as const, label: "Medium", color: "text-amber-600 bg-amber-500/10 border-amber-200", icon: Timer, description: "Workaround available, moderate impact" },
  { id: "Low" as const, label: "Low", color: "text-emerald-700 bg-emerald-600/10 border-emerald-200", icon: Info, description: "Minor issue, informational request" },
];

const ESCALATION_ROLES = [
  "Team Lead",
  "Senior Consultant",
  "Account Manager",
  "Department Head",
  "VP of Customer Success",
  "CTO / Executive",
];

const DEFAULT_SLA_RULES: SLARule[] = [
  // Technical Support
  { id: "sla-1", category: "support", subcategory: "Bug / Error Resolution", channel: "Email", urgency: "Critical", firstResponse: 15, resolution: 120, escalationAfter: 30, escalateTo: "Department Head", notifyBefore: 10, active: true },
  { id: "sla-2", category: "support", subcategory: "Bug / Error Resolution", channel: "Phone", urgency: "Critical", firstResponse: 5, resolution: 60, escalationAfter: 15, escalateTo: "CTO / Executive", notifyBefore: 5, active: true },
  { id: "sla-3", category: "support", subcategory: "Security Incident", channel: "Email", urgency: "Critical", firstResponse: 10, resolution: 60, escalationAfter: 15, escalateTo: "CTO / Executive", notifyBefore: 5, active: true },
  { id: "sla-4", category: "support", subcategory: "Configuration Issue", channel: "Email", urgency: "High", firstResponse: 30, resolution: 240, escalationAfter: 60, escalateTo: "Team Lead", notifyBefore: 15, active: true },
  { id: "sla-5", category: "support", subcategory: "Integration Troubleshooting", channel: "Email", urgency: "High", firstResponse: 30, resolution: 480, escalationAfter: 120, escalateTo: "Senior Consultant", notifyBefore: 30, active: true },
  { id: "sla-6", category: "support", subcategory: "User Access / Permissions", channel: "Chat", urgency: "Medium", firstResponse: 60, resolution: 480, escalationAfter: 240, escalateTo: "Team Lead", notifyBefore: 30, active: true },
  { id: "sla-7", category: "support", subcategory: "Performance Optimization", channel: "Email", urgency: "Medium", firstResponse: 120, resolution: 1440, escalationAfter: 480, escalateTo: "Senior Consultant", notifyBefore: 60, active: true },
  // Customer Inquiries
  { id: "sla-8", category: "inquiry", subcategory: "General Account Question", channel: "Email", urgency: "Medium", firstResponse: 120, resolution: 1440, escalationAfter: 480, escalateTo: "Account Manager", notifyBefore: 60, active: true },
  { id: "sla-9", category: "inquiry", subcategory: "General Account Question", channel: "Phone", urgency: "Medium", firstResponse: 5, resolution: 60, escalationAfter: 30, escalateTo: "Account Manager", notifyBefore: 10, active: true },
  { id: "sla-10", category: "inquiry", subcategory: "Billing / Invoice Inquiry", channel: "Email", urgency: "High", firstResponse: 60, resolution: 480, escalationAfter: 120, escalateTo: "Account Manager", notifyBefore: 30, active: true },
  { id: "sla-11", category: "inquiry", subcategory: "Contract / Renewal Question", channel: "Email", urgency: "High", firstResponse: 60, resolution: 1440, escalationAfter: 240, escalateTo: "VP of Customer Success", notifyBefore: 60, active: true },
  { id: "sla-12", category: "inquiry", subcategory: "Training / Onboarding Help", channel: "Email", urgency: "Low", firstResponse: 240, resolution: 2880, escalationAfter: 1440, escalateTo: "Team Lead", notifyBefore: 120, active: true },
  // Product & Feature Info
  { id: "sla-13", category: "product", subcategory: "New Product Demo Request", channel: "Email", urgency: "High", firstResponse: 60, resolution: 1440, escalationAfter: 480, escalateTo: "Account Manager", notifyBefore: 60, active: true },
  { id: "sla-14", category: "product", subcategory: "Feature Capability Inquiry", channel: "Email", urgency: "Medium", firstResponse: 120, resolution: 1440, escalationAfter: 480, escalateTo: "Senior Consultant", notifyBefore: 60, active: true },
  { id: "sla-15", category: "product", subcategory: "Pricing / Packaging Info", channel: "Phone", urgency: "High", firstResponse: 15, resolution: 240, escalationAfter: 60, escalateTo: "Account Manager", notifyBefore: 15, active: true },
  { id: "sla-16", category: "product", subcategory: "Integration Capabilities", channel: "Email", urgency: "Medium", firstResponse: 120, resolution: 2880, escalationAfter: 1440, escalateTo: "Senior Consultant", notifyBefore: 120, active: true },
  // Consulting Services
  { id: "sla-17", category: "consulting", subcategory: "Business Development Strategy", channel: "Email", urgency: "Medium", firstResponse: 240, resolution: 4320, escalationAfter: 1440, escalateTo: "Department Head", notifyBefore: 120, active: true },
  { id: "sla-18", category: "consulting", subcategory: "Marketing Services", channel: "Email", urgency: "Medium", firstResponse: 240, resolution: 4320, escalationAfter: 1440, escalateTo: "Department Head", notifyBefore: 120, active: true },
  { id: "sla-19", category: "consulting", subcategory: "Sales Enablement", channel: "Email", urgency: "High", firstResponse: 120, resolution: 2880, escalationAfter: 720, escalateTo: "VP of Customer Success", notifyBefore: 60, active: true },
  { id: "sla-20", category: "consulting", subcategory: "Tax Advisory", channel: "Email", urgency: "High", firstResponse: 120, resolution: 2880, escalationAfter: 720, escalateTo: "Department Head", notifyBefore: 60, active: true },
  { id: "sla-21", category: "consulting", subcategory: "Audit & Compliance", channel: "Email", urgency: "Critical", firstResponse: 60, resolution: 1440, escalationAfter: 240, escalateTo: "CTO / Executive", notifyBefore: 30, active: true },
  { id: "sla-22", category: "consulting", subcategory: "Digital Transformation", channel: "Email", urgency: "Medium", firstResponse: 480, resolution: 10080, escalationAfter: 2880, escalateTo: "VP of Customer Success", notifyBefore: 240, active: true },
  { id: "sla-23", category: "consulting", subcategory: "M&A Due Diligence", channel: "Email", urgency: "Critical", firstResponse: 30, resolution: 480, escalationAfter: 120, escalateTo: "CTO / Executive", notifyBefore: 15, active: true },
];

/* ── Helpers ────────────────────────────────────────────────── */
function formatTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ${minutes % 60 > 0 ? `${minutes % 60}m` : ""}`.trim();
  const days = Math.floor(minutes / 1440);
  const hrs = Math.floor((minutes % 1440) / 60);
  return `${days}d ${hrs > 0 ? `${hrs}h` : ""}`.trim();
}

/* ── Main Component ─────────────────────────────────────────── */
export default function SLAConfigView() {
  const { slaRules, setSlaRules } = useAdminSettings();
  // Use shared context rules as source of truth
  const [rules, setRules] = useState<SLARule[]>(slaRules as SLARule[]);

  // Sync local state to context whenever rules change
  useEffect(() => {
    setSlaRules(rules as AdminSLARule[]);
  }, [rules, setSlaRules]);

  // Sync from context if external changes come in (e.g. reset to defaults)
  useEffect(() => {
    setRules(slaRules as SLARule[]);
  }, [slaRules]);
  const [expandedCategory, setExpandedCategory] = useState<string | null>("support");
  const [editingRule, setEditingRule] = useState<string | null>(null);
  const [filterUrgency, setFilterUrgency] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // New rule form state
  const [newRule, setNewRule] = useState<Partial<SLARule>>({
    category: "support",
    subcategory: "",
    channel: "Email",
    urgency: "Medium",
    firstResponse: 60,
    resolution: 480,
    escalationAfter: 120,
    escalateTo: "Team Lead",
    notifyBefore: 30,
    active: true,
  });

  const filteredRules = useMemo(() => {
    return rules.filter((r) => !filterUrgency || r.urgency === filterUrgency);
  }, [rules, filterUrgency]);

  const rulesByCategory = useMemo(() => {
    const map: Record<string, SLARule[]> = {};
    for (const cat of SERVICE_CATEGORIES) {
      map[cat.id] = filteredRules.filter((r) => r.category === cat.id);
    }
    return map;
  }, [filteredRules]);

  const stats = useMemo(() => ({
    total: rules.length,
    active: rules.filter((r) => r.active).length,
    critical: rules.filter((r) => r.urgency === "Critical").length,
    categories: SERVICE_CATEGORIES.length,
  }), [rules]);

  const handleToggleActive = (id: string) => {
    setRules((prev) => prev.map((r) => r.id === id ? { ...r, active: !r.active } : r));
    setHasChanges(true);
  };

  const handleUpdateRule = (id: string, field: keyof SLARule, value: number | string) => {
    setRules((prev) => prev.map((r) => r.id === id ? { ...r, [field]: value } : r));
    setHasChanges(true);
  };

  const handleAddRule = () => {
    if (!newRule.subcategory) return;
    const rule: SLARule = {
      id: `sla-${Date.now()}`,
      category: newRule.category || "support",
      subcategory: newRule.subcategory || "",
      channel: newRule.channel || "Email",
      urgency: (newRule.urgency as SLARule["urgency"]) || "Medium",
      firstResponse: newRule.firstResponse || 60,
      resolution: newRule.resolution || 480,
      escalationAfter: newRule.escalationAfter || 120,
      escalateTo: newRule.escalateTo || "Team Lead",
      notifyBefore: newRule.notifyBefore || 30,
      active: true,
    };
    setRules((prev) => [...prev, rule]);
    setShowAddModal(false);
    setHasChanges(true);
    setNewRule({
      category: "support", subcategory: "", channel: "Email", urgency: "Medium",
      firstResponse: 60, resolution: 480, escalationAfter: 120, escalateTo: "Team Lead", notifyBefore: 30, active: true,
    });
  };

  const handleSave = () => {
    setHasChanges(false);
    setSlaRules(rules as AdminSLARule[]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">SLA Configuration</h1>
              <p className="text-xs text-muted-foreground">Define response and resolution time guidelines by category, urgency, and channel</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 h-9 px-4 rounded-lg bg-gradient-to-r from-primary to-primary/70 text-foreground text-xs font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Rule
          </button>
          {hasChanges && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={handleSave}
              className="flex items-center gap-2 h-9 px-4 rounded-lg bg-emerald-500/20 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-500/30 transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              Save Changes
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* Stats row */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Rules", value: stats.total, icon: FileText, color: "text-primary" },
          { label: "Active Rules", value: stats.active, icon: CheckCircle2, color: "text-emerald-700" },
          { label: "Critical SLAs", value: stats.critical, icon: AlertTriangle, color: "text-red-600" },
          { label: "Service Categories", value: stats.categories, icon: Building2, color: "text-amber-600" },
        ].map((s, i) => (
          <div key={s.label} className="rounded-xl border border-border bg-card/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <s.icon className={cn("w-4 h-4", s.color)} />
              <span className="text-[10px] tracking-[0.08em] uppercase text-muted-foreground/60">{s.label}</span>
            </div>
            <div className="text-2xl font-bold text-foreground font-mono">{s.value}</div>
          </div>
        ))}
      </motion.div>

      {/* Urgency filter */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex items-center gap-2">
        <span className="text-[10px] tracking-[0.08em] uppercase text-muted-foreground/50 mr-2">Filter by urgency:</span>
        <button
          onClick={() => setFilterUrgency(null)}
          className={cn(
            "h-7 px-3 rounded-full text-[11px] font-medium border transition-all",
            !filterUrgency ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"
          )}
        >
          All
        </button>
        {URGENCY_LEVELS.map((u) => (
          <button
            key={u.id}
            onClick={() => setFilterUrgency(filterUrgency === u.id ? null : u.id)}
            className={cn(
              "h-7 px-3 rounded-full text-[11px] font-medium border transition-all flex items-center gap-1.5",
              filterUrgency === u.id ? u.color + " border-current/30" : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            <u.icon className="w-3 h-3" />
            {u.label}
          </button>
        ))}
      </motion.div>

      {/* Category accordion */}
      <div className="space-y-3">
        {SERVICE_CATEGORIES.map((cat, catIdx) => {
          const catRules = rulesByCategory[cat.id] || [];
          const isExpanded = expandedCategory === cat.id;
          const CatIcon = cat.icon;

          return (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 + catIdx * 0.04 }}
              className="rounded-xl border border-border bg-card/30 overflow-hidden"
            >
              {/* Category header */}
              <button
                onClick={() => setExpandedCategory(isExpanded ? null : cat.id)}
                className="w-full flex items-center gap-3 p-4 hover:bg-muted/10 transition-colors"
              >
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center bg-current/10", cat.color)}>
                  <CatIcon className="w-4.5 h-4.5" />
                </div>
                <div className="text-left flex-1">
                  <div className="text-sm font-semibold text-foreground">{cat.name}</div>
                  <div className="text-[11px] text-muted-foreground/50">{cat.description}</div>
                </div>
                <div className="flex items-center gap-3 mr-2">
                  <span className="text-[11px] text-muted-foreground/40 font-mono">{catRules.length} rules</span>
                  <span className="text-[11px] text-muted-foreground/40">{cat.subcategories.length} subcategories</span>
                </div>
                <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.15 }}>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
                </motion.div>
              </button>

              {/* Rules table */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-border">
                      {/* Table header */}
                      <div className="grid grid-cols-[1fr_90px_80px_90px_90px_90px_100px_70px_50px] gap-2 px-4 py-2 text-[9px] tracking-[0.1em] uppercase text-muted-foreground/40 border-b border-border/50">
                        <span>Subcategory</span>
                        <span>Channel</span>
                        <span>Urgency</span>
                        <span>1st Response</span>
                        <span>Resolution</span>
                        <span>Escalate At</span>
                        <span>Escalate To</span>
                        <span>Alert</span>
                        <span>Active</span>
                      </div>

                      {/* Rules */}
                      {catRules.length === 0 ? (
                        <div className="px-4 py-8 text-center text-xs text-muted-foreground/30">
                          No rules configured for this category with the current filter
                        </div>
                      ) : (
                        catRules.map((rule, i) => {
                          const urgency = URGENCY_LEVELS.find((u) => u.id === rule.urgency);
                          const isEditing = editingRule === rule.id;

                          return (
                            <motion.div
                              key={rule.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: i * 0.02 }}
                              className={cn(
                                "grid grid-cols-[1fr_90px_80px_90px_90px_90px_100px_70px_50px] gap-2 px-4 py-2.5 items-center text-[12px] border-b border-border/30 transition-colors",
                                isEditing ? "bg-primary/[0.03]" : "hover:bg-muted/5",
                                !rule.active && "opacity-40"
                              )}
                            >
                              {/* Subcategory */}
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setEditingRule(isEditing ? null : rule.id)}
                                  className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground/30 hover:text-primary hover:bg-primary/10 transition-colors shrink-0"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                                <span className="text-foreground/80 truncate">{rule.subcategory}</span>
                              </div>

                              {/* Channel */}
                              {isEditing ? (
                                <select
                                  value={rule.channel}
                                  onChange={(e) => handleUpdateRule(rule.id, "channel", e.target.value)}
                                  className="h-7 rounded bg-card border border-border text-[11px] text-foreground px-1"
                                >
                                  {CHANNELS.map((ch) => <option key={ch} value={ch}>{ch}</option>)}
                                </select>
                              ) : (
                                <span className="text-muted-foreground/60 flex items-center gap-1">
                                  {rule.channel === "Phone" && <Phone className="w-3 h-3" />}
                                  {rule.channel === "Email" && <Mail className="w-3 h-3" />}
                                  {rule.channel}
                                </span>
                              )}

                              {/* Urgency */}
                              {isEditing ? (
                                <select
                                  value={rule.urgency}
                                  onChange={(e) => handleUpdateRule(rule.id, "urgency", e.target.value)}
                                  className="h-7 rounded bg-card border border-border text-[11px] text-foreground px-1"
                                >
                                  {URGENCY_LEVELS.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
                                </select>
                              ) : (
                                <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border w-fit", urgency?.color)}>
                                  {rule.urgency}
                                </span>
                              )}

                              {/* First Response */}
                              {isEditing ? (
                                <input
                                  type="number"
                                  value={rule.firstResponse}
                                  onChange={(e) => handleUpdateRule(rule.id, "firstResponse", parseInt(e.target.value) || 0)}
                                  className="h-7 w-full rounded bg-card border border-border text-[11px] text-foreground px-2 font-mono"
                                />
                              ) : (
                                <span className="font-mono text-foreground/70">{formatTime(rule.firstResponse)}</span>
                              )}

                              {/* Resolution */}
                              {isEditing ? (
                                <input
                                  type="number"
                                  value={rule.resolution}
                                  onChange={(e) => handleUpdateRule(rule.id, "resolution", parseInt(e.target.value) || 0)}
                                  className="h-7 w-full rounded bg-card border border-border text-[11px] text-foreground px-2 font-mono"
                                />
                              ) : (
                                <span className="font-mono text-foreground/70">{formatTime(rule.resolution)}</span>
                              )}

                              {/* Escalation After */}
                              {isEditing ? (
                                <input
                                  type="number"
                                  value={rule.escalationAfter}
                                  onChange={(e) => handleUpdateRule(rule.id, "escalationAfter", parseInt(e.target.value) || 0)}
                                  className="h-7 w-full rounded bg-card border border-border text-[11px] text-foreground px-2 font-mono"
                                />
                              ) : (
                                <span className="font-mono text-muted-foreground/50">{formatTime(rule.escalationAfter)}</span>
                              )}

                              {/* Escalate To */}
                              {isEditing ? (
                                <select
                                  value={rule.escalateTo}
                                  onChange={(e) => handleUpdateRule(rule.id, "escalateTo", e.target.value)}
                                  className="h-7 rounded bg-card border border-border text-[11px] text-foreground px-1"
                                >
                                  {ESCALATION_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                                </select>
                              ) : (
                                <span className="text-muted-foreground/50 truncate">{rule.escalateTo}</span>
                              )}

                              {/* Notify Before */}
                              {isEditing ? (
                                <input
                                  type="number"
                                  value={rule.notifyBefore}
                                  onChange={(e) => handleUpdateRule(rule.id, "notifyBefore", parseInt(e.target.value) || 0)}
                                  className="h-7 w-full rounded bg-card border border-border text-[11px] text-foreground px-2 font-mono"
                                />
                              ) : (
                                <span className="text-muted-foreground/50 flex items-center gap-1 font-mono">
                                  <Bell className="w-3 h-3 text-amber-600/40" />
                                  {formatTime(rule.notifyBefore)}
                                </span>
                              )}

                              {/* Active toggle */}
                              <button
                                onClick={() => handleToggleActive(rule.id)}
                                className={cn(
                                  "w-9 h-5 rounded-full relative transition-colors",
                                  rule.active ? "bg-emerald-600/30" : "bg-muted/30"
                                )}
                              >
                                <motion.div
                                  animate={{ x: rule.active ? 16 : 2 }}
                                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                  className={cn(
                                    "w-4 h-4 rounded-full absolute top-0.5",
                                    rule.active ? "bg-emerald-600" : "bg-muted-foreground/40"
                                  )}
                                />
                              </button>
                            </motion.div>
                          );
                        })
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Urgency reference card */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="rounded-xl border border-border bg-card/30 p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          Urgency Level Reference
        </h3>
        <div className="grid grid-cols-4 gap-4">
          {URGENCY_LEVELS.map((u) => (
            <div key={u.id} className={cn("rounded-lg border p-3", u.color.replace("text-", "border-").replace(/\/\d+/, "/15"))}>
              <div className="flex items-center gap-2 mb-1">
                <u.icon className={cn("w-4 h-4", u.color.split(" ")[0])} />
                <span className={cn("text-xs font-semibold", u.color.split(" ")[0])}>{u.label}</span>
              </div>
              <p className="text-[10px] text-muted-foreground/50">{u.description}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Add Rule Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="w-[560px] rounded-2xl border border-border bg-card shadow-xl shadow-black/10 p-6"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Plus className="w-4 h-4 text-primary" />
                  Add SLA Rule
                </h3>
                <button onClick={() => setShowAddModal(false)} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Category */}
                <div>
                  <label className="text-[10px] tracking-[0.08em] uppercase text-muted-foreground/50 mb-1.5 block">Service Category</label>
                  <select
                    value={newRule.category}
                    onChange={(e) => setNewRule({ ...newRule, category: e.target.value, subcategory: "" })}
                    className="w-full h-9 rounded-lg bg-background border border-border text-sm text-foreground px-3"
                  >
                    {SERVICE_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                {/* Subcategory */}
                <div>
                  <label className="text-[10px] tracking-[0.08em] uppercase text-muted-foreground/50 mb-1.5 block">Subcategory</label>
                  <select
                    value={newRule.subcategory}
                    onChange={(e) => setNewRule({ ...newRule, subcategory: e.target.value })}
                    className="w-full h-9 rounded-lg bg-background border border-border text-sm text-foreground px-3"
                  >
                    <option value="">Select subcategory...</option>
                    {SERVICE_CATEGORIES.find((c) => c.id === newRule.category)?.subcategories.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* Channel + Urgency row */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] tracking-[0.08em] uppercase text-muted-foreground/50 mb-1.5 block">Channel</label>
                    <select
                      value={newRule.channel}
                      onChange={(e) => setNewRule({ ...newRule, channel: e.target.value })}
                      className="w-full h-9 rounded-lg bg-background border border-border text-sm text-foreground px-3"
                    >
                      {CHANNELS.map((ch) => <option key={ch} value={ch}>{ch}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] tracking-[0.08em] uppercase text-muted-foreground/50 mb-1.5 block">Urgency</label>
                    <select
                      value={newRule.urgency}
                      onChange={(e) => setNewRule({ ...newRule, urgency: e.target.value as SLARule["urgency"] })}
                      className="w-full h-9 rounded-lg bg-background border border-border text-sm text-foreground px-3"
                    >
                      {URGENCY_LEVELS.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
                    </select>
                  </div>
                </div>

                {/* Timers row */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] tracking-[0.08em] uppercase text-muted-foreground/50 mb-1.5 block">1st Response (min)</label>
                    <input
                      type="number"
                      value={newRule.firstResponse}
                      onChange={(e) => setNewRule({ ...newRule, firstResponse: parseInt(e.target.value) || 0 })}
                      className="w-full h-9 rounded-lg bg-background border border-border text-sm text-foreground px-3 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] tracking-[0.08em] uppercase text-muted-foreground/50 mb-1.5 block">Resolution (min)</label>
                    <input
                      type="number"
                      value={newRule.resolution}
                      onChange={(e) => setNewRule({ ...newRule, resolution: parseInt(e.target.value) || 0 })}
                      className="w-full h-9 rounded-lg bg-background border border-border text-sm text-foreground px-3 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] tracking-[0.08em] uppercase text-muted-foreground/50 mb-1.5 block">Alert Before (min)</label>
                    <input
                      type="number"
                      value={newRule.notifyBefore}
                      onChange={(e) => setNewRule({ ...newRule, notifyBefore: parseInt(e.target.value) || 0 })}
                      className="w-full h-9 rounded-lg bg-background border border-border text-sm text-foreground px-3 font-mono"
                    />
                  </div>
                </div>

                {/* Escalation row */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] tracking-[0.08em] uppercase text-muted-foreground/50 mb-1.5 block">Escalate After (min)</label>
                    <input
                      type="number"
                      value={newRule.escalationAfter}
                      onChange={(e) => setNewRule({ ...newRule, escalationAfter: parseInt(e.target.value) || 0 })}
                      className="w-full h-9 rounded-lg bg-background border border-border text-sm text-foreground px-3 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] tracking-[0.08em] uppercase text-muted-foreground/50 mb-1.5 block">Escalate To</label>
                    <select
                      value={newRule.escalateTo}
                      onChange={(e) => setNewRule({ ...newRule, escalateTo: e.target.value })}
                      className="w-full h-9 rounded-lg bg-background border border-border text-sm text-foreground px-3"
                    >
                      {ESCALATION_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="h-9 px-4 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddRule}
                    disabled={!newRule.subcategory}
                    className={cn(
                      "h-9 px-5 rounded-lg text-xs font-semibold transition-all",
                      newRule.subcategory
                        ? "bg-gradient-to-r from-primary to-primary/70 text-foreground shadow-lg shadow-primary/20"
                        : "bg-muted/30 text-muted-foreground/30 cursor-not-allowed"
                    )}
                  >
                    Add Rule
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
