/*
 * AccountDetailPanel — slide-out side panel for account details
 * Shows: contact card, health gauge, key metrics, activity timeline, notes
 * Uses the pre-built Sheet component from shadcn/ui
 * Warm adaptive theme
 */
import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  TICKETS, OUTREACH, INVOICES,
  healthColor, tierColors, statusColors, priorityColors,
  daysUntilLED, getLEDUrgency, formatLEDDate,
  ledUrgencyColors, ledUrgencyLabels, renewalStatusColors,
  customerTypeColors, downsellRiskColors,
} from "@/lib/data";
import type { Account } from "@/lib/data";
import { cn } from "@/lib/utils";
import {
  User, Mail, Phone, Building2, Globe, Calendar, Clock,
  MessageSquare, AlertTriangle, TrendingUp, Receipt, Send,
  CheckCircle2, Circle, ArrowUpRight, Shield, Sparkles,
  CalendarClock, Package, Users, AlertOctagon, TrendingDown,
} from "lucide-react";

/* ── Extended mock data per account ─────────────────────────── */
interface ContactDetail {
  email: string;
  phone: string;
  role: string;
  department: string;
  location: string;
}

interface ActivityEvent {
  id: string;
  type: "call" | "email" | "meeting" | "ticket" | "milestone" | "note";
  title: string;
  description: string;
  date: string;
  time: string;
}

const CONTACT_DETAILS: Record<number, ContactDetail> = {
  1: { email: "dana.reyes@apexmfg.com", phone: "+1 (415) 555-0142", role: "VP of Operations", department: "Operations", location: "San Francisco, CA" },
  2: { email: "marcus.lin@bluewave.io", phone: "+1 (312) 555-0198", role: "Director of IT", department: "Information Technology", location: "Chicago, IL" },
  3: { email: "priya.nair@clearpath.com", phone: "+1 (646) 555-0173", role: "Head of E-Commerce", department: "Digital Commerce", location: "New York, NY" },
  4: { email: "tom.hargrove@driftwood.com", phone: "+1 (512) 555-0156", role: "CFO", department: "Finance", location: "Austin, TX" },
  5: { email: "sofia.ruiz@edgeline.co", phone: "+1 (305) 555-0134", role: "Operations Manager", department: "Supply Chain", location: "Miami, FL" },
};

const ACTIVITY_TIMELINE: Record<number, ActivityEvent[]> = {
  1: [
    { id: "a1", type: "meeting", title: "QBR Prep Call", description: "Reviewed Q1 metrics and expansion targets with Dana", date: "Apr 10", time: "2:00 PM" },
    { id: "a2", type: "email", title: "Expansion Proposal Sent", description: "Sent pricing for 3 additional modules", date: "Apr 8", time: "10:30 AM" },
    { id: "a3", type: "milestone", title: "Health Score Hit 92", description: "Crossed the 90-point threshold for the first time", date: "Apr 5", time: "—" },
    { id: "a4", type: "call", title: "Monthly Check-in", description: "Discussed inventory module performance improvements", date: "Mar 28", time: "3:00 PM" },
    { id: "a5", type: "ticket", title: "Ticket T-1038 Opened", description: "Custom dashboard not reflecting real-time inventory data", date: "Mar 25", time: "9:15 AM" },
    { id: "a6", type: "note", title: "Internal Note", description: "Dana mentioned potential budget increase in Q3 — follow up after QBR", date: "Mar 20", time: "—" },
  ],
  2: [
    { id: "b1", type: "call", title: "Health Check Scheduled", description: "Booked urgent health check call with Marcus for Apr 12", date: "Apr 9", time: "4:00 PM" },
    { id: "b2", type: "ticket", title: "Ticket T-1041 Escalated", description: "Revenue recognition module errors on multi-currency invoices — critical", date: "Apr 7", time: "11:00 AM" },
    { id: "b3", type: "email", title: "Follow-up on Integration Issues", description: "Sent troubleshooting guide for Salesforce sync failures", date: "Apr 3", time: "2:30 PM" },
    { id: "b4", type: "meeting", title: "Escalation Review", description: "Internal meeting to discuss BlueWave risk mitigation strategy", date: "Mar 30", time: "10:00 AM" },
    { id: "b5", type: "note", title: "Risk Flag Added", description: "Account moved to At Risk after 3 consecutive CSAT drops", date: "Mar 27", time: "—" },
  ],
  3: [
    { id: "c1", type: "email", title: "Check-in Reminder Sent", description: "Sent agenda for upcoming Apr 22 check-in with Priya", date: "Apr 10", time: "9:00 AM" },
    { id: "c2", type: "milestone", title: "Ticket T-1035 Resolved", description: "Email sequence issue fixed — confirmed by Priya", date: "Apr 6", time: "—" },
    { id: "c3", type: "call", title: "Quarterly Review", description: "Reviewed HubSpot adoption metrics — strong engagement", date: "Mar 22", time: "1:00 PM" },
    { id: "c4", type: "note", title: "Upsell Opportunity", description: "Priya expressed interest in marketing automation add-on", date: "Mar 18", time: "—" },
  ],
  4: [
    { id: "d1", type: "meeting", title: "Upsell Discovery Call", description: "Deep dive into Driftwood's reporting needs for advanced analytics", date: "Apr 11", time: "11:00 AM" },
    { id: "d2", type: "email", title: "ROI Report Delivered", description: "Sent custom ROI analysis showing 340% return on Salesforce investment", date: "Apr 7", time: "3:00 PM" },
    { id: "d3", type: "milestone", title: "Health Score Hit 95", description: "Highest health score in the portfolio — champion account", date: "Apr 4", time: "—" },
    { id: "d4", type: "ticket", title: "Ticket T-1029 Opened", description: "Apex trigger causing CPU limit on large opportunity batch", date: "Mar 30", time: "8:45 AM" },
    { id: "d5", type: "call", title: "Executive Sponsor Intro", description: "Connected Tom with our VP of Customer Success", date: "Mar 25", time: "2:00 PM" },
  ],
  5: [
    { id: "e1", type: "call", title: "Escalation Call Scheduled", description: "Urgent call with Sofia to address declining health score", date: "Apr 10", time: "10:00 AM" },
    { id: "e2", type: "email", title: "Recovery Plan Sent", description: "Shared 30-day recovery plan with action items and milestones", date: "Apr 8", time: "1:30 PM" },
    { id: "e3", type: "meeting", title: "Internal Risk Review", description: "Team meeting to assess Edgeline churn probability and mitigation", date: "Apr 4", time: "9:00 AM" },
    { id: "e4", type: "note", title: "Budget Concerns Flagged", description: "Sofia mentioned potential budget cuts — may impact renewal", date: "Mar 29", time: "—" },
    { id: "e5", type: "ticket", title: "Support Ticket Submitted", description: "Inventory sync delays between NetSuite and warehouse system", date: "Mar 22", time: "11:30 AM" },
  ],
};

const activityIcon: Record<string, React.ReactNode> = {
  call: <Phone className="w-3.5 h-3.5" />,
  email: <Send className="w-3.5 h-3.5" />,
  meeting: <Calendar className="w-3.5 h-3.5" />,
  ticket: <AlertTriangle className="w-3.5 h-3.5" />,
  milestone: <Sparkles className="w-3.5 h-3.5" />,
  note: <MessageSquare className="w-3.5 h-3.5" />,
};

const activityColor: Record<string, string> = {
  call: "text-sky-700 bg-sky-50 border-sky-200",
  email: "text-indigo-700 bg-indigo-50 border-indigo-200",
  meeting: "text-violet-700 bg-violet-50 border-violet-200",
  ticket: "text-amber-700 bg-amber-50 border-amber-200",
  milestone: "text-emerald-700 bg-emerald-50 border-emerald-200",
  note: "text-slate-600 bg-slate-50 border-slate-200",
};

/* ── Props ──────────────────────────────────────────────────── */
interface AccountDetailPanelProps {
  account: Account | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AccountDetailPanel({ account, open, onOpenChange }: AccountDetailPanelProps) {
  // Gather related data for this account
  const relatedTickets = useMemo(
    () => (account ? TICKETS.filter((t) => t.account === account.name) : []),
    [account]
  );
  const relatedOutreach = useMemo(
    () => (account ? OUTREACH.filter((o) => o.account === account.name) : []),
    [account]
  );
  const relatedInvoices = useMemo(
    () => (account ? INVOICES.filter((inv) => inv.account === account.name) : []),
    [account]
  );

  if (!account) return null;

  const contact = CONTACT_DETAILS[account.id];
  const timeline = ACTIVITY_TIMELINE[account.id] || [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="!w-[480px] !max-w-[90vw] bg-background border-l border-border p-0 overflow-hidden"
      >
        <ScrollArea className="h-full">
          <div className="p-6 space-y-6">
            {/* ── Header ──────────────────────────────── */}
            <SheetHeader className="p-0 space-y-3">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-lg font-bold text-primary">
                  {account.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <SheetTitle className="text-lg text-foreground font-bold leading-tight">
                    {account.name}
                  </SheetTitle>
                  <SheetDescription className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                    <span className="flex items-center gap-1">
                      <Globe className="w-3 h-3" /> {account.platform}
                    </span>
                    <span className={cn("text-[10px] px-1.5 py-px rounded border font-medium", tierColors[account.tier])}>
                      {account.tier}
                    </span>
                    <span className={cn("text-[10px] px-1.5 py-px rounded font-medium", statusColors[account.stage] || "text-muted-foreground bg-muted")}>
                      {account.stage}
                    </span>
                    <span className={cn("text-[10px] px-1.5 py-px rounded border font-medium", customerTypeColors[account.customerType])}>
                      {account.customerType}
                    </span>
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            {/* ── Key Metrics Row ─────────────────────── */}
            <div className="grid grid-cols-3 gap-3">
              <MetricCard
                label="Health"
                value={String(account.health)}
                colorClass={healthColor(account.health)}
                icon={<Shield className="w-3.5 h-3.5" />}
              />
              <MetricCard
                label="ARR"
                value={`$${(account.arr / 1000).toFixed(0)}K`}
                colorClass="text-foreground"
                icon={<TrendingUp className="w-3.5 h-3.5" />}
              />
              <MetricCard
                label="Tickets"
                value={String(relatedTickets.length)}
                colorClass={relatedTickets.some((t) => t.priority === "Critical") ? "text-rose-400" : "text-foreground"}
                icon={<AlertTriangle className="w-3.5 h-3.5" />}
              />
            </div>

            {/* ── License End Date / Renewal Section (SaaS & Hybrid only) ── */}
            {account.saasLicense && (() => {
              const lic = account.saasLicense;
              const days = daysUntilLED(lic.licenseEndDate);
              const urgency = getLEDUrgency(account);
              const uc = ledUrgencyColors[urgency];
              return (
                <section>
                  <h3 className="text-[11px] tracking-[0.1em] uppercase text-muted-foreground font-medium mb-3">
                    License & Renewal
                  </h3>
                  <div className={cn("rounded-xl border p-4 space-y-3", uc.border, uc.bg)}>
                    {/* LED countdown */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", uc.bg)}>
                          <CalendarClock className={cn("w-4 h-4", uc.text)} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">License End Date</p>
                          <p className={cn("text-xs font-mono font-bold", uc.text)}>
                            {formatLEDDate(lic.licenseEndDate)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={cn("text-lg font-bold font-mono", uc.text)}>
                          {days}d
                        </div>
                        <div className="text-[10px] text-muted-foreground">remaining</div>
                      </div>
                    </div>

                    {/* Urgency badge */}
                    <div className={cn("text-[10px] px-2 py-1 rounded font-semibold text-center", uc.text, uc.bg, "border", uc.border)}>
                      {urgency === "critical" && <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse mr-1.5" />}
                      {ledUrgencyLabels[urgency]}
                      {days <= 180 && " — Renewal process should be active"}
                    </div>

                    {/* Renewal details grid */}
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <Package className="w-3 h-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Tier:</span>
                        <span className="font-medium text-foreground">{lic.subscriptionTier}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3 h-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Seats:</span>
                        <span className="font-medium text-foreground">{lic.seats}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="w-3 h-3 text-muted-foreground" />
                        <span className="text-muted-foreground">License ARR:</span>
                        <span className="font-medium text-foreground">${(lic.annualLicenseValue / 1000).toFixed(0)}K</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Term:</span>
                        <span className="font-medium text-foreground">{lic.contractTermMonths}mo</span>
                      </div>
                    </div>

                    {/* Modules */}
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Active Modules</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {lic.modules.map((m) => (
                          <span key={m} className="text-[10px] px-1.5 py-0.5 rounded bg-card border border-border text-foreground font-medium">
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Renewal Status + Risk */}
                    <div className="flex items-center gap-2">
                      <span className={cn("text-[10px] px-2 py-0.5 rounded font-medium", renewalStatusColors[lic.renewalStatus])}>
                        Renewal: {lic.renewalStatus}
                      </span>
                      <span className={cn("text-[10px] px-2 py-0.5 rounded font-medium", downsellRiskColors[lic.downsellRisk])}>
                        Downsell: {lic.downsellRisk}
                      </span>
                    </div>

                    {/* Downsell warning */}
                    {lic.downsellRisk !== "None" && lic.downsellNotes && (
                      <div className="flex items-start gap-2 p-2 rounded-lg bg-card/80 border border-border">
                        <AlertOctagon className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] font-semibold text-red-700">Downsell Risk</p>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">{lic.downsellNotes}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              );
            })()}

            <Separator className="bg-border/40" />

            {/* ── Contact Information ─────────────────── */}
            <section>
              <h3 className="text-[11px] tracking-[0.1em] uppercase text-muted-foreground font-medium mb-3">
                Primary Contact
              </h3>
              <div className="rounded-xl border border-border/60 bg-card/50 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                    <User className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{account.contact}</p>
                    {contact && (
                      <p className="text-[11px] text-muted-foreground">{contact.role}</p>
                    )}
                  </div>
                </div>
                {contact && (
                  <div className="space-y-2 pl-12">
                    <ContactRow icon={<Mail className="w-3.5 h-3.5" />} value={contact.email} />
                    <ContactRow icon={<Phone className="w-3.5 h-3.5" />} value={contact.phone} />
                    <ContactRow icon={<Building2 className="w-3.5 h-3.5" />} value={contact.department} />
                    <ContactRow icon={<Globe className="w-3.5 h-3.5" />} value={contact.location} />
                  </div>
                )}
              </div>
            </section>

            {/* ── Next Action ─────────────────────────── */}
            <section>
              <h3 className="text-[11px] tracking-[0.1em] uppercase text-muted-foreground font-medium mb-3">
                Next Action
              </h3>
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{account.next}</p>
                  <p className="text-[11px] text-muted-foreground">Upcoming scheduled action</p>
                </div>
              </div>
            </section>

            {/* ── Related Items Summary ────────────────── */}
            {(relatedTickets.length > 0 || relatedOutreach.length > 0 || relatedInvoices.length > 0) && (
              <section>
                <h3 className="text-[11px] tracking-[0.1em] uppercase text-muted-foreground font-medium mb-3">
                  Related Items
                </h3>
                <div className="space-y-2">
                  {relatedTickets.map((t) => (
                    <div key={t.id} className="flex items-center gap-3 rounded-lg border border-border/40 bg-card/30 px-3 py-2.5">
                      <AlertTriangle className={cn("w-3.5 h-3.5 shrink-0", t.priority === "Critical" ? "text-rose-400" : "text-amber-400")} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{t.issue}</p>
                        <p className="text-[10px] text-muted-foreground">{t.id} · {t.priority}</p>
                      </div>
                      <span className={cn("text-[9px] px-1.5 py-px rounded font-medium shrink-0", statusColors[t.status])}>
                        {t.status}
                      </span>
                    </div>
                  ))}
                  {relatedOutreach.map((o, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-lg border border-border/40 bg-card/30 px-3 py-2.5">
                      <Send className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{o.type}</p>
                        <p className="text-[10px] text-muted-foreground">{o.step}</p>
                      </div>
                      <span className={cn("text-[9px] px-1.5 py-px rounded font-medium shrink-0", statusColors[o.status])}>
                        {o.status}
                      </span>
                    </div>
                  ))}
                  {relatedInvoices.map((inv) => (
                    <div key={inv.inv} className="flex items-center gap-3 rounded-lg border border-border/40 bg-card/30 px-3 py-2.5">
                      <Receipt className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{inv.inv} — {inv.amount}</p>
                        <p className="text-[10px] text-muted-foreground">Due {inv.due}</p>
                      </div>
                      <span className={cn("text-[9px] px-1.5 py-px rounded font-medium shrink-0", statusColors[inv.status])}>
                        {inv.status}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <Separator className="bg-border/40" />

            {/* ── Activity Timeline ───────────────────── */}
            <section>
              <h3 className="text-[11px] tracking-[0.1em] uppercase text-muted-foreground font-medium mb-4">
                Activity Timeline
              </h3>
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border/40" />

                <div className="space-y-0">
                  {timeline.map((event, i) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: i * 0.05 }}
                      className="relative flex gap-3 pb-5 last:pb-0 group/event"
                    >
                      {/* Icon node */}
                      <div className={cn(
                        "relative z-10 w-[31px] h-[31px] rounded-lg border flex items-center justify-center shrink-0 transition-colors",
                        activityColor[event.type]
                      )}>
                        {activityIcon[event.type]}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-xs font-semibold text-foreground group-hover/event:text-primary transition-colors">
                            {event.title}
                          </p>
                          <span className="text-[10px] text-muted-foreground/60 shrink-0 font-mono">
                            {event.date}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                          {event.description}
                        </p>
                        {event.time !== "—" && (
                          <span className="text-[10px] text-muted-foreground/50 flex items-center gap-1 mt-1">
                            <Clock className="w-3 h-3" /> {event.time}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

/* ── Sub-components ─────────────────────────────────────────── */
function MetricCard({ label, value, colorClass, icon }: { label: string; value: string; colorClass: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/50 bg-card/40 p-3 text-center space-y-1">
      <div className="flex items-center justify-center gap-1 text-muted-foreground">
        {icon}
        <span className="text-[10px] tracking-[0.05em] uppercase font-medium">{label}</span>
      </div>
      <p className={cn("text-lg font-bold font-mono", colorClass)}>{value}</p>
    </div>
  );
}

function ContactRow({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
      <span className="text-muted-foreground/60">{icon}</span>
      <span className="text-foreground/80">{value}</span>
    </div>
  );
}
