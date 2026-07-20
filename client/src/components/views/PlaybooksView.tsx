/*
 * PlaybooksView — playbook cards with AI builder CTA + drill-down detail panel
 * Warm adaptive theme
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { PLAYBOOKS } from "@/lib/data";
import type { Playbook } from "@/lib/data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  ClipboardList, TrendingUp, Shield, Rocket, Handshake, Zap,
  Sparkles, ChevronRight, Clock, Users, CheckCircle2, Circle,
  ArrowRight, BookOpen, Target, AlertTriangle, Star, Calendar, Play, UserPlus,
  CalendarClock,
} from "lucide-react";
import ActivityNotes from "@/components/ActivityNotes";

const iconMap: Record<string, React.ElementType> = {
  ClipboardList, TrendingUp, Shield, Rocket, Handshake, Zap, CalendarClock,
};

/* ── Extended playbook data ── */
interface PlaybookDetail extends Playbook {
  description: string;
  estimatedTime: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  lastUpdated: string;
  author: string;
  usageCount: number;
  successRate: string;
  stepDetails: { step: number; title: string; description: string; duration: string; tools?: string[] }[];
  tips: string[];
  relatedPlaybooks: string[];
}

const PLAYBOOK_DETAILS: Record<string, PlaybookDetail> = {
  "QBR Preparation Guide": {
    ...PLAYBOOKS.find(p => p.title === "QBR Preparation Guide")!,
    description: "A comprehensive guide for preparing and delivering Quarterly Business Reviews that drive value realization and expansion conversations. Covers data gathering, deck preparation, stakeholder alignment, and follow-up actions.",
    estimatedTime: "4-6 hours prep", difficulty: "Intermediate", lastUpdated: "Mar 2026", author: "Jordan Davis", usageCount: 23, successRate: "89%",
    stepDetails: [
      { step: 1, title: "Gather Account Data", description: "Pull health scores, CSAT trends, ticket history, and usage metrics for the past quarter. Compile into the QBR data template.", duration: "45 min", tools: ["Partner OS Dashboard", "Reporting Module"] },
      { step: 2, title: "Identify Key Themes", description: "Analyze the data to identify 3-5 key themes: wins to celebrate, challenges to address, and opportunities to explore.", duration: "30 min" },
      { step: 3, title: "Build the Deck", description: "Use the QBR template to create a presentation covering: executive summary, metrics review, success stories, challenges & action plan, and roadmap preview.", duration: "1-2 hours", tools: ["QBR Deck Template", "Slide Builder"] },
      { step: 4, title: "Internal Pre-Review", description: "Share the deck with your manager and any cross-functional stakeholders (support, product) for feedback. Incorporate changes.", duration: "30 min" },
      { step: 5, title: "Stakeholder Alignment", description: "Send a pre-read to the customer 3 days before the QBR. Include the agenda and any prep items they need to bring.", duration: "15 min" },
      { step: 6, title: "Deliver the QBR", description: "Run the meeting: start with wins, address challenges with solutions, present the roadmap, and end with clear next steps and owners.", duration: "60 min" },
      { step: 7, title: "Follow-Up Actions", description: "Send meeting notes within 24 hours. Create tickets for any action items. Schedule the next QBR. Update the account plan.", duration: "30 min", tools: ["Partner OS", "Email"] },
    ],
    tips: [
      "Always lead with value delivered — customers want to see ROI before hearing about problems",
      "Prepare 2-3 expansion talking points even if the customer hasn't asked — plant seeds early",
      "Record the QBR (with permission) so absent stakeholders can review",
      "Use the customer's own language and KPIs, not your internal metrics",
    ],
    relatedPlaybooks: ["Upsell Discovery Framework", "Executive Sponsor Outreach"],
  },
  "Upsell Discovery Framework": {
    ...PLAYBOOKS.find(p => p.title === "Upsell Discovery Framework")!,
    description: "A structured approach to identifying and qualifying upsell opportunities within existing accounts. Focuses on understanding customer pain points, mapping them to product capabilities, and building a compelling business case.",
    estimatedTime: "2-3 hours", difficulty: "Advanced", lastUpdated: "Feb 2026", author: "Sarah Chen", usageCount: 18, successRate: "72%",
    stepDetails: [
      { step: 1, title: "Account Health Assessment", description: "Verify the account is in good standing (health > 75, no critical tickets). Upselling to unhappy customers backfires.", duration: "15 min", tools: ["Partner OS Dashboard"] },
      { step: 2, title: "Usage & Adoption Analysis", description: "Review feature adoption data. Identify which modules are heavily used (expansion candidates) and which are underutilized (training opportunities).", duration: "30 min", tools: ["Platform Analytics"] },
      { step: 3, title: "Discovery Conversation", description: "Schedule a 30-min call focused on the customer's upcoming priorities. Use open-ended questions: 'What's your biggest challenge for next quarter?'", duration: "30 min" },
      { step: 4, title: "Solution Mapping", description: "Map the customer's stated needs to specific product capabilities. Build a one-page value proposition showing expected ROI.", duration: "45 min", tools: ["ROI Calculator", "Product Catalog"] },
      { step: 5, title: "Proposal & Close", description: "Present the proposal with clear pricing, implementation timeline, and expected outcomes. Address objections with case studies from similar accounts.", duration: "30 min" },
    ],
    tips: [
      "Never pitch during a support call — separate the conversations",
      "Use peer references: 'Company X in your industry saw 30% improvement with this module'",
      "Quantify everything — executives buy ROI, not features",
    ],
    relatedPlaybooks: ["QBR Preparation Guide", "Executive Sponsor Outreach"],
  },
  "At-Risk Account Recovery": {
    ...PLAYBOOKS.find(p => p.title === "At-Risk Account Recovery")!,
    description: "A 30-day recovery framework for accounts showing signs of churn risk. Covers rapid assessment, executive engagement, issue resolution, and trust rebuilding through consistent delivery.",
    estimatedTime: "Ongoing (30 days)", difficulty: "Advanced", lastUpdated: "Apr 2026", author: "Jordan Davis", usageCount: 12, successRate: "67%",
    stepDetails: [
      { step: 1, title: "Immediate Assessment", description: "Within 24 hours: review all open tickets, recent CSAT scores, usage trends, and communication history. Identify the root cause of dissatisfaction.", duration: "1 hour", tools: ["Partner OS Dashboard", "Support Queue"] },
      { step: 2, title: "Internal War Room", description: "Assemble cross-functional team (CSM, Support Lead, Product). Share assessment and agree on a recovery plan with clear owners and deadlines.", duration: "30 min" },
      { step: 3, title: "Executive Outreach", description: "Have your manager or VP reach out to the customer's executive sponsor. Acknowledge the issues and commit to a recovery timeline.", duration: "30 min" },
      { step: 4, title: "Quick Wins (Week 1)", description: "Resolve the most visible issues first. Close any critical tickets. Send daily progress updates to the customer.", duration: "Varies" },
      { step: 5, title: "Recovery Plan Delivery", description: "Share a formal 30-day recovery plan with the customer. Include: issues identified, actions taken, remaining items, and success metrics.", duration: "1 hour" },
      { step: 6, title: "Weekly Check-ins", description: "Schedule weekly 15-min calls for the next 4 weeks. Review progress against the recovery plan. Adjust as needed.", duration: "15 min/week" },
      { step: 7, title: "Proactive Monitoring", description: "Set up enhanced monitoring: daily health score checks, ticket SLA alerts, and usage anomaly detection.", duration: "30 min", tools: ["Partner OS Alerts", "SLA Config"] },
      { step: 8, title: "Trust Rebuilding", description: "After issues are resolved, deliver a 'value add' — a free training session, custom report, or product roadmap preview.", duration: "1-2 hours" },
      { step: 9, title: "Recovery Review", description: "At day 30, conduct a formal review. Compare metrics before/after. If health is above 70, transition back to normal cadence. If not, extend the recovery period.", duration: "30 min" },
    ],
    tips: [
      "Speed matters more than perfection — respond within hours, not days",
      "Over-communicate during recovery: silence is interpreted as indifference",
      "Document everything — if the account churns, you need a clear record of recovery efforts",
      "Celebrate small wins with the customer to rebuild positive momentum",
    ],
    relatedPlaybooks: ["CSAT Drop Response Protocol"],
  },
  "NetSuite Go-Live Checklist": {
    ...PLAYBOOKS.find(p => p.title === "NetSuite Go-Live Checklist")!,
    description: "A comprehensive 14-step checklist for ensuring a smooth NetSuite go-live. Covers pre-launch validation, data migration verification, user training, and post-launch monitoring.",
    estimatedTime: "2-3 weeks", difficulty: "Advanced", lastUpdated: "Jan 2026", author: "Sarah Chen", usageCount: 8, successRate: "94%",
    stepDetails: [
      { step: 1, title: "Environment Validation", description: "Verify sandbox configuration matches production requirements. Run full regression test suite.", duration: "2 hours", tools: ["NetSuite Sandbox"] },
      { step: 2, title: "Data Migration Dry Run", description: "Execute a complete data migration in sandbox. Verify record counts, field mappings, and data integrity.", duration: "4 hours" },
      { step: 3, title: "Integration Testing", description: "Test all third-party integrations end-to-end. Verify API connections, data flow, and error handling.", duration: "3 hours" },
      { step: 4, title: "User Acceptance Testing", description: "Have 3-5 key users run through their daily workflows. Document any issues or gaps.", duration: "1 day" },
      { step: 5, title: "Security & Permissions Audit", description: "Review all role definitions, permissions, and access controls. Ensure SOX compliance requirements are met.", duration: "2 hours" },
      { step: 6, title: "Performance Baseline", description: "Run performance benchmarks: page load times, saved search execution, and report generation speeds.", duration: "1 hour" },
      { step: 7, title: "Backup & Rollback Plan", description: "Document the rollback procedure. Take a full backup of the current system. Verify backup restoration works.", duration: "1 hour" },
      { step: 8, title: "Communication Plan", description: "Send go-live announcement to all stakeholders. Include: timeline, expected downtime, support contacts, and known limitations.", duration: "30 min" },
      { step: 9, title: "Training Completion", description: "Verify all end users have completed required training modules. Address any outstanding questions.", duration: "2 hours" },
      { step: 10, title: "Go-Live Execution", description: "Execute the migration plan. Deploy configurations. Activate integrations. Monitor for errors.", duration: "4-6 hours" },
      { step: 11, title: "Smoke Testing", description: "Immediately after go-live: run critical path tests (create order, process payment, generate invoice).", duration: "1 hour" },
      { step: 12, title: "User Verification", description: "Have key users verify their workflows in production. Collect feedback and address blockers immediately.", duration: "2 hours" },
      { step: 13, title: "Hypercare Period (Week 1)", description: "Provide dedicated support for the first week. Daily stand-ups with the customer. Priority SLA for all issues.", duration: "1 week" },
      { step: 14, title: "Post-Launch Review", description: "At day 14: conduct a formal review. Document lessons learned. Transition to standard support cadence.", duration: "1 hour" },
    ],
    tips: [
      "Never go live on a Friday — always schedule for Monday or Tuesday",
      "Have a dedicated Slack/Teams channel for real-time go-live communication",
      "Keep the rollback plan simple and tested — you may need it under pressure",
      "Celebrate the go-live with the customer team — it's a shared achievement",
    ],
    relatedPlaybooks: ["At-Risk Account Recovery"],
  },
  "Executive Sponsor Outreach": {
    ...PLAYBOOKS.find(p => p.title === "Executive Sponsor Outreach")!,
    description: "A framework for building and maintaining executive-level relationships within customer organizations. Focuses on strategic alignment, value communication, and long-term partnership development.",
    estimatedTime: "1-2 hours", difficulty: "Intermediate", lastUpdated: "Mar 2026", author: "Jordan Davis", usageCount: 31, successRate: "85%",
    stepDetails: [
      { step: 1, title: "Research & Preparation", description: "Research the executive's background, priorities, and recent company news. Prepare a one-page brief on the partnership's strategic value.", duration: "30 min", tools: ["LinkedIn", "Company Website"] },
      { step: 2, title: "Warm Introduction", description: "Get introduced through your day-to-day contact. Frame the meeting as a strategic alignment discussion, not a sales call.", duration: "15 min" },
      { step: 3, title: "Executive Meeting", description: "Focus on business outcomes, not product features. Share industry insights and benchmark data. Listen more than you talk.", duration: "30 min" },
      { step: 4, title: "Follow-Up & Cadence", description: "Send a personalized follow-up within 24 hours. Establish a quarterly touch-point cadence. Share relevant industry content monthly.", duration: "15 min" },
    ],
    tips: [
      "Executives care about outcomes, not features — always lead with business impact",
      "Bring insights they can't get elsewhere — industry benchmarks, peer comparisons",
      "Respect their time — keep meetings to 30 minutes unless they extend",
    ],
    relatedPlaybooks: ["QBR Preparation Guide", "Upsell Discovery Framework"],
  },
  "CSAT Drop Response Protocol": {
    ...PLAYBOOKS.find(p => p.title === "CSAT Drop Response Protocol")!,
    description: "A rapid response protocol for when a customer's CSAT score drops by 2+ points or falls below 3/5. Focuses on immediate acknowledgment, root cause analysis, and targeted recovery actions.",
    estimatedTime: "2-4 hours initial", difficulty: "Intermediate", lastUpdated: "Apr 2026", author: "Sarah Chen", usageCount: 15, successRate: "78%",
    stepDetails: [
      { step: 1, title: "Alert Triage", description: "Within 1 hour of the CSAT drop: review the survey response, check for open tickets, and assess the severity of the situation.", duration: "15 min", tools: ["Partner OS Notifications", "CSAT Dashboard"] },
      { step: 2, title: "Personal Outreach", description: "Call or email the respondent directly. Acknowledge the feedback, express concern, and ask for more context. Don't be defensive.", duration: "15 min" },
      { step: 3, title: "Root Cause Analysis", description: "Map the feedback to specific issues: support delays, product bugs, communication gaps, or unmet expectations. Identify the primary driver.", duration: "30 min" },
      { step: 4, title: "Action Plan", description: "Create a targeted action plan addressing the root cause. Include specific actions, owners, and deadlines. Share with the customer within 48 hours.", duration: "1 hour" },
      { step: 5, title: "Execute & Monitor", description: "Execute the action plan. Check in with the customer weekly until the next CSAT survey. Aim for a 1+ point improvement.", duration: "Ongoing" },
      { step: 6, title: "Follow-Up Survey", description: "Send a follow-up micro-survey 2 weeks after action plan execution. Use the results to validate recovery or adjust approach.", duration: "15 min" },
    ],
    tips: [
      "A CSAT drop is a gift — it's a customer telling you they still care enough to give feedback",
      "Never argue with a CSAT score — validate the feeling, then fix the problem",
      "Track CSAT recovery rates as a team KPI — it shows resilience",
    ],
    relatedPlaybooks: ["At-Risk Account Recovery"],
  },
  "SaaS Renewal Playbook": {
    ...PLAYBOOKS.find(p => p.title === "SaaS Renewal Playbook")!,
    description: "A comprehensive 10-step renewal framework designed to begin 6 months before License End Date (LED). Covers stakeholder mapping, value realization, downsell prevention, and contract execution for SaaS customers.",
    estimatedTime: "6 months (ongoing)", difficulty: "Advanced", lastUpdated: "Apr 2026", author: "Jordan Davis", usageCount: 8, successRate: "91%",
    stepDetails: [
      { step: 1, title: "LED Alert & Account Review", description: "At 6 months before LED: Review account health score, CSAT history, open tickets, and usage metrics. Identify any red flags or downsell risks early.", duration: "1 hour", tools: ["Partner OS Renewal Tracker", "Account Dashboard"] },
      { step: 2, title: "Stakeholder Mapping", description: "Identify all decision-makers, budget holders, and influencers involved in the renewal. Map the org chart and note any personnel changes since last renewal.", duration: "2 hours", tools: ["CRM", "LinkedIn"] },
      { step: 3, title: "Usage & Value Analysis", description: "Pull usage data for all licensed modules. Calculate ROI metrics, identify underutilized modules (downsell risk), and document value delivered over the contract term.", duration: "3 hours", tools: ["Platform Analytics", "Partner OS Reporting"] },
      { step: 4, title: "Executive Sponsor Check-in", description: "Schedule a call with the executive sponsor. Discuss strategic priorities, upcoming initiatives, and any concerns. This is a relationship touchpoint, not a sales pitch.", duration: "30 min" },
      { step: 5, title: "Value Realization Presentation", description: "Present a formal value review to stakeholders showing ROI, usage trends, resolved issues, and strategic alignment. Use this to build the case for renewal.", duration: "1 hour" },
      { step: 6, title: "Downsell Prevention", description: "If downsell risk is identified: prepare a targeted retention plan. Show the cost of switching, demonstrate module interdependencies, and offer optimization support for underused features.", duration: "2 hours" },
      { step: 7, title: "Renewal Proposal", description: "Prepare and present the renewal proposal. Include pricing, any changes to modules/seats, and value-adds. Address all concerns raised in earlier steps.", duration: "2 hours" },
      { step: 8, title: "Negotiation & Alignment", description: "Work through any objections on pricing, scope, or terms. Involve your leadership if needed. Aim for mutual agreement at least 60 days before LED.", duration: "Varies" },
      { step: 9, title: "Contract Execution", description: "Finalize legal review, obtain signatures, and process the renewal. Ensure all systems are updated with new contract terms, dates, and pricing.", duration: "1-2 weeks" },
      { step: 10, title: "Post-Renewal Kickoff", description: "Schedule a post-renewal kickoff to align on the next contract period's goals, success metrics, and any new modules or services. Set the stage for the next renewal cycle.", duration: "1 hour" },
    ],
    tips: [
      "Start at 6 months — never wait until 90 days before LED to begin the renewal conversation",
      "A downsell is better than a churn — if the customer needs to reduce, help them do it gracefully while preserving the relationship",
      "Track renewal progress in Partner OS Renewal Tracker — visibility prevents surprises",
      "Always connect the renewal to business outcomes, not just product features",
      "If health score is below 70, activate the At-Risk Account Recovery playbook in parallel",
    ],
    relatedPlaybooks: ["At-Risk Account Recovery", "Executive Sponsor Outreach", "Upsell Discovery Framework"],
  },
};

export default function PlaybooksView() {
  const [selected, setSelected] = useState<PlaybookDetail | null>(null);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-xl font-bold text-foreground">Playbooks & Best Practices</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Proven frameworks for every consulting scenario — click any playbook for the full guide
        </p>
      </motion.div>

      {/* Playbook grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {PLAYBOOKS.map((p, i) => {
          const Icon = iconMap[p.icon] || ClipboardList;
          const detail = PLAYBOOK_DETAILS[p.title];
          return (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.06 }}
              className="card-elevated rounded-xl border border-border bg-card p-5 hover:border-primary/30 transition-all cursor-pointer group"
              onClick={() => detail && setSelected(detail)}
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mb-3 group-hover:bg-primary/10 transition-colors">
                  <Icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-[14px] font-semibold text-foreground group-hover:text-foreground transition-colors">
                {p.title}
              </div>
              <div className="flex gap-2 mt-3">
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-primary/10 text-primary font-medium">
                  {p.platform}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-medium">
                  {p.category}
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground mt-3 font-mono">{p.steps} steps</div>
            </motion.div>
          );
        })}
      </div>

      {/* AI Builder CTA */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-xl border border-dashed border-primary/30 bg-gradient-to-r from-primary/10 to-primary/5 p-6 flex items-center justify-between"
      >
        <div>
          <div className="text-[14px] text-foreground font-semibold">AI-Powered Playbook Builder</div>
          <div className="text-xs text-muted-foreground mt-1">
            Describe a scenario and let the AI generate a custom playbook for your team
          </div>
        </div>
        <button
          onClick={() => toast.info("AI Playbook Builder coming soon")}
          className="shrink-0 bg-gradient-to-r from-primary to-primary/70 text-foreground text-xs font-semibold px-5 py-2.5 rounded-lg flex items-center gap-2 hover:opacity-90 transition-opacity"
        >
          <Sparkles className="w-3.5 h-3.5" />
          GENERATE
        </button>
      </motion.div>

      {/* ── Playbook Detail Panel ── */}
      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent side="right" className="!w-[520px] !max-w-[90vw] bg-background border-l border-border p-0 overflow-hidden">
          {selected && <PlaybookDetailView playbook={selected} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ─── Playbook Detail Component ─── */
function PlaybookDetailView({ playbook }: { playbook: PlaybookDetail }) {
  const Icon = iconMap[playbook.icon] || ClipboardList;

  const difficultyColor: Record<string, string> = {
    Beginner: "text-emerald-700 bg-emerald-50",
    Intermediate: "text-amber-700 bg-amber-50",
    Advanced: "text-red-700 bg-red-50",
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        {/* Header */}
        <SheetHeader className="p-0 space-y-3">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Icon className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-lg text-foreground font-bold leading-tight">
                {playbook.title}
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                <span className="text-[10px] px-1.5 py-px rounded bg-primary/10 text-primary font-medium">{playbook.platform}</span>
                <span className="text-[10px] px-1.5 py-px rounded bg-muted text-muted-foreground font-medium">{playbook.category}</span>
                <span className={cn("text-[10px] px-1.5 py-px rounded font-medium", difficultyColor[playbook.difficulty])}>{playbook.difficulty}</span>
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Description */}
        <p className="text-xs text-muted-foreground leading-relaxed">{playbook.description}</p>

        {/* Key Metrics */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Steps", value: String(playbook.steps), icon: <ClipboardList className="w-3 h-3" /> },
            { label: "Time", value: playbook.estimatedTime.split(" ")[0], icon: <Clock className="w-3 h-3" /> },
            { label: "Used", value: `${playbook.usageCount}x`, icon: <Users className="w-3 h-3" /> },
            { label: "Success", value: playbook.successRate, icon: <Target className="w-3 h-3" /> },
          ].map(m => (
            <div key={m.label} className="rounded-xl border border-border bg-card p-3 text-center">
              <div className="text-muted-foreground mx-auto mb-1 flex justify-center">{m.icon}</div>
              <div className="text-sm font-bold font-mono text-foreground">{m.value}</div>
              <div className="text-[9px] text-muted-foreground uppercase">{m.label}</div>
            </div>
          ))}
        </div>

        <Separator className="bg-border/40" />

        {/* Details */}
        <section>
          <h3 className="text-[11px] tracking-[0.1em] uppercase text-muted-foreground font-medium mb-3">Details</h3>
          <div className="space-y-3">
            <DetailRow icon={<Users className="w-3.5 h-3.5" />} label="Author" value={playbook.author} />
            <DetailRow icon={<Calendar className="w-3.5 h-3.5" />} label="Last Updated" value={playbook.lastUpdated} />
            <DetailRow icon={<Clock className="w-3.5 h-3.5" />} label="Est. Time" value={playbook.estimatedTime} />
          </div>
        </section>

        <Separator className="bg-border/40" />

        {/* Step-by-Step Guide */}
        <section>
          <h3 className="text-[11px] tracking-[0.1em] uppercase text-muted-foreground font-medium mb-3">
            Step-by-Step Guide ({playbook.stepDetails.length} steps)
          </h3>
          <div className="space-y-3">
            {playbook.stepDetails.map((step, i) => (
              <div key={step.step} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[11px] font-bold text-primary shrink-0">
                    {step.step}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs font-semibold text-foreground">{step.title}</p>
                      <span className="text-[9px] text-muted-foreground font-mono ml-auto shrink-0">{step.duration}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{step.description}</p>
                    {step.tools && step.tools.length > 0 && (
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {step.tools.map(tool => (
                          <span key={tool} className="text-[9px] px-1.5 py-px rounded bg-muted text-muted-foreground font-medium">{tool}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <Separator className="bg-border/40" />

        {/* Pro Tips */}
        <section>
          <h3 className="text-[11px] tracking-[0.1em] uppercase text-muted-foreground font-medium mb-3">
            <span className="flex items-center gap-1.5"><Star className="w-3 h-3 text-amber-500" /> Pro Tips</span>
          </h3>
          <div className="space-y-2">
            {playbook.tips.map((tip, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/30 p-3">
                <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-foreground leading-relaxed">{tip}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Related Playbooks */}
        {playbook.relatedPlaybooks.length > 0 && (
          <>
            <Separator className="bg-border/40" />
            <section>
              <h3 className="text-[11px] tracking-[0.1em] uppercase text-muted-foreground font-medium mb-3">Related Playbooks</h3>
              <div className="space-y-2">
                {playbook.relatedPlaybooks.map(title => {
                  const rp = PLAYBOOKS.find(p => p.title === title);
                  if (!rp) return null;
                  const RPIcon = iconMap[rp.icon] || ClipboardList;
                  return (
                    <div key={title} className="flex items-center gap-3 rounded-lg border border-border p-3">
                      <RPIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground">{rp.title}</p>
                        <p className="text-[10px] text-muted-foreground">{rp.platform} · {rp.steps} steps</p>
                      </div>
                      <ArrowRight className="w-3 h-3 text-muted-foreground" />
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}

        {/* ── Inline Actions ── */}
        <Separator className="bg-border/40" />
        <section>
          <h3 className="text-[11px] tracking-[0.1em] uppercase text-muted-foreground font-medium mb-3">Quick Actions</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => toast.success(`Playbook started`, { description: `"${playbook.title}" has been activated. Track your progress in the step guide above.` })}
              className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/50 text-emerald-700 transition-colors"
            >
              <Play className="w-3 h-3" /> Start Playbook
            </button>
            <button
              onClick={() => toast.success(`Playbook completed`, { description: `"${playbook.title}" has been marked as completed. Great work!` })}
              className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/50 text-emerald-700 transition-colors"
            >
              <CheckCircle2 className="w-3 h-3" /> Completed
            </button>
            <button
              onClick={() => toast.success(`Playbook assigned`, { description: `"${playbook.title}" has been assigned to a team member.` })}
              className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted/50 text-foreground transition-colors"
            >
              <UserPlus className="w-3 h-3" /> Assign to Rep
            </button>
          </div>
        </section>

        {/* Rep Notes (interactive, linked to playbook) */}
        <ActivityNotes account="All" section="playbooks" itemRef={playbook.title} />
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
