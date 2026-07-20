/*
 * NewDealWizard — Multi-step deal creation wizard
 * Steps: Deal Basics → Products & Services → Contacts & Roles → Stage & Forecast → Review & Create
 * Mirrors the NewProjectForm pattern with full validation, inline add/remove, and animated transitions.
 */
import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ACCOUNTS } from "@/lib/data";
import {
  DEAL_STAGES, getDealValue, dealTypeColors, forecastCategoryColors, contactRoleColors,
  type Deal, type DealType, type DealStage, type DealProduct, type DealContact,
  type ProductCategory, type BillingFrequency, type ProductStatus,
  type ContactRole, type ForecastCategory,
} from "@/lib/pipeline";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  ArrowLeft, ArrowRight, Check, Plus, Trash2, Briefcase,
  Building2, Calendar, DollarSign, Users, Package, Target,
  Sparkles, AlertCircle, Percent, Tag, User, Mail, Phone,
  FileText, Layers, TrendingUp, Shield, Star,
} from "lucide-react";

/* ── Types ─────────────────────────────────────────────────── */

interface NewDealWizardProps {
  onSubmit: (deal: Omit<Deal, "id">) => void;
  onCancel: () => void;
}

interface FormProduct {
  name: string;
  category: ProductCategory;
  quantity: number;
  unitPrice: number;
  discountPct: number;
  billingFrequency: BillingFrequency;
  description: string;
}

interface FormContact {
  name: string;
  role: ContactRole;
  title: string;
  email: string;
  phone: string;
  isPrimary: boolean;
}

type Step = 1 | 2 | 3 | 4 | 5;

const STEP_LABELS: Record<Step, { title: string; subtitle: string; icon: React.ElementType }> = {
  1: { title: "Deal Basics", subtitle: "Name, account, type, and description", icon: Briefcase },
  2: { title: "Products & Services", subtitle: "Add line items with pricing", icon: Package },
  3: { title: "Contacts & Roles", subtitle: "Key stakeholders and decision makers", icon: Users },
  4: { title: "Stage & Forecast", subtitle: "Initial stage, probability, and forecast", icon: Target },
  5: { title: "Review & Create", subtitle: "Review all details before creating", icon: Sparkles },
};

const DEAL_TYPES: DealType[] = ["New Business", "Upsell", "Cross-sell", "Renewal", "Expansion"];
const PRODUCT_CATEGORIES: ProductCategory[] = ["Software", "Services", "Support", "Training"];
const BILLING_FREQUENCIES: BillingFrequency[] = ["Monthly", "Annual", "One-time"];
const CONTACT_ROLES: ContactRole[] = ["Decision Maker", "Champion", "Influencer", "Blocker", "End User", "Technical Evaluator", "Legal/Procurement"];
const OWNERS = ["Jordan Davis", "Sarah Chen", "Priya Nair", "Marcus Lin", "Alex Torres"];

const emptyProduct = (): FormProduct => ({
  name: "", category: "Software", quantity: 1, unitPrice: 0, discountPct: 0, billingFrequency: "Annual", description: "",
});

const emptyContact = (): FormContact => ({
  name: "", role: "Influencer", title: "", email: "", phone: "", isPrimary: false,
});

/* ── Shared field helpers ──────────────────────────────────── */

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
      {children}
      {required && <span className="text-red-500">*</span>}
    </label>
  );
}

function InputField({ value, onChange, placeholder, type = "text", min, max, className = "" }: {
  value: string | number; onChange: (v: string) => void; placeholder?: string; type?: string; min?: number; max?: number; className?: string;
}) {
  return (
    <input
      type={type} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} min={min} max={max}
      className={cn(
        "mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30",
        className
      )}
    />
  );
}

function SelectField({ value, onChange, options, className = "" }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; className?: string;
}) {
  return (
    <select
      value={value} onChange={e => onChange(e.target.value)}
      className={cn(
        "mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30",
        className
      )}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

/* ── Component ─────────────────────────────────────────────── */

export default function NewDealWizard({ onSubmit, onCancel }: NewDealWizardProps) {
  const [step, setStep] = useState<Step>(1);

  // Step 1 — Deal Basics
  const [name, setName] = useState("");
  const [accountId, setAccountId] = useState<number | null>(null);
  const [dealType, setDealType] = useState<DealType>("New Business");
  const [owner, setOwner] = useState("Jordan Davis");
  const [description, setDescription] = useState("");
  const [competitors, setCompetitors] = useState("");
  const [priority, setPriority] = useState<"High" | "Medium" | "Low">("Medium");

  // Step 2 — Products
  const [products, setProducts] = useState<FormProduct[]>([emptyProduct()]);

  // Step 3 — Contacts
  const [contacts, setContacts] = useState<FormContact[]>([emptyContact()]);

  // Step 4 — Stage & Forecast
  const [initialStage, setInitialStage] = useState<DealStage>("Qualification");
  const [expectedClose, setExpectedClose] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() + 3);
    return d.toISOString().split("T")[0];
  });
  const [forecastCategory, setForecastCategory] = useState<ForecastCategory>("Pipeline");
  const [nextStep, setNextStep] = useState("Initial discovery call");

  // Derived
  const account = useMemo(() => ACCOUNTS.find(a => a.id === accountId), [accountId]);
  const stageConfig = useMemo(() => DEAL_STAGES.find(s => s.name === initialStage), [initialStage]);
  const probability = stageConfig?.probability ?? 10;

  const computedProducts: DealProduct[] = useMemo(() =>
    products.filter(p => p.name.trim()).map((p, i) => ({
      id: i + 1, name: p.name, category: p.category, quantity: p.quantity,
      unitPrice: p.unitPrice, discountPct: p.discountPct,
      billingFrequency: p.billingFrequency, status: "Proposed" as ProductStatus,
      description: p.description || undefined,
    })),
  [products]);

  const totalValue = useMemo(() => getDealValue(computedProducts), [computedProducts]);

  const computedContacts: DealContact[] = useMemo(() =>
    contacts.filter(c => c.name.trim()).map((c, i) => ({
      id: i + 1, name: c.name, role: c.role, title: c.title,
      email: c.email, phone: c.phone || undefined, isPrimary: c.isPrimary,
      notes: undefined,
    })),
  [contacts]);

  // Validation
  const step1Valid = name.trim().length > 0 && accountId !== null;
  const step2Valid = true; // products are optional
  const step3Valid = true; // contacts are optional
  const step4Valid = expectedClose.length > 0;

  const canProceed = (s: Step): boolean => {
    switch (s) {
      case 1: return step1Valid;
      case 2: return step2Valid;
      case 3: return step3Valid;
      case 4: return step4Valid;
      default: return true;
    }
  };

  // Product helpers
  const updateProduct = (idx: number, field: keyof FormProduct, value: any) => {
    setProducts(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };
  const addProduct = () => setProducts(prev => [...prev, emptyProduct()]);
  const removeProduct = (idx: number) => setProducts(prev => prev.filter((_, i) => i !== idx));

  // Contact helpers
  const updateContact = (idx: number, field: keyof FormContact, value: any) => {
    setContacts(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  };
  const addContact = () => setContacts(prev => [...prev, emptyContact()]);
  const removeContact = (idx: number) => setContacts(prev => prev.filter((_, i) => i !== idx));
  const setPrimaryContact = (idx: number) => {
    setContacts(prev => prev.map((c, i) => ({ ...c, isPrimary: i === idx })));
  };

  // Submit
  const handleSubmit = useCallback(() => {
    if (!account) return;
    const today = new Date().toISOString().split("T")[0];
    const deal: Omit<Deal, "id"> = {
      name,
      accountId: account.id,
      accountName: account.name,
      type: dealType,
      stage: initialStage,
      probability,
      forecastCategory,
      owner,
      value: totalValue,
      createdAt: today,
      expectedCloseDate: expectedClose,
      nextStep,
      description,
      competitors: competitors.split(",").map(c => c.trim()).filter(Boolean),
      products: computedProducts,
      stageHistory: [{
        id: 1,
        fromStage: "Created" as any,
        toStage: initialStage,
        changedBy: owner,
        changedAt: today,
        reason: "New deal created",
        notes: description,
        nextSteps: nextStep,
      }],
      activities: [{
        id: 1,
        type: "Note",
        subject: "Deal created",
        date: today,
        by: owner,
        outcome: "Completed",
        description: `Created ${dealType} deal for ${account.name}. ${description}`,
      }],
      contacts: computedContacts,
      notes: [],
    };
    onSubmit(deal);
  }, [name, account, dealType, initialStage, probability, forecastCategory, owner, totalValue, expectedClose, nextStep, description, competitors, computedProducts, computedContacts, onSubmit]);

  const goNext = () => {
    if (!canProceed(step)) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (step < 5) setStep((step + 1) as Step);
  };
  const goBack = () => { if (step > 1) setStep((step - 1) as Step); };

  const fmt = (n: number) => n >= 1000000 ? `$${(n / 1000000).toFixed(2)}M` : n >= 1000 ? `$${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K` : `$${n.toLocaleString()}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onCancel} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-foreground">New Deal</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Create a new pipeline opportunity</p>
          </div>
        </div>
        <div className="text-xs text-muted-foreground font-mono">Step {step} of 5</div>
      </motion.div>

      {/* Progress Steps */}
      <div className="flex items-center gap-1">
        {([1, 2, 3, 4, 5] as Step[]).map(s => {
          const cfg = STEP_LABELS[s];
          const isActive = s === step;
          const isDone = s < step;
          return (
            <button key={s} onClick={() => { if (s < step || (s === step + 1 && canProceed(step))) setStep(s); }}
              className={cn(
                "flex-1 py-2 px-2 rounded-lg text-left transition-all",
                isActive ? "bg-primary/10 border border-primary/30" :
                isDone ? "bg-emerald-50 border border-emerald-200" :
                "bg-muted/30 border border-transparent"
              )}
            >
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                  isActive ? "bg-primary text-white" :
                  isDone ? "bg-emerald-500 text-white" :
                  "bg-muted text-muted-foreground"
                )}>
                  {isDone ? <Check className="w-3 h-3" /> : s}
                </div>
                <div className="hidden lg:block min-w-0">
                  <div className={cn("text-[11px] font-semibold truncate", isActive ? "text-primary" : isDone ? "text-emerald-700" : "text-muted-foreground")}>
                    {cfg.title}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="rounded-xl border border-border bg-card p-6"
        >
          {/* Step header */}
          <div className="flex items-center gap-3 mb-6">
            {(() => { const Icon = STEP_LABELS[step].icon; return <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Icon className="w-5 h-5 text-primary" /></div>; })()}
            <div>
              <h3 className="text-sm font-bold text-foreground">{STEP_LABELS[step].title}</h3>
              <p className="text-xs text-muted-foreground">{STEP_LABELS[step].subtitle}</p>
            </div>
          </div>

          {/* ── STEP 1: Deal Basics ──────────────────────── */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <FieldLabel required>Deal Name</FieldLabel>
                <InputField value={name} onChange={setName} placeholder="e.g., Advanced Analytics Upsell" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <FieldLabel required>Account</FieldLabel>
                  <SelectField
                    value={String(accountId ?? "")}
                    onChange={v => setAccountId(v ? Number(v) : null)}
                    options={[{ value: "", label: "Select account..." }, ...ACCOUNTS.map(a => ({ value: String(a.id), label: a.name }))]}
                  />
                </div>
                <div>
                  <FieldLabel>Deal Type</FieldLabel>
                  <SelectField
                    value={dealType}
                    onChange={v => setDealType(v as DealType)}
                    options={DEAL_TYPES.map(t => ({ value: t, label: t }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <FieldLabel>Owner</FieldLabel>
                  <SelectField
                    value={owner}
                    onChange={setOwner}
                    options={OWNERS.map(o => ({ value: o, label: o }))}
                  />
                </div>
                <div>
                  <FieldLabel>Priority</FieldLabel>
                  <SelectField
                    value={priority}
                    onChange={v => setPriority(v as any)}
                    options={[
                      { value: "High", label: "High" },
                      { value: "Medium", label: "Medium" },
                      { value: "Low", label: "Low" },
                    ]}
                  />
                </div>
              </div>
              <div>
                <FieldLabel>Description</FieldLabel>
                <textarea
                  value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="Describe the opportunity, key drivers, and context..."
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>
              <div>
                <FieldLabel>Competitors (comma-separated)</FieldLabel>
                <InputField value={competitors} onChange={setCompetitors} placeholder="e.g., Gainsight, Totango" />
              </div>

              {!step1Valid && name.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-amber-600">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Please select an account to continue
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2: Products & Services ──────────────── */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Add products and services to this deal. You can also add them later.</p>
                <div className="text-sm font-bold font-mono text-foreground">Total: {fmt(totalValue)}</div>
              </div>

              <div className="space-y-3">
                {products.map((p, i) => (
                  <div key={i} className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Line Item {i + 1}</span>
                      {products.length > 1 && (
                        <button onClick={() => removeProduct(i)} className="p-1 rounded hover:bg-red-50 text-red-500 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="col-span-2">
                        <FieldLabel>Product Name</FieldLabel>
                        <InputField value={p.name} onChange={v => updateProduct(i, "name", v)} placeholder="e.g., Analytics Module" />
                      </div>
                      <div>
                        <FieldLabel>Category</FieldLabel>
                        <SelectField
                          value={p.category}
                          onChange={v => updateProduct(i, "category", v)}
                          options={PRODUCT_CATEGORIES.map(c => ({ value: c, label: c }))}
                        />
                      </div>
                      <div>
                        <FieldLabel>Billing</FieldLabel>
                        <SelectField
                          value={p.billingFrequency}
                          onChange={v => updateProduct(i, "billingFrequency", v)}
                          options={BILLING_FREQUENCIES.map(b => ({ value: b, label: b }))}
                        />
                      </div>
                      <div>
                        <FieldLabel>Quantity</FieldLabel>
                        <InputField type="number" value={p.quantity} onChange={v => updateProduct(i, "quantity", Math.max(1, Number(v)))} min={1} />
                      </div>
                      <div>
                        <FieldLabel>Unit Price ($)</FieldLabel>
                        <InputField type="number" value={p.unitPrice} onChange={v => updateProduct(i, "unitPrice", Math.max(0, Number(v)))} min={0} />
                      </div>
                      <div>
                        <FieldLabel>Discount %</FieldLabel>
                        <InputField type="number" value={p.discountPct} onChange={v => updateProduct(i, "discountPct", Math.min(100, Math.max(0, Number(v))))} min={0} max={100} />
                      </div>
                      <div>
                        <FieldLabel>Line Total</FieldLabel>
                        <div className="mt-1 px-3 py-2 rounded-lg bg-muted/50 text-xs font-bold font-mono text-foreground">
                          {fmt(p.quantity * p.unitPrice * (1 - p.discountPct / 100))}
                        </div>
                      </div>
                    </div>
                    <div>
                      <FieldLabel>Description</FieldLabel>
                      <InputField value={p.description} onChange={v => updateProduct(i, "description", v)} placeholder="Brief description..." />
                    </div>
                  </div>
                ))}
              </div>

              <button onClick={addProduct}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors w-full justify-center">
                <Plus className="w-3.5 h-3.5" /> Add Another Line Item
              </button>
            </div>
          )}

          {/* ── STEP 3: Contacts & Roles ─────────────────── */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">Add key stakeholders involved in this deal. You can also add them later.</p>

              <div className="space-y-3">
                {contacts.map((c, i) => (
                  <div key={i} className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Contact {i + 1}</span>
                        {c.isPrimary && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Primary</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {!c.isPrimary && (
                          <button onClick={() => setPrimaryContact(i)}
                            className="px-2 py-1 text-[10px] text-muted-foreground hover:text-amber-600 transition-colors rounded hover:bg-amber-50">
                            <Star className="w-3 h-3" />
                          </button>
                        )}
                        {contacts.length > 1 && (
                          <button onClick={() => removeContact(i)} className="p-1 rounded hover:bg-red-50 text-red-500 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div>
                        <FieldLabel>Name</FieldLabel>
                        <InputField value={c.name} onChange={v => updateContact(i, "name", v)} placeholder="Full name" />
                      </div>
                      <div>
                        <FieldLabel>Role</FieldLabel>
                        <SelectField
                          value={c.role}
                          onChange={v => updateContact(i, "role", v)}
                          options={CONTACT_ROLES.map(r => ({ value: r, label: r }))}
                        />
                      </div>
                      <div>
                        <FieldLabel>Title</FieldLabel>
                        <InputField value={c.title} onChange={v => updateContact(i, "title", v)} placeholder="e.g., VP Engineering" />
                      </div>
                      <div>
                        <FieldLabel>Email</FieldLabel>
                        <InputField value={c.email} onChange={v => updateContact(i, "email", v)} placeholder="email@company.com" />
                      </div>
                      <div>
                        <FieldLabel>Phone</FieldLabel>
                        <InputField value={c.phone} onChange={v => updateContact(i, "phone", v)} placeholder="(555) 123-4567" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button onClick={addContact}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors w-full justify-center">
                <Plus className="w-3.5 h-3.5" /> Add Another Contact
              </button>
            </div>
          )}

          {/* ── STEP 4: Stage & Forecast ─────────────────── */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <FieldLabel>Initial Stage</FieldLabel>
                  <SelectField
                    value={initialStage}
                    onChange={v => {
                      setInitialStage(v as DealStage);
                      // Auto-set forecast category
                      if (v === "Negotiation") setForecastCategory("Commit");
                      else if (v === "Proposal") setForecastCategory("Best Case");
                      else setForecastCategory("Pipeline");
                    }}
                    options={DEAL_STAGES.filter(s => s.name !== "Closed Won" && s.name !== "Closed Lost").map(s => ({
                      value: s.name, label: `${s.name} (${s.probability}%)`
                    }))}
                  />
                </div>
                <div>
                  <FieldLabel>Forecast Category</FieldLabel>
                  <SelectField
                    value={forecastCategory}
                    onChange={v => setForecastCategory(v as ForecastCategory)}
                    options={[
                      { value: "Commit", label: "Commit" },
                      { value: "Best Case", label: "Best Case" },
                      { value: "Pipeline", label: "Pipeline" },
                      { value: "Omitted", label: "Omitted" },
                    ]}
                  />
                </div>
              </div>

              {/* Stage visual */}
              <div className="rounded-lg border border-border bg-muted/20 p-4">
                <div className="flex items-center gap-4">
                  {DEAL_STAGES.filter(s => s.name !== "Closed Lost").map((s, i) => {
                    const isSelected = s.name === initialStage;
                    const isPast = DEAL_STAGES.findIndex(st => st.name === initialStage) > i;
                    return (
                      <div key={s.name} className="flex items-center gap-2 flex-1">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold transition-all shrink-0",
                          isSelected ? cn(s.dot, "text-white ring-2 ring-offset-2 ring-primary/50") :
                          isPast ? cn(s.dot, "text-white opacity-60") :
                          "bg-muted text-muted-foreground"
                        )}>
                          {s.probability}%
                        </div>
                        {i < 4 && <div className={cn("h-0.5 flex-1", isPast || isSelected ? "bg-primary/30" : "bg-border")} />}
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between mt-3">
                  {DEAL_STAGES.filter(s => s.name !== "Closed Lost").map(s => (
                    <span key={s.name} className={cn(
                      "text-[9px] font-medium flex-1 text-center",
                      s.name === initialStage ? "text-primary font-bold" : "text-muted-foreground"
                    )}>{s.name}</span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <FieldLabel required>Expected Close Date</FieldLabel>
                  <InputField type="date" value={expectedClose} onChange={setExpectedClose} />
                </div>
                <div>
                  <FieldLabel>Probability</FieldLabel>
                  <div className="mt-1 px-3 py-2 rounded-lg bg-muted/50 text-xs font-mono text-foreground">
                    {probability}% <span className="text-muted-foreground">(auto from stage)</span>
                  </div>
                </div>
              </div>

              <div>
                <FieldLabel>Next Step</FieldLabel>
                <InputField value={nextStep} onChange={setNextStep} placeholder="e.g., Schedule discovery call" />
              </div>

              {/* Forecast summary */}
              <div className="rounded-lg border border-border bg-muted/20 p-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase font-medium mb-1">Deal Value</div>
                    <div className="text-lg font-bold font-mono text-foreground">{fmt(totalValue)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase font-medium mb-1">Weighted Value</div>
                    <div className="text-lg font-bold font-mono text-primary">{fmt(totalValue * probability / 100)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase font-medium mb-1">Forecast</div>
                    <span className={cn("text-xs px-2 py-1 rounded-full font-medium", forecastCategoryColors[forecastCategory])}>
                      {forecastCategory}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 5: Review & Create ──────────────────── */}
          {step === 5 && (
            <div className="space-y-5">
              {/* Deal Summary */}
              <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Deal Summary</h4>
                  <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", dealTypeColors[dealType])}>{dealType}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <div className="text-[10px] text-muted-foreground">Deal Name</div>
                    <div className="text-xs font-semibold text-foreground">{name || "—"}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground">Account</div>
                    <div className="text-xs font-semibold text-foreground">{account?.name || "—"}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground">Owner</div>
                    <div className="text-xs font-semibold text-foreground">{owner}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground">Priority</div>
                    <div className="text-xs font-semibold text-foreground">{priority}</div>
                  </div>
                </div>
                {description && <p className="text-xs text-muted-foreground">{description}</p>}
                {competitors && (
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-[10px] text-muted-foreground">Competitors:</span>
                    {competitors.split(",").filter(Boolean).map(c => (
                      <span key={c.trim()} className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-700 font-medium">{c.trim()}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Products */}
              {computedProducts.length > 0 && (
                <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Products & Services ({computedProducts.length})</h4>
                    <span className="text-sm font-bold font-mono text-foreground">{fmt(totalValue)}</span>
                  </div>
                  <div className="space-y-1.5">
                    {computedProducts.map(p => (
                      <div key={p.id} className="flex items-center justify-between py-1.5 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">{p.category}</span>
                          <span className="font-medium text-foreground">{p.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground">{p.quantity} × ${p.unitPrice.toLocaleString()}</span>
                          {p.discountPct > 0 && <span className="text-red-600">-{p.discountPct}%</span>}
                          <span className="font-mono font-semibold">{fmt(p.quantity * p.unitPrice * (1 - p.discountPct / 100))}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Contacts */}
              {computedContacts.length > 0 && (
                <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
                  <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Contacts ({computedContacts.length})</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {computedContacts.map(c => (
                      <div key={c.id} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-background border border-border/50">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-foreground flex items-center gap-1.5">
                            {c.name}
                            {c.isPrimary && <Star className="w-3 h-3 text-amber-500 fill-amber-500" />}
                          </div>
                          <div className="text-[10px] text-muted-foreground">{c.title}</div>
                          <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-medium", contactRoleColors[c.role])}>{c.role}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Stage & Forecast */}
              <div className="rounded-lg border border-border bg-muted/20 p-4">
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Stage & Forecast</h4>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                  <div>
                    <div className="text-[10px] text-muted-foreground">Stage</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className={cn("w-2.5 h-2.5 rounded-full", stageConfig?.dot)} />
                      <span className="text-xs font-semibold text-foreground">{initialStage}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground">Probability</div>
                    <div className="text-xs font-semibold text-foreground mt-0.5">{probability}%</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground">Forecast</div>
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", forecastCategoryColors[forecastCategory])}>
                      {forecastCategory}
                    </span>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground">Expected Close</div>
                    <div className="text-xs font-semibold text-foreground mt-0.5">
                      {new Date(expectedClose).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground">Weighted Value</div>
                    <div className="text-xs font-bold font-mono text-primary mt-0.5">{fmt(totalValue * probability / 100)}</div>
                  </div>
                </div>
                {nextStep && (
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <div className="text-[10px] text-muted-foreground">Next Step</div>
                    <div className="text-xs text-foreground mt-0.5">{nextStep}</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <button onClick={step === 1 ? onCancel : goBack}
          className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted">
          <ArrowLeft className="w-3.5 h-3.5" />
          {step === 1 ? "Cancel" : "Back"}
        </button>

        {step < 5 ? (
          <button onClick={goNext}
            className={cn(
              "flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-lg transition-colors",
              canProceed(step)
                ? "bg-primary text-white hover:bg-primary/90"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            Next <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button onClick={handleSubmit}
            className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20"
          >
            <Check className="w-4 h-4" /> Create Deal
          </button>
        )}
      </div>
    </div>
  );
}
