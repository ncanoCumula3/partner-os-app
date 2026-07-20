/*
 * ARTrackerView — accounts receivable with invoice tracking + drill-down detail panel
 * Warm adaptive theme
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { INVOICES, ACCOUNTS, statusColors, healthColor } from "@/lib/data";
import type { Invoice } from "@/lib/data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  ChevronRight, Calendar, Clock, Building2, Globe, DollarSign,
  FileText, User, Receipt, AlertTriangle, CheckCircle2, Send,
  ArrowUpRight, CreditCard, Zap, Mail, UserPlus, Phone,
  Search, ArrowUpDown, ArrowUp, ArrowDown, X,
} from "lucide-react";
import ActivityNotes from "@/components/ActivityNotes";

/* ── Extended invoice data ── */
interface InvoiceDetail extends Invoice {
  lineItems: { description: string; quantity: number; unitPrice: string; total: string }[];
  contact: string;
  paymentTerms: string;
  currency: string;
  notes: string;
  paymentHistory: { action: string; date: string; by: string }[];
  remindersSent: number;
  lastReminder?: string;
}

const INVOICE_DETAILS: Record<string, InvoiceDetail> = {
  "INV-2044": {
    ...INVOICES.find(i => i.inv === "INV-2044")!,
    lineItems: [
      { description: "NetSuite Enterprise License — Q2 2026", quantity: 1, unitPrice: "$6,000", total: "$6,000" },
      { description: "Custom Dashboard Configuration", quantity: 3, unitPrice: "$400", total: "$1,200" },
      { description: "Priority Support Add-on", quantity: 1, unitPrice: "$1,200", total: "$1,200" },
    ],
    contact: "Dana Reyes", paymentTerms: "Net 30", currency: "USD",
    notes: "Invoice tied to Q2 license renewal. Dana confirmed receipt and said payment is in the approval queue. Expected to clear by Apr 13.",
    paymentHistory: [
      { action: "Invoice sent via email", date: "Mar 15", by: "System" },
      { action: "Invoice viewed by recipient", date: "Mar 16", by: "Dana Reyes" },
      { action: "Payment reminder sent", date: "Apr 1", by: "System" },
      { action: "Dana confirmed payment in progress", date: "Apr 8", by: "Jordan Davis" },
    ],
    remindersSent: 1, lastReminder: "Apr 1",
  },
  "INV-2039": {
    ...INVOICES.find(i => i.inv === "INV-2039")!,
    lineItems: [
      { description: "Salesforce Integration — Monthly", quantity: 1, unitPrice: "$2,400", total: "$2,400" },
      { description: "Data Migration Services", quantity: 1, unitPrice: "$1,800", total: "$1,800" },
    ],
    contact: "Marcus Lin", paymentTerms: "Net 30", currency: "USD",
    notes: "OVERDUE — 15 days past due. Marcus has been unresponsive to payment reminders. This may be related to the ongoing T-1041 support issue. Recommend resolving the technical issue before escalating payment collection.",
    paymentHistory: [
      { action: "Invoice sent via email", date: "Feb 28", by: "System" },
      { action: "Invoice viewed by recipient", date: "Mar 1", by: "Marcus Lin" },
      { action: "Payment reminder #1 sent", date: "Mar 25", by: "System" },
      { action: "Payment reminder #2 sent", date: "Apr 5", by: "System" },
      { action: "Follow-up call — no answer", date: "Apr 8", by: "Sarah Chen" },
    ],
    remindersSent: 2, lastReminder: "Apr 5",
  },
  "INV-2047": {
    ...INVOICES.find(i => i.inv === "INV-2047")!,
    lineItems: [
      { description: "Salesforce Enterprise License — Q2 2026", quantity: 1, unitPrice: "$12,000", total: "$12,000" },
      { description: "Advanced Analytics Module", quantity: 1, unitPrice: "$4,000", total: "$4,000" },
      { description: "Dedicated CSM Hours (10hrs)", quantity: 1, unitPrice: "$2,000", total: "$2,000" },
    ],
    contact: "Tom Hargrove", paymentTerms: "Net 30", currency: "USD",
    notes: "Largest invoice in the current cycle. Tom's team processes payments on the 15th of each month. No concerns — Driftwood has a perfect payment history.",
    paymentHistory: [
      { action: "Invoice sent via email", date: "Apr 1", by: "System" },
      { action: "Invoice viewed by recipient", date: "Apr 1", by: "Tom Hargrove" },
      { action: "Tom confirmed scheduled for Apr 15 payment run", date: "Apr 3", by: "Jordan Davis" },
    ],
    remindersSent: 0,
  },
  "INV-2041": {
    ...INVOICES.find(i => i.inv === "INV-2041")!,
    lineItems: [
      { description: "HubSpot Integration — Monthly", quantity: 1, unitPrice: "$1,800", total: "$1,800" },
      { description: "Email Automation Setup", quantity: 1, unitPrice: "$1,200", total: "$1,200" },
      { description: "Training Session (2hrs)", quantity: 1, unitPrice: "$600", total: "$600" },
    ],
    contact: "Priya Nair", paymentTerms: "Net 30", currency: "USD",
    notes: "Due Apr 19. Priya acknowledged the invoice during our last check-in. ClearPath typically pays within the payment window. No concerns at this time.",
    paymentHistory: [
      { action: "Invoice sent via email", date: "Mar 20", by: "System" },
      { action: "Invoice viewed by recipient", date: "Mar 21", by: "Priya Nair" },
    ],
    remindersSent: 0,
  },
};

type ARSortField = "account" | "inv" | "amount" | "status";
type ARSortDir = "asc" | "desc";

const arStatusOrder: Record<string, number> = { Overdue: 0, Pending: 1, Paid: 2 };

function parseAmount(s: string): number {
  return parseFloat(s.replace(/[^0-9.]/g, "")) || 0;
}

export default function ARTrackerView() {
  const [selected, setSelected] = useState<string | null>(null);
  const [drillDownKpi, setDrillDownKpi] = useState<string | null>(null);
  const toggleDrill = (key: string) => setDrillDownKpi(prev => prev === key ? null : key);

  // Derived AR data for drill-downs
  const totalAR = INVOICES.reduce((s, inv) => s + parseAmount(inv.amount), 0);
  const overdueInvoices = INVOICES.filter(inv => inv.status === "Overdue");
  const pendingInvoices = INVOICES.filter(inv => inv.status === "Pending" || inv.status === "Due Soon");
  const paidInvoices = INVOICES.filter(inv => inv.status === "Paid");
  const overdueTotal = overdueInvoices.reduce((s, inv) => s + parseAmount(inv.amount), 0);
  const paidTotal = paidInvoices.reduce((s, inv) => s + parseAmount(inv.amount), 0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<ARSortField>("account");
  const [sortDir, setSortDir] = useState<ARSortDir>("asc");

  const toggleSort = (field: ARSortField) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const SortIcon = ({ field }: { field: ARSortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="w-3 h-3 text-primary" /> : <ArrowDown className="w-3 h-3 text-primary" />;
  };

  const filtered = INVOICES
    .filter(inv => {
      if (statusFilter !== "all" && inv.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return inv.account.toLowerCase().includes(q) || inv.inv.toLowerCase().includes(q) || inv.amount.toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortField) {
        case "account": return dir * a.account.localeCompare(b.account);
        case "inv": return dir * a.inv.localeCompare(b.inv);
        case "amount": return dir * (parseAmount(a.amount) - parseAmount(b.amount));
        case "status": return dir * ((arStatusOrder[a.status] ?? 9) - (arStatusOrder[b.status] ?? 9));
        default: return 0;
      }
    });

  const selectedDetail = selected ? INVOICE_DETAILS[selected] : null;
  const hasFilters = search || statusFilter !== "all";

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-xl font-bold text-foreground">AR Tracker</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Outstanding invoices, payment status, and revenue tracking · Click any invoice for details
        </p>
      </motion.div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total AR", value: `$${(totalAR / 1000).toFixed(1)}K`, color: "text-foreground", key: "totalAR" },
          { label: "30-Day Overdue", value: `$${(overdueTotal / 1000).toFixed(1)}K`, color: "text-amber-600", key: "overdue30" },
          { label: "60+ Day Overdue", value: "$4,200", color: "text-red-600", key: "overdue60" },
          { label: "Collected (MTD)", value: `$${(paidTotal / 1000).toFixed(1)}K`, color: "text-emerald-700", key: "collected" },
        ].map((k, i) => {
          const isActive = drillDownKpi === k.key;
          return (
            <motion.button
              key={k.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => toggleDrill(k.key)}
              className={cn(
                "card-elevated rounded-xl border bg-card p-4 text-left transition-all cursor-pointer hover:shadow-md hover:border-primary/40",
                isActive ? "border-primary ring-2 ring-primary/20 shadow-md" : "border-border",
              )}
            >
              <div className="text-[10px] tracking-[0.1em] text-muted-foreground font-medium uppercase mb-1">{k.label}</div>
              <div className={cn("text-xl font-bold font-mono", k.color)}>{k.value}</div>
              <p className="text-[8px] text-primary/60 font-medium uppercase tracking-wider mt-1">Click to drill down</p>
            </motion.button>
          );
        })}
      </div>

      {/* ── AR Drill-Down Panel ── */}
      <AnimatePresence mode="wait">
        {drillDownKpi && (
          <motion.div key={drillDownKpi} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
            <div className="rounded-xl border border-primary/20 bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  {drillDownKpi === "totalAR" && <><DollarSign className="w-4 h-4 text-primary" /> Total AR — Invoice Breakdown</>}
                  {drillDownKpi === "overdue30" && <><AlertTriangle className="w-4 h-4 text-amber-600" /> 30-Day Overdue — Details</>}
                  {drillDownKpi === "overdue60" && <><AlertTriangle className="w-4 h-4 text-red-600" /> 60+ Day Overdue — Escalation</>}
                  {drillDownKpi === "collected" && <><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Collected (MTD) — Payments</>}
                </h3>
                <button onClick={() => setDrillDownKpi(null)} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-muted transition-colors">Close</button>
              </div>

              {/* Total AR */}
              {drillDownKpi === "totalAR" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Total Invoices</p><p className="text-lg font-bold font-mono text-foreground">{INVOICES.length}</p></div>
                    <div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Total Value</p><p className="text-lg font-bold font-mono text-foreground">${(totalAR / 1000).toFixed(1)}K</p></div>
                    <div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Overdue</p><p className="text-lg font-bold font-mono text-red-600">{overdueInvoices.length}</p></div>
                    <div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Paid</p><p className="text-lg font-bold font-mono text-emerald-600">{paidInvoices.length}</p></div>
                  </div>
                  <div className="rounded-lg border border-border overflow-hidden"><table className="w-full text-xs"><thead><tr className="bg-muted/50"><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Invoice</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Account</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Amount</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Issued</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Due</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Status</th></tr></thead><tbody className="divide-y divide-border">{INVOICES.map(inv => (<tr key={inv.inv}><td className="px-3 py-2 font-mono font-medium text-primary">{inv.inv}</td><td className="px-3 py-2 text-foreground">{inv.account}</td><td className="px-3 py-2 font-mono font-medium text-foreground">{inv.amount}</td><td className="px-3 py-2 text-muted-foreground">{inv.issued}</td><td className="px-3 py-2 text-muted-foreground">{inv.due}</td><td className="px-3 py-2"><span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", inv.status === "Overdue" ? "bg-red-50 text-red-700" : inv.status === "Paid" ? "bg-emerald-50 text-emerald-700" : inv.status === "Due Soon" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700")}>{inv.status}</span></td></tr>))}</tbody></table></div>
                </div>
              )}

              {/* 30-Day Overdue */}
              {drillDownKpi === "overdue30" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Overdue Count</p><p className="text-lg font-bold font-mono text-amber-600">{overdueInvoices.length}</p></div>
                    <div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Total Overdue</p><p className="text-lg font-bold font-mono text-red-600">${(overdueTotal / 1000).toFixed(1)}K</p></div>
                    <div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Avg Overdue</p><p className="text-lg font-bold font-mono text-foreground">${overdueInvoices.length > 0 ? (overdueTotal / overdueInvoices.length / 1000).toFixed(1) : 0}K</p></div>
                  </div>
                  {overdueInvoices.length > 0 ? (
                    <div className="rounded-lg border border-border overflow-hidden"><table className="w-full text-xs"><thead><tr className="bg-muted/50"><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Invoice</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Account</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Amount</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Due Date</th></tr></thead><tbody className="divide-y divide-border">{overdueInvoices.map(inv => (<tr key={inv.inv}><td className="px-3 py-2 font-mono font-medium text-primary">{inv.inv}</td><td className="px-3 py-2 text-foreground">{inv.account}</td><td className="px-3 py-2 font-mono font-medium text-red-600">{inv.amount}</td><td className="px-3 py-2 text-muted-foreground">{inv.due}</td></tr>))}</tbody></table></div>
                  ) : <p className="text-xs text-muted-foreground">No overdue invoices.</p>}
                </div>
              )}

              {/* 60+ Day Overdue */}
              {drillDownKpi === "overdue60" && (
                <div className="space-y-3">
                  <div className="rounded-lg bg-red-50/50 border border-red-200 p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-red-700">Escalation Required</p>
                        <p className="text-xs text-red-600 mt-1">Invoices past 60 days require finance escalation and direct outreach to account decision-makers.</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border overflow-hidden"><table className="w-full text-xs"><thead><tr className="bg-muted/50"><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Invoice</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Account</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Amount</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Due</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Status</th></tr></thead><tbody className="divide-y divide-border">{overdueInvoices.map(inv => (<tr key={inv.inv} className="bg-red-50/30"><td className="px-3 py-2 font-mono font-medium text-primary">{inv.inv}</td><td className="px-3 py-2 text-foreground">{inv.account}</td><td className="px-3 py-2 font-mono font-medium text-red-600">{inv.amount}</td><td className="px-3 py-2 text-muted-foreground">{inv.due}</td><td className="px-3 py-2"><span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-red-50 text-red-700">Overdue</span></td></tr>))}</tbody></table></div>
                </div>
              )}

              {/* Collected (MTD) */}
              {drillDownKpi === "collected" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Paid Invoices</p><p className="text-lg font-bold font-mono text-emerald-600">{paidInvoices.length}</p></div>
                    <div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Total Collected</p><p className="text-lg font-bold font-mono text-emerald-600">${(paidTotal / 1000).toFixed(1)}K</p></div>
                    <div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Collection Rate</p><p className="text-lg font-bold font-mono text-foreground">{totalAR > 0 ? ((paidTotal / totalAR) * 100).toFixed(0) : 0}%</p></div>
                  </div>
                  {paidInvoices.length > 0 ? (
                    <div className="rounded-lg border border-border overflow-hidden"><table className="w-full text-xs"><thead><tr className="bg-muted/50"><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Invoice</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Account</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Amount</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Issued</th></tr></thead><tbody className="divide-y divide-border">{paidInvoices.map(inv => (<tr key={inv.inv}><td className="px-3 py-2 font-mono font-medium text-primary">{inv.inv}</td><td className="px-3 py-2 text-foreground">{inv.account}</td><td className="px-3 py-2 font-mono font-medium text-emerald-600">{inv.amount}</td><td className="px-3 py-2 text-muted-foreground">{inv.issued}</td></tr>))}</tbody></table></div>
                  ) : <p className="text-xs text-muted-foreground">No payments collected this month.</p>}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search & Filters */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by account, invoice #, or amount..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="text-xs bg-card border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="all">All Statuses</option>
          <option value="Overdue">Overdue</option>
          <option value="Pending">Pending</option>
          <option value="Paid">Paid</option>
        </select>
        {hasFilters && (
          <button
            onClick={() => { setSearch(""); setStatusFilter("all"); }}
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3 h-3" /> Clear
          </button>
        )}
        <span className="text-[11px] text-muted-foreground ml-auto">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
      </motion.div>

      {/* Invoice table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="card-elevated rounded-xl border border-border bg-card overflow-hidden"
      >
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-3 px-5 py-3 text-[10px] tracking-[0.1em] text-muted-foreground font-medium uppercase border-b border-border">
          <button onClick={() => toggleSort("account")} className="flex items-center gap-1 hover:text-foreground transition-colors"><span>Account</span><SortIcon field="account" /></button>
          <button onClick={() => toggleSort("inv")} className="flex items-center gap-1 hover:text-foreground transition-colors"><span>Invoice</span><SortIcon field="inv" /></button>
          <button onClick={() => toggleSort("amount")} className="flex items-center gap-1 hover:text-foreground transition-colors"><span>Amount</span><SortIcon field="amount" /></button>
          <span>Issued</span>
          <span>Due</span>
          <button onClick={() => toggleSort("status")} className="flex items-center gap-1 hover:text-foreground transition-colors"><span>Status</span><SortIcon field="status" /></button>
        </div>
        {filtered.length === 0 && (
          <div className="px-5 py-10 text-center text-xs text-muted-foreground">No invoices match your filters</div>
        )}
        {filtered.map((inv, i) => (
          <motion.div
            key={inv.inv}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.05 }}
            onClick={() => setSelected(inv.inv)}
            className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-3 px-5 py-3.5 items-center border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <span className="text-[13px] text-foreground font-medium">{inv.account}</span>
              <ChevronRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </div>
            <span className="text-xs text-primary font-mono font-semibold">{inv.inv}</span>
            <span className="text-xs text-foreground font-mono font-semibold">{inv.amount}</span>
            <span className="text-xs text-muted-foreground">{inv.issued}</span>
            <span className="text-xs text-muted-foreground">{inv.due}</span>
            <span className={cn("text-[10px] px-2 py-0.5 rounded-md font-medium w-fit", statusColors[inv.status])}>
              {inv.status}
            </span>
          </motion.div>
        ))}
      </motion.div>

      {/* ── Invoice Detail Panel ── */}
      <Sheet open={!!selectedDetail} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent side="right" className="!w-[500px] !max-w-[90vw] bg-background border-l border-border p-0 overflow-hidden">
          {selectedDetail && <InvoiceDetailView invoice={selectedDetail} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ─── Invoice Detail Component ─── */
function InvoiceDetailView({ invoice }: { invoice: InvoiceDetail }) {
  const account = ACCOUNTS.find(a => a.name === invoice.account);
  const isOverdue = invoice.status === "Overdue";

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        {/* Header */}
        <SheetHeader className="p-0 space-y-3">
          <div className="flex items-start gap-4">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center",
              isOverdue ? "bg-red-100" : "bg-primary/10"
            )}>
              <Receipt className={cn("w-6 h-6", isOverdue ? "text-red-600" : "text-primary")} />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-lg text-foreground font-bold leading-tight">
                {invoice.inv}
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                <span>{invoice.account}</span>
                <span>·</span>
                <span className={cn("text-[10px] px-1.5 py-px rounded font-medium", statusColors[invoice.status])}>{invoice.status}</span>
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <DollarSign className="w-3.5 h-3.5 text-muted-foreground mx-auto mb-1" />
            <div className="text-[10px] text-muted-foreground uppercase">Amount</div>
            <div className="text-sm font-bold font-mono text-foreground">{invoice.amount}</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground mx-auto mb-1" />
            <div className="text-[10px] text-muted-foreground uppercase">Due</div>
            <div className={cn("text-sm font-bold font-mono", isOverdue ? "text-red-600" : "text-foreground")}>{invoice.due}</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <Mail className="w-3.5 h-3.5 text-muted-foreground mx-auto mb-1" />
            <div className="text-[10px] text-muted-foreground uppercase">Reminders</div>
            <div className="text-sm font-bold font-mono text-foreground">{invoice.remindersSent}</div>
          </div>
        </div>

        <Separator className="bg-border/40" />

        {/* Invoice Details */}
        <section>
          <h3 className="text-[11px] tracking-[0.1em] uppercase text-muted-foreground font-medium mb-3">Invoice Details</h3>
          <div className="space-y-3">
            <DetailRow icon={<Building2 className="w-3.5 h-3.5" />} label="Account" value={invoice.account} />
            <DetailRow icon={<User className="w-3.5 h-3.5" />} label="Contact" value={invoice.contact} />
            <DetailRow icon={<CreditCard className="w-3.5 h-3.5" />} label="Payment Terms" value={invoice.paymentTerms} />
            <DetailRow icon={<DollarSign className="w-3.5 h-3.5" />} label="Currency" value={invoice.currency} />
            <DetailRow icon={<Calendar className="w-3.5 h-3.5" />} label="Issued" value={invoice.issued} />
            {account && (
              <DetailRow icon={<Zap className="w-3.5 h-3.5" />} label="Account Health" value={`${account.health}/100`} valueClass={healthColor(account.health)} />
            )}
          </div>
        </section>

        <Separator className="bg-border/40" />

        {/* Line Items */}
        <section>
          <h3 className="text-[11px] tracking-[0.1em] uppercase text-muted-foreground font-medium mb-3">
            Line Items ({invoice.lineItems.length})
          </h3>
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="grid grid-cols-[2.5fr_0.5fr_1fr_1fr] gap-2 px-4 py-2 text-[9px] tracking-[0.1em] text-muted-foreground font-medium uppercase border-b border-border bg-muted/30">
              <span>Description</span>
              <span>Qty</span>
              <span>Unit Price</span>
              <span>Total</span>
            </div>
            {invoice.lineItems.map((item, i) => (
              <div key={i} className="grid grid-cols-[2.5fr_0.5fr_1fr_1fr] gap-2 px-4 py-3 items-center border-b border-border last:border-0">
                <span className="text-xs text-foreground">{item.description}</span>
                <span className="text-xs text-muted-foreground font-mono">{item.quantity}</span>
                <span className="text-xs text-muted-foreground font-mono">{item.unitPrice}</span>
                <span className="text-xs text-foreground font-mono font-semibold">{item.total}</span>
              </div>
            ))}
            <div className="grid grid-cols-[2.5fr_0.5fr_1fr_1fr] gap-2 px-4 py-3 bg-muted/30 border-t border-border">
              <span className="text-xs font-semibold text-foreground">Total</span>
              <span />
              <span />
              <span className="text-xs font-bold font-mono text-foreground">{invoice.amount}</span>
            </div>
          </div>
        </section>

        <Separator className="bg-border/40" />

        {/* Notes */}
        <section>
          <h3 className="text-[11px] tracking-[0.1em] uppercase text-muted-foreground font-medium mb-2">Notes</h3>
          <div className={cn(
            "rounded-xl border p-4",
            isOverdue ? "border-red-200 bg-red-50/50" : "border-border bg-card"
          )}>
            <div className="flex items-start gap-3">
              {isOverdue ? <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" /> : <FileText className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />}
              <p className="text-xs text-foreground leading-relaxed">{invoice.notes}</p>
            </div>
          </div>
        </section>

        <Separator className="bg-border/40" />

        {/* Payment Activity */}
        <section>
          <h3 className="text-[11px] tracking-[0.1em] uppercase text-muted-foreground font-medium mb-3">Payment Activity</h3>
          <div className="space-y-0">
            {invoice.paymentHistory.map((h, i) => (
              <div key={i} className="flex gap-3 pb-4 last:pb-0">
                <div className="flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                  {i < invoice.paymentHistory.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground">{h.action}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{h.date} · {h.by}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Inline Actions ── */}
        <Separator className="bg-border/40" />
        <section>
          <h3 className="text-[11px] tracking-[0.1em] uppercase text-muted-foreground font-medium mb-3">Quick Actions</h3>
          <div className="flex flex-wrap gap-2">
            {invoice.status !== "Paid" && (
              <button
                onClick={() => toast.success(`Invoice marked as paid`, { description: `${invoice.inv} for ${invoice.account} — ${invoice.amount} has been marked as paid.` })}
                className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/50 text-emerald-700 transition-colors"
              >
                <CheckCircle2 className="w-3 h-3" /> Mark Paid
              </button>
            )}
            {invoice.status === "Overdue" && (
              <button
                onClick={() => toast.info(`Payment reminder sent`, { description: `A payment reminder has been sent to ${invoice.contact} at ${invoice.account}.` })}
                className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-2 rounded-lg border border-amber-200 bg-amber-50/50 hover:bg-amber-100/50 text-amber-700 transition-colors"
              >
                <Send className="w-3 h-3" /> Send Reminder
              </button>
            )}
            {invoice.status === "Overdue" && (
              <button
                onClick={() => toast.warning(`Invoice escalated`, { description: `${invoice.inv} has been escalated to finance management for collection.` })}
                className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-2 rounded-lg border border-red-200 bg-red-50/50 hover:bg-red-100/50 text-red-700 transition-colors"
              >
                <AlertTriangle className="w-3 h-3" /> Escalate
              </button>
            )}
            <button
              onClick={() => toast.success(`Invoice reassigned`, { description: `${invoice.inv} has been reassigned to a new collections owner.` })}
              className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted/50 text-foreground transition-colors"
            >
              <UserPlus className="w-3 h-3" /> Reassign
            </button>
            <button
              onClick={() => toast.success(`Call scheduled`, { description: `A follow-up call with ${invoice.contact} has been scheduled.` })}
              className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted/50 text-foreground transition-colors"
            >
              <Phone className="w-3 h-3" /> Schedule Call
            </button>
          </div>
        </section>

        {/* Rep Notes (interactive, linked to account) */}
        <ActivityNotes account={invoice.account} section="ar" itemRef={invoice.inv} />
      </div>
    </ScrollArea>
  );
}

/* ─── Helper ─── */
function DetailRow({ icon, label, value, valueClass }: { icon: React.ReactNode; label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-muted-foreground">{icon}</div>
      <span className="text-xs text-muted-foreground w-28">{label}</span>
      <span className={cn("text-xs font-medium text-foreground", valueClass)}>{value}</span>
    </div>
  );
}
