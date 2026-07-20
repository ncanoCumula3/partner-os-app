/*
 * IntegrationsView — Platform Integrations panel
 * Shows connectivity status for all major cloud CRM/ERP platforms
 * Warm adaptive theme
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Plug, CheckCircle2, XCircle, Clock, AlertTriangle,
  ChevronRight, RefreshCw, Settings2, ExternalLink, Search,
  Shield, Zap, Database, Cloud, Globe, Lock, ArrowRight,
  BarChart3, Users, FileText, CreditCard, Mail, Phone,
  Package, TrendingUp, Building2, Layers,
} from "lucide-react";

/* ── Types ──────────────────────────────────────────────────── */
interface Integration {
  id: string;
  name: string;
  category: "CRM" | "ERP" | "Marketing" | "Support" | "Finance" | "Communication" | "Analytics";
  description: string;
  status: "connected" | "available" | "coming_soon" | "error";
  version?: string;
  lastSync?: string;
  dataPoints?: string[];
  features: string[];
  logo: string; // emoji or letter as placeholder
  color: string;
  accounts?: number;
}

/* ── Mock Data ──────────────────────────────────────────────── */
const INTEGRATIONS: Integration[] = [
  // CRM
  {
    id: "salesforce", name: "Salesforce", category: "CRM",
    description: "Full CRM integration — accounts, contacts, opportunities, cases, and custom objects",
    status: "connected", version: "API v59.0", lastSync: "2 min ago",
    dataPoints: ["Accounts", "Contacts", "Opportunities", "Cases", "Tasks", "Custom Objects"],
    features: ["Bi-directional sync", "Real-time webhooks", "Custom field mapping", "Bulk data import"],
    logo: "SF", color: "text-sky-700", accounts: 3,
  },
  {
    id: "hubspot", name: "HubSpot", category: "CRM",
    description: "Marketing, sales, and service hub integration with full contact and deal sync",
    status: "connected", version: "API v3", lastSync: "5 min ago",
    dataPoints: ["Contacts", "Companies", "Deals", "Tickets", "Email Events", "Workflows"],
    features: ["Contact sync", "Deal pipeline sync", "Email tracking", "Form submissions"],
    logo: "HS", color: "text-orange-400", accounts: 1,
  },
  {
    id: "dynamics365", name: "Microsoft Dynamics 365", category: "CRM",
    description: "Full Dynamics CRM and ERP integration — sales, service, finance, and operations",
    status: "available",
    features: ["Account sync", "Opportunity tracking", "Service cases", "Finance modules", "Power Automate triggers"],
    logo: "D3", color: "text-blue-400",
  },
  {
    id: "zoho", name: "Zoho CRM", category: "CRM",
    description: "Complete Zoho CRM integration with leads, deals, contacts, and custom modules",
    status: "available",
    features: ["Lead management", "Deal tracking", "Contact sync", "Custom modules", "Zoho Analytics"],
    logo: "ZO", color: "text-red-400",
  },
  {
    id: "pipedrive", name: "Pipedrive", category: "CRM",
    description: "Sales pipeline management with deal tracking and activity sync",
    status: "available",
    features: ["Deal sync", "Activity tracking", "Contact management", "Pipeline stages"],
    logo: "PD", color: "text-emerald-700",
  },
  {
    id: "freshsales", name: "Freshsales", category: "CRM",
    description: "Freshworks CRM integration with AI-powered lead scoring and deal management",
    status: "available",
    features: ["Lead scoring", "Deal management", "Email tracking", "Phone integration"],
    logo: "FS", color: "text-teal-400",
  },
  {
    id: "sugarcrm", name: "SugarCRM", category: "CRM",
    description: "Enterprise CRM with advanced customization and workflow automation",
    status: "coming_soon",
    features: ["Account management", "Opportunity tracking", "Custom workflows"],
    logo: "SC", color: "text-red-600",
  },
  // ERP
  {
    id: "netsuite", name: "Oracle NetSuite", category: "ERP",
    description: "Full ERP integration — financials, inventory, orders, CRM, and custom records",
    status: "connected", version: "SuiteScript 2.1", lastSync: "1 min ago",
    dataPoints: ["Customers", "Invoices", "Sales Orders", "Inventory", "Financial Reports", "Custom Records"],
    features: ["Real-time sync", "SuiteScript automation", "Saved search integration", "Custom record support"],
    logo: "NS", color: "text-amber-600", accounts: 2,
  },
  {
    id: "sap", name: "SAP S/4HANA Cloud", category: "ERP",
    description: "Enterprise ERP integration — finance, procurement, manufacturing, and supply chain",
    status: "available",
    features: ["Financial accounting", "Material management", "Sales & distribution", "Production planning", "API integration"],
    logo: "SP", color: "text-blue-300",
  },
  {
    id: "sage", name: "Sage Intacct", category: "ERP",
    description: "Cloud financial management — GL, AP, AR, cash management, and reporting",
    status: "available",
    features: ["General ledger", "Accounts payable", "Accounts receivable", "Financial reporting", "Multi-entity"],
    logo: "SI", color: "text-green-400",
  },
  {
    id: "acumatica", name: "Acumatica", category: "ERP",
    description: "Cloud ERP with financial management, distribution, manufacturing, and CRM",
    status: "available",
    features: ["Financial management", "Distribution", "Manufacturing", "Project accounting"],
    logo: "AC", color: "text-blue-700",
  },
  {
    id: "odoo", name: "Odoo", category: "ERP",
    description: "Open-source ERP suite — sales, inventory, accounting, manufacturing, and more",
    status: "coming_soon",
    features: ["Sales management", "Inventory", "Accounting", "Manufacturing", "HR"],
    logo: "OD", color: "text-purple-400",
  },
  {
    id: "epicor", name: "Epicor Kinetic", category: "ERP",
    description: "Manufacturing and distribution ERP with cloud-native architecture",
    status: "coming_soon",
    features: ["Manufacturing", "Supply chain", "Financial management", "HR"],
    logo: "EP", color: "text-cyan-400",
  },
  // Marketing
  {
    id: "marketo", name: "Marketo Engage", category: "Marketing",
    description: "Marketing automation — email campaigns, lead nurturing, scoring, and analytics",
    status: "connected", version: "REST API v1", lastSync: "8 min ago",
    dataPoints: ["Leads", "Campaigns", "Email Stats", "Landing Pages", "Forms"],
    features: ["Lead sync", "Campaign tracking", "Email analytics", "Form integration"],
    logo: "MK", color: "text-purple-400", accounts: 1,
  },
  {
    id: "mailchimp", name: "Mailchimp", category: "Marketing",
    description: "Email marketing and automation with audience segmentation and analytics",
    status: "available",
    features: ["Email campaigns", "Audience sync", "Automation workflows", "Analytics"],
    logo: "MC", color: "text-yellow-400",
  },
  {
    id: "pardot", name: "Salesforce Pardot", category: "Marketing",
    description: "B2B marketing automation with lead generation, scoring, and ROI reporting",
    status: "available",
    features: ["Lead generation", "Email marketing", "Lead scoring", "ROI reporting"],
    logo: "PT", color: "text-sky-300",
  },
  // Support
  {
    id: "zendesk", name: "Zendesk", category: "Support",
    description: "Customer support platform — tickets, knowledge base, chat, and analytics",
    status: "available",
    features: ["Ticket sync", "Knowledge base", "Chat integration", "CSAT tracking"],
    logo: "ZD", color: "text-emerald-300",
  },
  {
    id: "freshdesk", name: "Freshdesk", category: "Support",
    description: "Helpdesk and customer support with ticketing, automation, and self-service",
    status: "available",
    features: ["Ticket management", "Automation", "Self-service portal", "SLA management"],
    logo: "FD", color: "text-teal-300",
  },
  {
    id: "intercom", name: "Intercom", category: "Support",
    description: "Customer messaging platform with live chat, bots, and product tours",
    status: "coming_soon",
    features: ["Live chat", "Chatbots", "Product tours", "Help center"],
    logo: "IC", color: "text-blue-300",
  },
  // Finance
  {
    id: "quickbooks", name: "QuickBooks Online", category: "Finance",
    description: "Accounting and invoicing — sync invoices, payments, and financial data",
    status: "available",
    features: ["Invoice sync", "Payment tracking", "Expense management", "Financial reports"],
    logo: "QB", color: "text-green-400",
  },
  {
    id: "xero", name: "Xero", category: "Finance",
    description: "Cloud accounting with invoicing, bank reconciliation, and financial reporting",
    status: "available",
    features: ["Invoicing", "Bank reconciliation", "Financial reporting", "Payroll"],
    logo: "XR", color: "text-sky-700",
  },
  {
    id: "stripe", name: "Stripe", category: "Finance",
    description: "Payment processing — subscriptions, invoices, and revenue recognition",
    status: "available",
    features: ["Payment sync", "Subscription tracking", "Invoice management", "Revenue recognition"],
    logo: "ST", color: "text-blue-700",
  },
  // Communication
  {
    id: "slack", name: "Slack", category: "Communication",
    description: "Team messaging with SLA alerts, ticket notifications, and account updates",
    status: "available",
    features: ["SLA breach alerts", "Ticket notifications", "Account health updates", "Slash commands"],
    logo: "SL", color: "text-purple-300",
  },
  {
    id: "teams", name: "Microsoft Teams", category: "Communication",
    description: "Team collaboration with notifications, alerts, and embedded dashboards",
    status: "available",
    features: ["Alert notifications", "Embedded tabs", "Bot integration", "Meeting scheduling"],
    logo: "TM", color: "text-blue-400",
  },
  // Analytics
  {
    id: "tableau", name: "Tableau", category: "Analytics",
    description: "Business intelligence and data visualization with Partner OS data connectors",
    status: "coming_soon",
    features: ["Data connectors", "Dashboard embedding", "Custom visualizations"],
    logo: "TB", color: "text-orange-300",
  },
  {
    id: "powerbi", name: "Power BI", category: "Analytics",
    description: "Microsoft analytics with Partner OS data integration and embedded reports",
    status: "coming_soon",
    features: ["Data integration", "Embedded reports", "Custom dashboards"],
    logo: "PB", color: "text-yellow-300",
  },
];

const CATEGORIES = ["CRM", "ERP", "Marketing", "Support", "Finance", "Communication", "Analytics"] as const;

const categoryIcons: Record<string, React.ElementType> = {
  CRM: Users,
  ERP: Database,
  Marketing: Mail,
  Support: Phone,
  Finance: CreditCard,
  Communication: Globe,
  Analytics: BarChart3,
};

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  connected: { label: "Connected", color: "text-emerald-700", bgColor: "bg-emerald-600/10 border-emerald-200", icon: CheckCircle2 },
  available: { label: "Available", color: "text-primary", bgColor: "bg-primary/10 border-primary/20", icon: Plug },
  coming_soon: { label: "Coming Soon", color: "text-muted-foreground/50", bgColor: "bg-muted/10 border-border", icon: Clock },
  error: { label: "Error", color: "text-red-600", bgColor: "bg-red-500/10 border-red-200", icon: XCircle },
};

/* ── Main Component ─────────────────────────────────────────── */
export default function IntegrationsView() {
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = INTEGRATIONS.filter((int) => {
    if (filterCategory && int.category !== filterCategory) return false;
    if (filterStatus && int.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      return int.name.toLowerCase().includes(q) || int.description.toLowerCase().includes(q) || int.category.toLowerCase().includes(q);
    }
    return true;
  });

  const connectedCount = INTEGRATIONS.filter((i) => i.status === "connected").length;
  const availableCount = INTEGRATIONS.filter((i) => i.status === "available").length;
  const comingSoonCount = INTEGRATIONS.filter((i) => i.status === "coming_soon").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
            <Plug className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">Platform Integrations</h1>
            <p className="text-xs text-muted-foreground">Connect to any cloud-based CRM, ERP, or business application</p>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Platforms", value: INTEGRATIONS.length, icon: Layers, color: "text-foreground" },
          { label: "Connected", value: connectedCount, icon: CheckCircle2, color: "text-emerald-700" },
          { label: "Available", value: availableCount, icon: Plug, color: "text-primary" },
          { label: "Coming Soon", value: comingSoonCount, icon: Clock, color: "text-muted-foreground" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <s.icon className={cn("w-4 h-4", s.color)} />
              <span className="text-[10px] tracking-[0.08em] uppercase text-muted-foreground/60">{s.label}</span>
            </div>
            <div className={cn("text-2xl font-bold font-mono", s.color)}>{s.value}</div>
          </div>
        ))}
      </motion.div>

      {/* Filters */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search platforms..."
            className="w-full h-9 rounded-lg bg-card border border-border pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
          />
        </div>

        {/* Category filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground/40 mr-1">Category:</span>
          <button
            onClick={() => setFilterCategory(null)}
            className={cn(
              "h-7 px-2.5 rounded-full text-[10px] font-medium border transition-all",
              !filterCategory ? "border-primary/30 bg-primary/10 text-primary" : "border-border text-muted-foreground/50 hover:text-foreground"
            )}
          >
            All
          </button>
          {CATEGORIES.map((c) => {
            const CIcon = categoryIcons[c];
            return (
              <button
                key={c}
                onClick={() => setFilterCategory(filterCategory === c ? null : c)}
                className={cn(
                  "h-7 px-2.5 rounded-full text-[10px] font-medium border transition-all flex items-center gap-1",
                  filterCategory === c ? "border-primary/30 bg-primary/10 text-primary" : "border-border text-muted-foreground/50 hover:text-foreground"
                )}
              >
                <CIcon className="w-3 h-3" />
                {c}
              </button>
            );
          })}
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground/40 mr-1">Status:</span>
          {(["connected", "available", "coming_soon"] as const).map((s) => {
            const cfg = statusConfig[s];
            return (
              <button
                key={s}
                onClick={() => setFilterStatus(filterStatus === s ? null : s)}
                className={cn(
                  "h-7 px-2.5 rounded-full text-[10px] font-medium border transition-all flex items-center gap-1",
                  filterStatus === s ? cfg.bgColor + " " + cfg.color : "border-border text-muted-foreground/50 hover:text-foreground"
                )}
              >
                <cfg.icon className="w-3 h-3" />
                {cfg.label}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Integration cards grid */}
      <div className="grid grid-cols-2 gap-3">
        <AnimatePresence>
          {filtered.map((int, i) => {
            const sCfg = statusConfig[int.status];
            const isExpanded = expandedId === int.id;

            return (
              <motion.div
                key={int.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.02 }}
                layout
                className={cn(
                  "rounded-xl border bg-card/30 overflow-hidden transition-all",
                  int.status === "connected" ? "border-emerald-400/15" :
                  int.status === "coming_soon" ? "border-border/50 opacity-60" :
                  "border-border"
                )}
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : int.id)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-muted/5 transition-colors text-left"
                >
                  {/* Logo */}
                  <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 border", sCfg.bgColor, int.color)}>
                    {int.logo}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[13px] font-semibold text-foreground">{int.name}</span>
                      <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full border font-medium", sCfg.color, sCfg.bgColor)}>
                        {sCfg.label}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-border text-muted-foreground/40">{int.category}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground/50 truncate">{int.description}</p>
                    {int.status === "connected" && (
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground/30">
                        <span className="flex items-center gap-1"><RefreshCw className="w-3 h-3" />{int.lastSync}</span>
                        {int.version && <span className="font-mono">{int.version}</span>}
                        {int.accounts && <span>{int.accounts} account{int.accounts > 1 ? "s" : ""}</span>}
                      </div>
                    )}
                  </div>

                  <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} className="shrink-0">
                    <ChevronRight className="w-4 h-4 text-muted-foreground/30" />
                  </motion.div>
                </button>

                {/* Expanded detail */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-border/50 p-4 space-y-4">
                        {/* Data points (connected only) */}
                        {int.dataPoints && (
                          <div>
                            <h4 className="text-[10px] tracking-[0.08em] uppercase text-muted-foreground/40 mb-2">Synced Data</h4>
                            <div className="flex flex-wrap gap-1.5">
                              {int.dataPoints.map((dp) => (
                                <span key={dp} className="text-[10px] px-2 py-1 rounded-md bg-emerald-600/[0.06] border border-emerald-400/15 text-emerald-700/70">
                                  {dp}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Features */}
                        <div>
                          <h4 className="text-[10px] tracking-[0.08em] uppercase text-muted-foreground/40 mb-2">
                            {int.status === "connected" ? "Active Features" : "Available Features"}
                          </h4>
                          <div className="grid grid-cols-2 gap-1.5">
                            {int.features.map((f) => (
                              <div key={f} className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60">
                                <CheckCircle2 className={cn("w-3 h-3 shrink-0", int.status === "connected" ? "text-emerald-700/60" : "text-primary/40")} />
                                {f}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 pt-1">
                          {int.status === "connected" ? (
                            <>
                              <button className="h-8 px-3 rounded-lg bg-muted/10 border border-border text-[11px] font-medium text-foreground/70 hover:bg-muted/20 transition-colors flex items-center gap-1.5">
                                <Settings2 className="w-3 h-3" />
                                Configure
                              </button>
                              <button className="h-8 px-3 rounded-lg bg-muted/10 border border-border text-[11px] font-medium text-foreground/70 hover:bg-muted/20 transition-colors flex items-center gap-1.5">
                                <RefreshCw className="w-3 h-3" />
                                Sync Now
                              </button>
                              <button className="h-8 px-3 rounded-lg text-[11px] font-medium text-muted-foreground/40 hover:text-red-600 transition-colors flex items-center gap-1.5">
                                <XCircle className="w-3 h-3" />
                                Disconnect
                              </button>
                            </>
                          ) : int.status === "available" ? (
                            <button className="h-8 px-4 rounded-lg bg-gradient-to-r from-primary to-primary/70 text-foreground text-[11px] font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all flex items-center gap-1.5">
                              <Plug className="w-3 h-3" />
                              Connect
                            </button>
                          ) : (
                            <div className="h-8 px-4 rounded-lg bg-muted/10 border border-border text-[11px] font-medium text-muted-foreground/30 flex items-center gap-1.5">
                              <Clock className="w-3 h-3" />
                              Coming Soon
                            </div>
                          )}
                          <button className="h-8 px-3 rounded-lg text-[11px] font-medium text-muted-foreground/40 hover:text-primary transition-colors flex items-center gap-1.5 ml-auto">
                            <ExternalLink className="w-3 h-3" />
                            Docs
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {filtered.length === 0 && (
        <div className="rounded-xl border border-border bg-card/30 p-12 text-center">
          <Search className="w-8 h-8 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground/40">No integrations match your search</p>
        </div>
      )}

      {/* API Access card */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="rounded-xl border border-primary/15 bg-gradient-to-r from-primary/[0.04] to-primary/[0.02] p-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shrink-0">
            <Cloud className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-foreground mb-0.5">Custom API Integration</h3>
            <p className="text-[11px] text-muted-foreground/50">
              Don't see your platform? Partner OS provides a REST API and webhook system to connect any cloud-based application.
              Build custom integrations with our developer toolkit.
            </p>
          </div>
          <button className="h-9 px-4 rounded-lg border border-primary/20 text-[11px] font-medium text-primary hover:bg-primary/10 transition-colors flex items-center gap-1.5 shrink-0">
            <FileText className="w-3.5 h-3.5" />
            API Docs
          </button>
        </div>
      </motion.div>
    </div>
  );
}
