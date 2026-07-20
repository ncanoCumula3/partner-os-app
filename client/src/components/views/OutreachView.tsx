/*
 * OutreachView — email sequence tracking + drill-down detail panel
 * Warm adaptive theme
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { OUTREACH, ACCOUNTS, statusColors, healthColor } from "@/lib/data";
import type { OutreachItem } from "@/lib/data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Mail, Calendar, ChevronRight, User, Clock, Send, Eye,
  MousePointerClick, ArrowUpRight, Building2, Globe, CheckCircle2,
  Circle, BarChart3, FileText, Zap, Play, Pause, UserPlus, AlertTriangle,
} from "lucide-react";
import ActivityNotes from "@/components/ActivityNotes";

/* ── Extended outreach data ── */
interface OutreachDetail extends OutreachItem {
  subject: string;
  owner: string;
  created: string;
  goal: string;
  template: string;
  emailSteps: { step: number; subject: string; status: "Sent" | "Opened" | "Clicked" | "Scheduled" | "Draft"; sentDate?: string; openRate?: string; clickRate?: string }[];
  metrics: { sent: number; opened: number; clicked: number; replied: number };
  notes: string;
}

const OUTREACH_DETAILS: Record<string, OutreachDetail> = {
  "Driftwood Capital": {
    ...OUTREACH.find(o => o.account === "Driftwood Capital")!,
    subject: "Advanced Analytics — ROI & Next Steps",
    owner: "Jordan Davis", created: "Mar 25, 2026",
    goal: "Drive upsell conversion for Advanced Analytics module ($36K deal)",
    template: "Upsell Nurture — 5 Step",
    emailSteps: [
      { step: 1, subject: "Unlock deeper insights with Advanced Analytics", status: "Opened", sentDate: "Mar 26", openRate: "100%", clickRate: "50%" },
      { step: 2, subject: "How Driftwood can save 15hrs/week with custom reports", status: "Clicked", sentDate: "Mar 30", openRate: "100%", clickRate: "100%" },
      { step: 3, subject: "Your personalized ROI analysis is ready", status: "Opened", sentDate: "Apr 4", openRate: "100%", clickRate: "0%" },
      { step: 4, subject: "Quick question about your reporting needs", status: "Scheduled", sentDate: "Apr 12" },
      { step: 5, subject: "Final thoughts + exclusive pricing", status: "Draft" },
    ],
    metrics: { sent: 3, opened: 3, clicked: 2, replied: 1 },
    notes: "Tom Hargrove has been highly engaged — opened all 3 emails. The ROI analysis (Step 3) was opened but not clicked through. Consider a follow-up call before Step 4 sends.",
  },
  "Edgeline Foods": {
    ...OUTREACH.find(o => o.account === "Edgeline Foods")!,
    subject: "Let's Get Back on Track",
    owner: "Sarah Chen", created: "Apr 2, 2026",
    goal: "Re-engage at-risk account and prevent churn before renewal",
    template: "Re-engagement — 4 Step",
    emailSteps: [
      { step: 1, subject: "We noticed some changes — let's chat", status: "Opened", sentDate: "Apr 3", openRate: "100%", clickRate: "0%" },
      { step: 2, subject: "Your 30-day recovery plan from our team", status: "Opened", sentDate: "Apr 8", openRate: "100%", clickRate: "50%" },
      { step: 3, subject: "Quick wins to improve your experience", status: "Scheduled", sentDate: "Apr 11" },
      { step: 4, subject: "Executive check-in request", status: "Draft" },
    ],
    metrics: { sent: 2, opened: 2, clicked: 1, replied: 0 },
    notes: "Sofia opened both emails but hasn't replied. The recovery plan link was clicked once. Need to follow up with a phone call — email alone may not be enough for this at-risk account.",
  },
  "ClearPath Retail": {
    ...OUTREACH.find(o => o.account === "ClearPath Retail")!,
    subject: "Q2 Business Review Invitation",
    owner: "Jordan Davis", created: "Apr 8, 2026",
    goal: "Schedule and prepare for Q2 QBR with Priya Nair",
    template: "QBR Invite — 3 Step",
    emailSteps: [
      { step: 1, subject: "Your Q2 Business Review — let's schedule", status: "Scheduled", sentDate: "Apr 16" },
      { step: 2, subject: "QBR agenda preview + preparation items", status: "Draft" },
      { step: 3, subject: "Reminder: QBR this week", status: "Draft" },
    ],
    metrics: { sent: 0, opened: 0, clicked: 0, replied: 0 },
    notes: "Sequence scheduled to start Apr 16. Priya expressed interest in discussing email automation add-on during the QBR. Prepare demo materials in advance.",
  },
  "BlueWave Logistics": {
    ...OUTREACH.find(o => o.account === "BlueWave Logistics")!,
    subject: "Health Check Follow-up",
    owner: "Sarah Chen", created: "Apr 9, 2026",
    goal: "Address open issues and stabilize account health before renewal discussion",
    template: "Health Check — Custom",
    emailSteps: [
      { step: 1, subject: "Following up on your recent support experience", status: "Draft" },
      { step: 2, subject: "Action plan for resolving open items", status: "Draft" },
      { step: 3, subject: "Progress update on your account", status: "Draft" },
    ],
    metrics: { sent: 0, opened: 0, clicked: 0, replied: 0 },
    notes: "Draft sequence — waiting for T-1041 (multi-currency issue) to be resolved before sending. Marcus is frustrated; sending outreach before fixing the issue could backfire.",
  },
};

export default function OutreachView() {
  const [selected, setSelected] = useState<string | null>(null);
  const selectedDetail = selected ? OUTREACH_DETAILS[selected] : null;
  const [drillDownKpi, setDrillDownKpi] = useState<string | null>(null);
  const toggleDrill = (key: string) => setDrillDownKpi(prev => prev === key ? null : key);

  const activeSeqs = OUTREACH.filter(o => o.status === "Active");
  const scheduledSeqs = OUTREACH.filter(o => o.status === "Scheduled");
  const draftSeqs = OUTREACH.filter(o => o.status === "Draft");

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-xl font-bold text-foreground">Outreach</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Active email sequences, engagement tracking, and scheduling · Click any sequence for details
        </p>
      </motion.div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: "Active Sequences", value: String(activeSeqs.length), color: "text-emerald-700", key: "active" },
          { label: "Scheduled", value: String(scheduledSeqs.length), color: "text-blue-700", key: "scheduled" },
          { label: "Drafts", value: String(draftSeqs.length), color: "text-slate-600", key: "drafts" },
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

      {/* ── Outreach Drill-Down Panel ── */}
      <AnimatePresence mode="wait">
        {drillDownKpi && (
          <motion.div key={drillDownKpi} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
            <div className="rounded-xl border border-primary/20 bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  {drillDownKpi === "active" && <><Play className="w-4 h-4 text-emerald-600" /> Active Sequences — Details</>}
                  {drillDownKpi === "scheduled" && <><Calendar className="w-4 h-4 text-blue-600" /> Scheduled — Details</>}
                  {drillDownKpi === "drafts" && <><FileText className="w-4 h-4 text-slate-600" /> Drafts — Details</>}
                </h3>
                <button onClick={() => setDrillDownKpi(null)} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-muted transition-colors">Close</button>
              </div>

              {/* Active Sequences */}
              {drillDownKpi === "active" && (
                <div className="space-y-3">
                  {activeSeqs.length > 0 ? (
                    <div className="rounded-lg border border-border overflow-hidden"><table className="w-full text-xs"><thead><tr className="bg-muted/50"><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Account</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Type</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Step</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Next Date</th></tr></thead><tbody className="divide-y divide-border">{activeSeqs.map(o => (<tr key={o.account}><td className="px-3 py-2 font-medium text-foreground">{o.account}</td><td className="px-3 py-2 text-muted-foreground">{o.type}</td><td className="px-3 py-2 font-mono text-foreground">{o.step}</td><td className="px-3 py-2 text-muted-foreground">{o.nextDate}</td></tr>))}</tbody></table></div>
                  ) : <p className="text-xs text-muted-foreground">No active sequences.</p>}
                </div>
              )}

              {/* Scheduled */}
              {drillDownKpi === "scheduled" && (
                <div className="space-y-3">
                  {scheduledSeqs.length > 0 ? (
                    <div className="rounded-lg border border-border overflow-hidden"><table className="w-full text-xs"><thead><tr className="bg-muted/50"><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Account</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Type</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Step</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Next Date</th></tr></thead><tbody className="divide-y divide-border">{scheduledSeqs.map(o => (<tr key={o.account}><td className="px-3 py-2 font-medium text-foreground">{o.account}</td><td className="px-3 py-2 text-muted-foreground">{o.type}</td><td className="px-3 py-2 font-mono text-foreground">{o.step}</td><td className="px-3 py-2 text-muted-foreground">{o.nextDate}</td></tr>))}</tbody></table></div>
                  ) : <p className="text-xs text-muted-foreground">No scheduled sequences.</p>}
                </div>
              )}

              {/* Drafts */}
              {drillDownKpi === "drafts" && (
                <div className="space-y-3">
                  {draftSeqs.length > 0 ? (
                    <div className="rounded-lg border border-border overflow-hidden"><table className="w-full text-xs"><thead><tr className="bg-muted/50"><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Account</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Type</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Step</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Status</th></tr></thead><tbody className="divide-y divide-border">{draftSeqs.map(o => (<tr key={o.account}><td className="px-3 py-2 font-medium text-foreground">{o.account}</td><td className="px-3 py-2 text-muted-foreground">{o.type}</td><td className="px-3 py-2 font-mono text-foreground">{o.step}</td><td className="px-3 py-2"><span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-slate-100 text-slate-700">Draft</span></td></tr>))}</tbody></table></div>
                  ) : <p className="text-xs text-muted-foreground">No drafts.</p>}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Outreach cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {OUTREACH.map((o, i) => (
          <motion.div
            key={o.account}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.06 }}
            onClick={() => setSelected(o.account)}
            className="card-elevated rounded-xl border border-border bg-card p-5 hover:border-primary/30 transition-colors cursor-pointer group"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-[14px] font-semibold text-foreground">{o.account}</div>
                <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                  <Mail className="w-3 h-3" /> {o.type}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn("text-[10px] px-2 py-0.5 rounded-md font-medium", statusColors[o.status])}>
                  {o.status}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{o.step}</span>
              <span className="text-muted-foreground font-mono">Opens: {o.opens}</span>
            </div>
            {o.nextDate !== "—" && (
              <div className="mt-3 pt-3 border-t border-border flex items-center gap-1 text-[11px] text-muted-foreground">
                <Calendar className="w-3 h-3" /> Next: {o.nextDate}
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* ── Outreach Detail Panel ── */}
      <Sheet open={!!selectedDetail} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent side="right" className="!w-[500px] !max-w-[90vw] bg-background border-l border-border p-0 overflow-hidden">
          {selectedDetail && <OutreachDetail detail={selectedDetail} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ─── Outreach Detail Component ─── */
function OutreachDetail({ detail }: { detail: OutreachDetail }) {
  const account = ACCOUNTS.find(a => a.name === detail.account);

  const stepStatusIcon: Record<string, React.ReactNode> = {
    Sent: <Send className="w-3 h-3 text-blue-600" />,
    Opened: <Eye className="w-3 h-3 text-amber-600" />,
    Clicked: <MousePointerClick className="w-3 h-3 text-emerald-600" />,
    Scheduled: <Clock className="w-3 h-3 text-blue-500" />,
    Draft: <FileText className="w-3 h-3 text-slate-400" />,
  };

  const stepStatusColor: Record<string, string> = {
    Sent: "text-blue-700 bg-blue-50",
    Opened: "text-amber-700 bg-amber-50",
    Clicked: "text-emerald-700 bg-emerald-50",
    Scheduled: "text-blue-700 bg-blue-50",
    Draft: "text-slate-600 bg-slate-100",
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        {/* Header */}
        <SheetHeader className="p-0 space-y-3">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Send className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-lg text-foreground font-bold leading-tight">
                {detail.account}
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                <span className={cn("text-[10px] px-1.5 py-px rounded font-medium", statusColors[detail.status])}>{detail.status}</span>
                <span>·</span>
                <span>{detail.type}</span>
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Engagement Metrics */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Sent", value: detail.metrics.sent, icon: <Send className="w-3 h-3" /> },
            { label: "Opened", value: detail.metrics.opened, icon: <Eye className="w-3 h-3" /> },
            { label: "Clicked", value: detail.metrics.clicked, icon: <MousePointerClick className="w-3 h-3" /> },
            { label: "Replied", value: detail.metrics.replied, icon: <Mail className="w-3 h-3" /> },
          ].map(m => (
            <div key={m.label} className="rounded-xl border border-border bg-card p-3 text-center">
              <div className="text-muted-foreground mx-auto mb-1 flex justify-center">{m.icon}</div>
              <div className="text-sm font-bold font-mono text-foreground">{m.value}</div>
              <div className="text-[9px] text-muted-foreground uppercase">{m.label}</div>
            </div>
          ))}
        </div>

        <Separator className="bg-border/40" />

        {/* Sequence Details */}
        <section>
          <h3 className="text-[11px] tracking-[0.1em] uppercase text-muted-foreground font-medium mb-3">Sequence Details</h3>
          <div className="space-y-3">
            <DetailRow icon={<FileText className="w-3.5 h-3.5" />} label="Template" value={detail.template} />
            <DetailRow icon={<User className="w-3.5 h-3.5" />} label="Owner" value={detail.owner} />
            <DetailRow icon={<Calendar className="w-3.5 h-3.5" />} label="Created" value={detail.created} />
            {account && (
              <>
                <DetailRow icon={<Globe className="w-3.5 h-3.5" />} label="Platform" value={account.platform} />
                <DetailRow icon={<Zap className="w-3.5 h-3.5" />} label="Health" value={`${account.health}/100`} valueClass={healthColor(account.health)} />
              </>
            )}
          </div>
        </section>

        <Separator className="bg-border/40" />

        {/* Goal */}
        <section>
          <h3 className="text-[11px] tracking-[0.1em] uppercase text-muted-foreground font-medium mb-2">Sequence Goal</h3>
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-start gap-3">
              <ArrowUpRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-foreground leading-relaxed">{detail.goal}</p>
            </div>
          </div>
        </section>

        <Separator className="bg-border/40" />

        {/* Email Steps */}
        <section>
          <h3 className="text-[11px] tracking-[0.1em] uppercase text-muted-foreground font-medium mb-3">
            Email Steps ({detail.emailSteps.length})
          </h3>
          <div className="space-y-2">
            {detail.emailSteps.map((step) => (
              <div key={step.step} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center pt-0.5">
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold",
                      step.status === "Clicked" || step.status === "Opened" ? "bg-emerald-100 text-emerald-700" :
                      step.status === "Sent" ? "bg-blue-100 text-blue-700" :
                      "bg-muted text-muted-foreground"
                    )}>
                      {step.step}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs font-medium text-foreground truncate">{step.subject}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn("text-[9px] px-1.5 py-px rounded font-medium flex items-center gap-1", stepStatusColor[step.status])}>
                        {stepStatusIcon[step.status]} {step.status}
                      </span>
                      {step.sentDate && (
                        <span className="text-[10px] text-muted-foreground">{step.sentDate}</span>
                      )}
                      {step.openRate && (
                        <span className="text-[10px] text-muted-foreground">Open: {step.openRate}</span>
                      )}
                      {step.clickRate && (
                        <span className="text-[10px] text-muted-foreground">Click: {step.clickRate}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <Separator className="bg-border/40" />

        {/* Notes */}
        <section>
          <h3 className="text-[11px] tracking-[0.1em] uppercase text-muted-foreground font-medium mb-2">Notes</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">{detail.notes}</p>
        </section>

        {/* ── Inline Actions ── */}
        <Separator className="bg-border/40" />
        <section>
          <h3 className="text-[11px] tracking-[0.1em] uppercase text-muted-foreground font-medium mb-3">Quick Actions</h3>
          <div className="flex flex-wrap gap-2">
            {detail.status === "Draft" && (
              <button
                onClick={() => toast.success(`Sequence started`, { description: `${detail.account} outreach sequence is now active. First email will send shortly.` })}
                className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/50 text-emerald-700 transition-colors"
              >
                <Play className="w-3 h-3" /> Start Sequence
              </button>
            )}
            {detail.status === "Active" && (
              <button
                onClick={() => toast.info(`Sequence paused`, { description: `${detail.account} outreach sequence has been paused. No further emails will send.` })}
                className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-2 rounded-lg border border-amber-200 bg-amber-50/50 hover:bg-amber-100/50 text-amber-700 transition-colors"
              >
                <Pause className="w-3 h-3" /> Pause Sequence
              </button>
            )}
            <button
              onClick={() => toast.success(`Sequence reassigned`, { description: `${detail.account} sequence has been reassigned. The new owner will be notified.` })}
              className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted/50 text-foreground transition-colors"
            >
              <UserPlus className="w-3 h-3" /> Reassign
            </button>
            <button
              onClick={() => toast.warning(`Sequence escalated`, { description: `${detail.account} outreach has been escalated to management.` })}
              className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-2 rounded-lg border border-red-200 bg-red-50/50 hover:bg-red-100/50 text-red-700 transition-colors"
            >
              <AlertTriangle className="w-3 h-3" /> Escalate
            </button>
          </div>
        </section>

        {/* Rep Notes (interactive, linked to account) */}
        <ActivityNotes account={detail.account} section="outreach" itemRef={detail.account} />
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
