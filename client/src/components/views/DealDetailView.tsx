/*
 * DealDetailView -- Comprehensive deal drill-down with 6 tabs:
 * Overview, Products & Services, Activities, Stage History, Notes, Contacts & Roles
 */
import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePipeline } from "@/contexts/PipelineContext";
import {
  DEAL_STAGES, dealTypeColors, forecastCategoryColors,
  getDaysInStage, getWeightedValue, getSalesCycleDays,
  noteCategoryColors as pipelineNoteCategoryColors,
  contactRoleColors as pipelineContactRoleColors,
  type Deal, type DealStage, type DealProduct, type DealActivity,
  type DealContact, type DealNote, type DealNoteCategory, type ContactRole,
} from "@/lib/pipeline";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  ArrowLeft, ArrowRight, Building2, Calendar, CheckCircle2, ChevronRight,
  Clock, DollarSign, Edit3, FileText, Filter, Hash, Layers, Mail,
  MessageSquare, Percent, Phone, Pin, PinOff, Plus, Search, Shield,
  Star, Tag, Target, Trash2, TrendingUp, User, Users, X, XCircle,
  Package, Activity, History, UserCheck, AlertTriangle, ExternalLink,
  Briefcase, Video, Send, ThumbsUp, ThumbsDown, Minus,
} from "lucide-react";

const TABS = [
  { id: "overview", label: "Overview", icon: Layers },
  { id: "products", label: "Products & Services", icon: Package },
  { id: "activities", label: "Activities", icon: Activity },
  { id: "history", label: "Stage History", icon: History },
  { id: "notes", label: "Notes", icon: FileText },
  { id: "contacts", label: "Contacts & Roles", icon: Users },
] as const;
type TabId = typeof TABS[number]["id"];

const NOTE_CATEGORIES: DealNoteCategory[] = ["General", "Strategy", "Competitive", "Internal", "Client Feedback", "Technical"];
const noteCatColors: Record<DealNoteCategory, string> = {
  General: "bg-slate-100 text-slate-700",
  Strategy: "bg-blue-100 text-blue-700",
  Competitive: "bg-purple-100 text-purple-700",
  Internal: "bg-gray-100 text-gray-700",
  "Client Feedback": "bg-amber-100 text-amber-700",
  Technical: "bg-teal-100 text-teal-700",
};

const activityIcons: Record<string, any> = {
  Call: Phone, Email: Mail, Meeting: Video, Demo: ExternalLink, Note: FileText, Task: CheckCircle2,
};
const activityOutcomeColors: Record<string, string> = {
  Positive: "text-emerald-600", Completed: "text-emerald-600", "Follow-up Needed": "text-amber-600",
  "No Answer": "text-red-500", Negative: "text-red-500", Scheduled: "text-blue-600", Pending: "text-muted-foreground",
};


const fmt = (n: number) => n >= 1000000 ? `$${(n / 1000000).toFixed(2)}M` : n >= 1000 ? `$${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K` : `$${n.toLocaleString()}`;

export default function DealDetailView({ dealId, onBack }: { dealId: number; onBack: () => void }) {
  const { deals, changeDealStage, addActivity, addNote, updateNote, deleteNote, togglePinNote, addProduct, updateProduct, removeProduct, addContact, updateContact, removeContact } = usePipeline();
  const deal = deals.find(d => d.id === dealId);
  const [tab, setTab] = useState<TabId>("overview");

  // Notes state
  const [noteSearch, setNoteSearch] = useState("");
  const [noteCategory, setNoteCategory] = useState<DealNoteCategory | "all">("all");
  const [showNewNote, setShowNewNote] = useState(false);
  const [editingNote, setEditingNote] = useState<DealNote | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteCat, setNoteCat] = useState<DealNoteCategory>("General");

  // Activity state
  const [showNewActivity, setShowNewActivity] = useState(false);
  const [actType, setActType] = useState<DealActivity["type"]>("Call");
  const [actSubject, setActSubject] = useState("");
  const [actOutcome, setActOutcome] = useState("Completed");
  const [actDuration, setActDuration] = useState(30);
  const [actNotes, setActNotes] = useState("");
  const [actDate, setActDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [actFollowUpDate, setActFollowUpDate] = useState("");
  const [actFollowUpAction, setActFollowUpAction] = useState("");
  const [activityFilter, setActivityFilter] = useState<string>("all");

  // Product state
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [prodName, setProdName] = useState("");
  const [prodCategory, setProdCategory] = useState<DealProduct["category"]>("Software");
  const [prodQty, setProdQty] = useState(1);
  const [prodPrice, setProdPrice] = useState(0);
  const [prodDiscount, setProdDiscount] = useState(0);
  const [prodBilling, setProdBilling] = useState<DealProduct["billingFrequency"]>("Annual");
  const [prodDesc, setProdDesc] = useState("");

  // Contact state
  const [showNewContact, setShowNewContact] = useState(false);
  const [ctName, setCtName] = useState("");
  const [ctRole, setCtRole] = useState<ContactRole>("Influencer");
  const [ctTitle, setCtTitle] = useState("");
  const [ctEmail, setCtEmail] = useState("");
  const [ctPhone, setCtPhone] = useState("");


  // Stage change modal
  const [stageChangeTarget, setStageChangeTarget] = useState<DealStage | null>(null);
  const [scReason, setScReason] = useState("");
  const [scNotes, setScNotes] = useState("");
  const [scNextSteps, setScNextSteps] = useState("");

  if (!deal) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-muted-foreground">Deal not found</p>
    </div>
  );

  const stageConfig = DEAL_STAGES.find(s => s.name === deal.stage);
  const currentStageIdx = DEAL_STAGES.findIndex(s => s.name === deal.stage);
  const totalProducts = deal.products.reduce((s, p) => s + (p.quantity * p.unitPrice * (1 - p.discountPct / 100)), 0);

  const filteredNotes = deal.notes
    .filter(n => noteCategory === "all" || n.category === noteCategory)
    .filter(n => !noteSearch || n.title.toLowerCase().includes(noteSearch.toLowerCase()) || n.content.toLowerCase().includes(noteSearch.toLowerCase()))
    .sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const handleSaveNote = () => {
    if (!noteTitle.trim()) { toast.error("Please enter a note title"); return; }
    if (editingNote) {
      updateNote(deal.id, editingNote.id, { title: noteTitle, content: noteContent, category: noteCat });
      toast.success("Note updated");
    } else {
      addNote(deal.id, { title: noteTitle, content: noteContent, category: noteCat, author: "Jordan Davis", createdAt: new Date().toISOString().split("T")[0], isPinned: false });
      toast.success("Note added");
    }
    setShowNewNote(false); setEditingNote(null); setNoteTitle(""); setNoteContent(""); setNoteCat("General");
  };

  const handleLogActivity = () => {
    if (!actSubject.trim()) { toast.error("Please enter a subject"); return; }
    addActivity(deal.id, {
      type: actType, subject: actSubject, date: actDate, by: "Jordan Davis",
      outcome: actOutcome as any, duration: actDuration, description: actNotes,
      followUpDate: actFollowUpDate || undefined,
      followUpAction: actFollowUpAction || undefined,
    });
    toast.success(actFollowUpDate ? "Activity logged with follow-up scheduled" : "Activity logged");
    setShowNewActivity(false); setActSubject(""); setActNotes(""); setActDuration(30);
    setActDate(new Date().toISOString().split("T")[0]); setActFollowUpDate(""); setActFollowUpAction("");
  };

  const handleAddProduct = () => {
    if (!prodName.trim() || prodPrice <= 0) { toast.error("Please enter product name and price"); return; }
    addProduct(deal.id, { name: prodName, category: prodCategory, quantity: prodQty, unitPrice: prodPrice, discountPct: prodDiscount, billingFrequency: prodBilling, status: "Proposed", description: prodDesc });
    toast.success("Product added");
    setShowNewProduct(false); setProdName(""); setProdPrice(0); setProdQty(1); setProdDiscount(0); setProdDesc("");
  };

  const handleAddContact = () => {
    if (!ctName.trim()) { toast.error("Please enter contact name"); return; }
    addContact(deal.id, { name: ctName, role: ctRole, title: ctTitle, email: ctEmail, phone: ctPhone, isPrimary: false });
    toast.success("Contact added");
    setShowNewContact(false); setCtName(""); setCtTitle(""); setCtEmail(""); setCtPhone("");
  };

  const handleStageChange = () => {
    if (!stageChangeTarget || !scReason.trim()) { toast.error("Please provide a reason"); return; }
    changeDealStage(deal.id, stageChangeTarget, scReason, scNotes, scNextSteps, "Jordan Davis");
    toast.success(`Deal moved to ${stageChangeTarget}`);
    setStageChangeTarget(null); setScReason(""); setScNotes(""); setScNextSteps("");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Pipeline
        </button>

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-bold text-foreground">{deal.name}</h2>
              <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", dealTypeColors[deal.type])}>{deal.type}</span>
              <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", forecastCategoryColors[deal.forecastCategory])}>{deal.forecastCategory}</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" /> {deal.accountName}</span>
              <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> {deal.owner}</span>
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Close: {new Date(deal.expectedCloseDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-2xl font-bold font-mono text-foreground">{fmt(deal.value)}</div>
              <div className="text-[10px] text-muted-foreground">Weighted: {fmt(getWeightedValue(deal))}</div>
            </div>
          </div>
        </div>

        {/* Stage Progress Stepper */}
        <div className="mt-5 flex items-center gap-1">
          {DEAL_STAGES.filter(s => s.name !== "Closed Lost").map((stage, i) => {
            const isActive = stage.name === deal.stage;
            const isPast = i < currentStageIdx && deal.stage !== "Closed Lost";
            const isClosed = deal.stage === "Closed Won" || deal.stage === "Closed Lost";
            return (
              <button key={stage.name}
                onClick={() => { if (stage.name !== deal.stage) setStageChangeTarget(stage.name); }}
                className={cn(
                  "flex-1 py-2 px-1 text-center text-[10px] font-medium rounded-lg transition-all border",
                  isActive ? `${stage.dot} text-white border-transparent` :
                  isPast ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
                  "bg-muted/30 text-muted-foreground border-border hover:bg-muted/60 hover:border-border/80"
                )}
              >
                <div className="truncate">{stage.name}</div>
                <div className="text-[9px] opacity-70">{stage.probability}%</div>
              </button>
            );
          })}
        </div>
        {deal.stage === "Closed Lost" && (
          <div className="mt-2 rounded-lg border border-red-200 bg-red-50/50 p-2 flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-600" />
            <span className="text-xs text-red-700 font-medium">Closed Lost</span>
            {deal.lostReason && <span className="text-xs text-red-600 ml-2">- {deal.lostReason}</span>}
          </div>
        )}
      </motion.div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn("flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-colors border-b-2 -mb-px",
              tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {/* ---- OVERVIEW TAB ---- */}
      {tab === "overview" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Deal Value", value: fmt(deal.value), icon: DollarSign },
              { label: "Probability", value: `${deal.probability}%`, icon: Percent },
              { label: "Days in Stage", value: `${getDaysInStage(deal)}d`, icon: Clock },
              { label: "Products", value: `${deal.products.length}`, icon: Package },
            ].map(m => (
              <div key={m.label} className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <m.icon className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{m.label}</span>
                </div>
                <div className="text-lg font-bold font-mono text-foreground">{m.value}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Deal Info */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Deal Information</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Created</span><span className="font-medium">{new Date(deal.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Expected Close</span><span className="font-medium">{new Date(deal.expectedCloseDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Sales Cycle</span><span className="font-medium">{getSalesCycleDays(deal)} days</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Forecast</span><span className={cn("font-medium px-1.5 py-0.5 rounded text-[10px]", forecastCategoryColors[deal.forecastCategory])}>{deal.forecastCategory}</span></div>
                {deal.competitors.length > 0 && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Competitors</span><span className="font-medium">{deal.competitors.join(", ")}</span></div>
                )}
              </div>
              {deal.description && (
                <div className="pt-2 border-t border-border">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Description</span>
                  <p className="text-xs text-foreground mt-1">{deal.description}</p>
                </div>
              )}
            </div>

            {/* Next Steps & Recent Activity */}
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Next Steps</h3>
                <p className="text-xs text-foreground">{deal.nextStep || "No next steps defined"}</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Recent Activity</h3>
                <div className="space-y-2">
                  {deal.activities.slice(0, 4).map(act => {
                    const Icon = activityIcons[act.type] || Activity;
                    return (
                      <div key={act.id} className="flex items-center gap-3 py-1.5">
                        <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-medium text-foreground truncate block">{act.subject}</span>
                          <span className="text-[10px] text-muted-foreground">{act.by} - {new Date(act.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                        </div>
                        <span className={cn("text-[10px] font-medium", activityOutcomeColors[act.outcome ?? ""] || "text-muted-foreground")}>{act.outcome ?? ""}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Products Summary */}
          {deal.products.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Products & Services Summary</h3>
              <div className="space-y-2">
                {deal.products.map(p => (
                  <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">{p.category}</span>
                      <span className="text-xs font-medium text-foreground">{p.name}</span>
                    </div>
                    <span className="text-xs font-mono font-semibold text-foreground">{fmt(p.quantity * p.unitPrice * (1 - p.discountPct / 100))}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-xs font-semibold text-foreground">Total</span>
                  <span className="text-sm font-bold font-mono text-primary">{fmt(totalProducts)}</span>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ---- PRODUCTS TAB ---- */}
      {tab === "products" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">{deal.products.length} Products & Services</h3>
            <button onClick={() => setShowNewProduct(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add Product
            </button>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-muted-foreground uppercase">Product</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-muted-foreground uppercase">Category</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-muted-foreground uppercase">Qty</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-muted-foreground uppercase">Unit Price</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-muted-foreground uppercase">Discount</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-muted-foreground uppercase">Total</th>
                  <th className="px-4 py-2.5 text-center text-[10px] font-semibold text-muted-foreground uppercase">Billing</th>
                  <th className="px-4 py-2.5 text-center text-[10px] font-semibold text-muted-foreground uppercase">Status</th>
                  <th className="px-4 py-2.5 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {deal.products.map(p => {
                  const lineTotal = p.quantity * p.unitPrice * (1 - p.discountPct / 100);
                  return (
                    <tr key={p.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{p.name}</div>
                        {p.description && <div className="text-[10px] text-muted-foreground mt-0.5 max-w-[250px] truncate">{p.description}</div>}
                      </td>
                      <td className="px-4 py-3"><span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">{p.category}</span></td>
                      <td className="px-4 py-3 text-right font-mono">{p.quantity}</td>
                      <td className="px-4 py-3 text-right font-mono">{fmt(p.unitPrice)}</td>
                      <td className="px-4 py-3 text-right font-mono">{p.discountPct > 0 ? `${p.discountPct}%` : "-"}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold">{fmt(lineTotal)}</td>
                      <td className="px-4 py-3 text-center text-muted-foreground">{p.billingFrequency}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium",
                          p.status === "Accepted" ? "bg-emerald-100 text-emerald-700" :
                          p.status === "Proposed" ? "bg-blue-100 text-blue-700" :
                          "bg-red-100 text-red-700"
                        )}>{p.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => { removeProduct(deal.id, p.id); toast.success("Product removed"); }}
                          className="p-1 rounded hover:bg-red-100 text-muted-foreground hover:text-red-600 transition-colors">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-muted/20">
                  <td colSpan={5} className="px-4 py-3 text-right text-xs font-semibold text-foreground">Total Deal Value</td>
                  <td className="px-4 py-3 text-right text-sm font-bold font-mono text-primary">{fmt(totalProducts)}</td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* New Product Form */}
          <AnimatePresence>
            {showNewProduct && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3 overflow-hidden">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-foreground">Add Product / Service</h4>
                  <button onClick={() => setShowNewProduct(false)} className="p-1 rounded hover:bg-muted"><X className="w-3.5 h-3.5 text-muted-foreground" /></button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="col-span-2">
                    <label className="text-[10px] text-muted-foreground uppercase font-medium">Name *</label>
                    <input value={prodName} onChange={e => setProdName(e.target.value)} placeholder="Product name..."
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase font-medium">Category</label>
                    <select value={prodCategory} onChange={e => setProdCategory(e.target.value as any)}
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30">
                      {["Software", "Services", "Support", "Training", "Hardware"].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase font-medium">Billing</label>
                    <select value={prodBilling} onChange={e => setProdBilling(e.target.value as any)}
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30">
                      {["Monthly", "Annual", "One-time", "Quarterly"].map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase font-medium">Quantity</label>
                    <input type="number" value={prodQty} onChange={e => setProdQty(Number(e.target.value))} min={1}
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase font-medium">Unit Price ($) *</label>
                    <input type="number" value={prodPrice} onChange={e => setProdPrice(Number(e.target.value))} min={0}
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase font-medium">Discount %</label>
                    <input type="number" value={prodDiscount} onChange={e => setProdDiscount(Number(e.target.value))} min={0} max={100}
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <div className="col-span-2 sm:col-span-4">
                    <label className="text-[10px] text-muted-foreground uppercase font-medium">Description</label>
                    <input value={prodDesc} onChange={e => setProdDesc(e.target.value)} placeholder="Brief description..."
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowNewProduct(false)} className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">Cancel</button>
                  <button onClick={handleAddProduct} className="px-4 py-1.5 text-xs font-semibold text-white bg-primary rounded-lg hover:bg-primary/90">Add Product</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ---- ACTIVITIES TAB ---- */}
      {tab === "activities" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {/* Header with stats */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h3 className="text-sm font-semibold text-foreground">{deal.activities.length} Activities</h3>
              {(() => {
                const upcoming = deal.activities.filter(a => a.followUpDate && new Date(a.followUpDate) >= new Date()).length;
                const overdue = deal.activities.filter(a => a.followUpDate && new Date(a.followUpDate) < new Date()).length;
                return (
                  <div className="flex items-center gap-2">
                    {upcoming > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                        {upcoming} upcoming follow-up{upcoming !== 1 ? "s" : ""}
                      </span>
                    )}
                    {overdue > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
                        {overdue} overdue
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>
            <button onClick={() => setShowNewActivity(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Log Activity
            </button>
          </div>

          {/* Activity type filter pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {["all", "Call", "Email", "Meeting", "Demo", "Task", "Note"].map(f => (
              <button key={f} onClick={() => setActivityFilter(f)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors",
                  activityFilter === f ? "bg-primary text-white" : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}>
                {f === "all" ? "All" : f}
              </button>
            ))}
          </div>

          {/* New Activity Form — Enhanced */}
          <AnimatePresence>
            {showNewActivity && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3 overflow-hidden">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-foreground">Log Activity</h4>
                  <button onClick={() => setShowNewActivity(false)} className="p-1 rounded hover:bg-muted"><X className="w-3.5 h-3.5 text-muted-foreground" /></button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase font-medium">Type</label>
                    <select value={actType} onChange={e => setActType(e.target.value as any)}
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30">
                      {["Call", "Email", "Meeting", "Demo", "Note", "Task"].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2 sm:col-span-3">
                    <label className="text-[10px] text-muted-foreground uppercase font-medium">Subject *</label>
                    <input value={actSubject} onChange={e => setActSubject(e.target.value)} placeholder="Activity subject..."
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase font-medium">Date</label>
                    <input type="date" value={actDate} onChange={e => setActDate(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase font-medium">Outcome</label>
                    <select value={actOutcome} onChange={e => setActOutcome(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30">
                      {["Completed", "Positive", "Follow-up Needed", "No Answer", "Negative", "Rescheduled", "Neutral"].map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase font-medium">Duration (min)</label>
                    <input type="number" value={actDuration} onChange={e => setActDuration(Number(e.target.value))} min={0}
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <div className="col-span-2 sm:col-span-4">
                    <label className="text-[10px] text-muted-foreground uppercase font-medium">Notes</label>
                    <textarea value={actNotes} onChange={e => setActNotes(e.target.value)} rows={2} placeholder="Activity notes, key takeaways, action items..."
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                </div>

                {/* Follow-up scheduling section */}
                <div className="rounded-lg border border-border/50 bg-background/50 p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Schedule Follow-up</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase font-medium">Follow-up Date</label>
                      <input type="date" value={actFollowUpDate} onChange={e => setActFollowUpDate(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase font-medium">Follow-up Action</label>
                      <input value={actFollowUpAction} onChange={e => setActFollowUpAction(e.target.value)}
                        placeholder="e.g., Send proposal, Schedule demo..."
                        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowNewActivity(false)} className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">Cancel</button>
                  <button onClick={handleLogActivity} className="px-4 py-1.5 text-xs font-semibold text-white bg-primary rounded-lg hover:bg-primary/90">Log Activity</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Activity Timeline — Enhanced */}
          <div className="space-y-1">
            {deal.activities
              .filter(a => activityFilter === "all" || a.type === activityFilter)
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((act, i, arr) => {
              const Icon = activityIcons[act.type] || Activity;
              const hasFollowUp = !!act.followUpDate;
              const followUpOverdue = hasFollowUp && new Date(act.followUpDate!) < new Date();
              const followUpUpcoming = hasFollowUp && new Date(act.followUpDate!) >= new Date();
              return (
                <div key={act.id} className="flex gap-3 py-3 border-b border-border/30 last:border-0">
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                      act.outcome === "Positive" || act.outcome === "Completed" ? "bg-emerald-100" :
                      act.outcome === "Negative" || act.outcome === "No Answer" ? "bg-red-100" :
                      act.outcome === "Follow-up Needed" ? "bg-amber-100" : "bg-muted"
                    )}>
                      <Icon className={cn(
                        "w-3.5 h-3.5",
                        act.outcome === "Positive" || act.outcome === "Completed" ? "text-emerald-600" :
                        act.outcome === "Negative" || act.outcome === "No Answer" ? "text-red-500" :
                        act.outcome === "Follow-up Needed" ? "text-amber-600" : "text-muted-foreground"
                      )} />
                    </div>
                    {i < arr.length - 1 && <div className="w-px flex-1 bg-border/50 mt-1" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">{act.subject}</span>
                      <span className={cn("text-[10px] font-medium", activityOutcomeColors[act.outcome ?? ""] || "text-muted-foreground")}>{act.outcome ?? ""}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-[10px] text-muted-foreground">
                      <span>{act.by}</span>
                      <span>{new Date(act.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                      {act.duration && <span>{act.duration} min</span>}
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted font-medium">{act.type}</span>
                    </div>
                    {act.description && <p className="text-xs text-muted-foreground mt-1">{act.description}</p>}
                    {/* Follow-up indicator */}
                    {hasFollowUp && (
                      <div className={cn(
                        "mt-2 flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[10px] font-medium",
                        followUpOverdue ? "bg-red-50 text-red-700 border border-red-200" :
                        followUpUpcoming ? "bg-blue-50 text-blue-700 border border-blue-200" :
                        "bg-muted text-muted-foreground"
                      )}>
                        <Calendar className="w-3 h-3" />
                        <span>Follow-up: {new Date(act.followUpDate!).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                        {act.followUpAction && <span className="text-muted-foreground">— {act.followUpAction}</span>}
                        {followUpOverdue && <span className="ml-auto text-red-600 font-bold">OVERDUE</span>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {deal.activities.filter(a => activityFilter === "all" || a.type === activityFilter).length === 0 && (
              <div className="text-center py-8 text-xs text-muted-foreground">
                No {activityFilter === "all" ? "" : activityFilter + " "}activities recorded yet
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ---- STAGE HISTORY TAB ---- */}
      {tab === "history" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Stage History ({deal.stageHistory.length} transitions)</h3>
          <div className="space-y-0">
            {deal.stageHistory.sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()).map((change, i) => {
              const fromConfig = DEAL_STAGES.find(s => s.name === change.fromStage);
              const toConfig = DEAL_STAGES.find(s => s.name === change.toStage);
              return (
                <div key={change.id} className="flex gap-3 py-4 border-b border-border/30 last:border-0">
                  <div className="flex flex-col items-center">
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", toConfig?.dot || "bg-muted")}>
                      <ArrowRight className="w-3.5 h-3.5 text-white" />
                    </div>
                    {i < deal.stageHistory.length - 1 && <div className="w-px flex-1 bg-border/50 mt-1" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">{change.fromStage}</span>
                      <ArrowRight className="w-3 h-3 text-muted-foreground" />
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium",
                        change.toStage === "Closed Won" ? "bg-emerald-100 text-emerald-700" :
                        change.toStage === "Closed Lost" ? "bg-red-100 text-red-700" :
                        "bg-primary/10 text-primary"
                      )}>{change.toStage}</span>
                    </div>
                    <div className="text-xs font-medium text-foreground">{change.reason}</div>
                    {change.notes && <p className="text-xs text-muted-foreground mt-0.5">{change.notes}</p>}
                    {change.nextSteps && (
                      <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                        <Target className="w-3 h-3" /> Next: {change.nextSteps}
                      </div>
                    )}
                    <div className="text-[10px] text-muted-foreground mt-1">
                      {change.changedBy} - {new Date(change.changedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ---- NOTES TAB ---- */}
      {tab === "notes" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">{deal.notes.length} Notes</h3>
            <button onClick={() => { setShowNewNote(true); setEditingNote(null); setNoteTitle(""); setNoteContent(""); setNoteCat("General"); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors">
              <Plus className="w-3.5 h-3.5" /> New Note
            </button>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input value={noteSearch} onChange={e => setNoteSearch(e.target.value)} placeholder="Search notes..."
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-border bg-card text-xs focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            {(["all", ...NOTE_CATEGORIES] as const).map(cat => (
              <button key={cat} onClick={() => setNoteCategory(cat)}
                className={cn("px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors",
                  noteCategory === cat ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:text-foreground")}>
                {cat === "all" ? "All" : cat}
              </button>
            ))}
          </div>

          {/* New / Edit Note Form */}
          <AnimatePresence>
            {(showNewNote || editingNote) && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3 overflow-hidden">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-foreground">{editingNote ? "Edit Note" : "New Note"}</h4>
                  <button onClick={() => { setShowNewNote(false); setEditingNote(null); }} className="p-1 rounded hover:bg-muted"><X className="w-3.5 h-3.5 text-muted-foreground" /></button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-3">
                    <label className="text-[10px] text-muted-foreground uppercase font-medium">Title *</label>
                    <input value={noteTitle} onChange={e => setNoteTitle(e.target.value)} placeholder="Note title..."
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase font-medium">Category</label>
                    <select value={noteCat} onChange={e => setNoteCat(e.target.value as DealNoteCategory)}
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30">
                      {NOTE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-4">
                    <label className="text-[10px] text-muted-foreground uppercase font-medium">Content</label>
                    <textarea value={noteContent} onChange={e => setNoteContent(e.target.value)} rows={3} placeholder="Note content..."
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => { setShowNewNote(false); setEditingNote(null); }} className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">Cancel</button>
                  <button onClick={handleSaveNote} className="px-4 py-1.5 text-xs font-semibold text-white bg-primary rounded-lg hover:bg-primary/90">
                    {editingNote ? "Update" : "Save Note"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Notes List */}
          <div className="space-y-2">
            {filteredNotes.map(note => (
              <div key={note.id} className={cn("rounded-xl border p-4 transition-colors group", note.isPinned ? "border-amber-300/50 bg-amber-50/20" : "border-border bg-card hover:bg-muted/20")}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {note.isPinned && <Pin className="w-3 h-3 text-amber-500" />}
                      <span className="text-xs font-semibold text-foreground">{note.title}</span>
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", noteCatColors[note.category])}>{note.category}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{note.content}</p>
                    <div className="text-[10px] text-muted-foreground mt-2">
                      {note.author} - {new Date(note.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { togglePinNote(deal.id, note.id); toast.success(note.isPinned ? "Note unpinned" : "Note pinned"); }}
                      className="p-1 rounded hover:bg-muted"><Pin className={cn("w-3 h-3", note.isPinned ? "text-amber-500" : "text-muted-foreground")} /></button>
                    <button onClick={() => { setEditingNote(note); setNoteTitle(note.title); setNoteContent(note.content); setNoteCat(note.category); setShowNewNote(false); }}
                      className="p-1 rounded hover:bg-muted"><Edit3 className="w-3 h-3 text-muted-foreground" /></button>
                    <button onClick={() => { deleteNote(deal.id, note.id); toast.success("Note deleted"); }}
                      className="p-1 rounded hover:bg-red-100"><Trash2 className="w-3 h-3 text-muted-foreground hover:text-red-600" /></button>
                  </div>
                </div>
              </div>
            ))}
            {filteredNotes.length === 0 && (
              <div className="text-center py-8 text-xs text-muted-foreground">No notes found</div>
            )}
          </div>
        </motion.div>
      )}

      {/* ---- CONTACTS TAB ---- */}
      {tab === "contacts" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">{deal.contacts.length} Contacts & Roles</h3>
            <button onClick={() => setShowNewContact(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add Contact
            </button>
          </div>

          {/* Contact Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {deal.contacts.map(contact => (
              <div key={contact.id} className="rounded-xl border border-border bg-card p-4 hover:bg-muted/20 transition-colors group">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-primary">{contact.name.split(" ").map(n => n[0]).join("")}</span>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-foreground">{contact.name}</div>
                      <div className="text-[10px] text-muted-foreground">{contact.title}</div>
                    </div>
                  </div>
                    <button onClick={() => { removeContact(deal.id, contact.id); toast.success("Contact removed"); }}
                    className="p-1 rounded hover:bg-red-100 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="w-3 h-3 text-muted-foreground hover:text-red-600" />
                  </button>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", pipelineContactRoleColors[contact.role] || "bg-muted text-muted-foreground")}>{contact.role}</span>
                  {contact.isPrimary && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">Primary</span>}
                </div>
                <div className="space-y-1 text-[10px] text-muted-foreground">
                  {contact.email && <div className="flex items-center gap-1.5"><Mail className="w-3 h-3" /> {contact.email}</div>}
                  {contact.phone && <div className="flex items-center gap-1.5"><Phone className="w-3 h-3" /> {contact.phone}</div>}
                </div>
              </div>
            ))}
          </div>

          {/* New Contact Form */}
          <AnimatePresence>
            {showNewContact && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3 overflow-hidden">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-foreground">Add Contact</h4>
                  <button onClick={() => setShowNewContact(false)} className="p-1 rounded hover:bg-muted"><X className="w-3.5 h-3.5 text-muted-foreground" /></button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase font-medium">Name *</label>
                    <input value={ctName} onChange={e => setCtName(e.target.value)} placeholder="Full name..."
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase font-medium">Title</label>
                    <input value={ctTitle} onChange={e => setCtTitle(e.target.value)} placeholder="Job title..."
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase font-medium">Role</label>
                    <select value={ctRole} onChange={e => setCtRole(e.target.value as any)}
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30">
                      {["Decision Maker", "Champion", "Influencer", "Technical Evaluator", "Blocker", "End User", "Legal/Procurement"].map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase font-medium">Email</label>
                    <input value={ctEmail} onChange={e => setCtEmail(e.target.value)} placeholder="email@company.com"
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase font-medium">Phone</label>
                    <input value={ctPhone} onChange={e => setCtPhone(e.target.value)} placeholder="(555) 123-4567"
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>

                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowNewContact(false)} className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">Cancel</button>
                  <button onClick={handleAddContact} className="px-4 py-1.5 text-xs font-semibold text-white bg-primary rounded-lg hover:bg-primary/90">Add Contact</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ---- Stage Change Modal ---- */}
      <AnimatePresence>
        {stageChangeTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setStageChangeTarget(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg mx-4 rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-foreground">Change Stage</h3>
                  <button onClick={() => setStageChangeTarget(null)} className="p-1 rounded-lg hover:bg-muted"><X className="w-4 h-4 text-muted-foreground" /></button>
                </div>
                <div className="flex items-center justify-center gap-4 py-2">
                  <div className="text-center">
                    <div className={cn("w-8 h-8 rounded-full mx-auto mb-1 flex items-center justify-center", stageConfig?.dot)}>
                      <span className="text-white text-[10px] font-bold">{deal.probability}%</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{deal.stage}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  <div className="text-center">
                    <div className={cn("w-8 h-8 rounded-full mx-auto mb-1 flex items-center justify-center", DEAL_STAGES.find(s => s.name === stageChangeTarget)?.dot)}>
                      <span className="text-white text-[10px] font-bold">{DEAL_STAGES.find(s => s.name === stageChangeTarget)?.probability}%</span>
                    </div>
                    <span className="text-[10px] text-foreground font-medium">{stageChangeTarget}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase font-medium">Reason *</label>
                    <input value={scReason} onChange={e => setScReason(e.target.value)} placeholder="Reason for stage change..."
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase font-medium">Notes</label>
                    <textarea value={scNotes} onChange={e => setScNotes(e.target.value)} rows={2} placeholder="Additional context..."
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase font-medium">Next Steps</label>
                    <input value={scNextSteps} onChange={e => setScNextSteps(e.target.value)} placeholder="Next steps..."
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => setStageChangeTarget(null)} className="px-4 py-2 text-xs text-muted-foreground hover:text-foreground">Cancel</button>
                  <button onClick={handleStageChange} className="px-5 py-2 text-xs font-semibold text-white bg-primary rounded-lg hover:bg-primary/90">Confirm</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
