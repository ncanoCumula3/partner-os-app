/*
 * AIAssistantView — Role-based AI tools hub
 * Roles: Support Rep, Sales Rep, Account Manager, Manager/Director
 * Tools: Script Generator, Outreach Composer, Support Assistant, Pipeline Analyst, Universal AI
 * Warm adaptive theme
 */
import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { ACCOUNTS, TICKETS, OUTREACH, INVOICES } from "@/lib/data";
import {
  Bot, Sparkles, Phone, Mail, LifeBuoy, TrendingUp, MessageSquare,
  ChevronRight, ArrowLeft, Send, Copy, Check, RefreshCw,
  User, Shield, Briefcase, BarChart3, Zap, FileText, Target,
  AlertTriangle, CheckCircle2, Circle, Clock, Building2, Loader2,
} from "lucide-react";

/* ── Role definitions ───────────────────────────────────────── */
interface Role {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
}

const ROLES: Role[] = [
  { id: "support", label: "Support Rep", description: "Ticket resolution, troubleshooting, customer communication", icon: LifeBuoy, color: "text-sky-700", bgColor: "bg-sky-50", borderColor: "border-sky-200" },
  { id: "sales", label: "Sales Rep", description: "Outreach, prospecting, deal closing, upsell conversations", icon: Target, color: "text-emerald-700", bgColor: "bg-emerald-600/10", borderColor: "border-emerald-200" },
  { id: "am", label: "Account Manager", description: "Relationship management, QBRs, renewals, health monitoring", icon: Briefcase, color: "text-violet-700", bgColor: "bg-violet-50", borderColor: "border-violet-200" },
  { id: "manager", label: "Manager / Director", description: "Pipeline analysis, team performance, strategic planning", icon: BarChart3, color: "text-amber-600", bgColor: "bg-amber-500/10", borderColor: "border-amber-200" },
];

/* ── Tool definitions per role ──────────────────────────────── */
interface Tool {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  roles: string[]; // which roles see this tool
}

const TOOLS: Tool[] = [
  { id: "script", label: "Call Script Generator", description: "Generate tailored call scripts for any scenario — discovery, escalation, QBR, upsell, check-in", icon: Phone, color: "text-sky-700", bgColor: "bg-sky-50", roles: ["support", "sales", "am", "manager"] },
  { id: "email", label: "Email Composer", description: "Draft professional outreach emails with personalized context and follow-up sequences", icon: Mail, color: "text-blue-700", bgColor: "bg-blue-600/10", roles: ["support", "sales", "am", "manager"] },
  { id: "support-assist", label: "Support Assistant", description: "Get troubleshooting steps, escalation templates, and resolution recommendations", icon: LifeBuoy, color: "text-red-600", bgColor: "bg-red-500/10", roles: ["support", "am"] },
  { id: "sales-assist", label: "Sales Playbook AI", description: "Objection handling, competitive positioning, ROI calculators, and closing strategies", icon: Target, color: "text-emerald-700", bgColor: "bg-emerald-600/10", roles: ["sales", "am"] },
  { id: "pipeline", label: "Pipeline Analyst", description: "AI-powered pipeline insights, forecasting, risk assessment, and strategic recommendations", icon: TrendingUp, color: "text-amber-600", bgColor: "bg-amber-500/10", roles: ["manager", "am", "sales"] },
  { id: "universal", label: "Universal AI Assistant", description: "Ask anything — get role-aware answers about accounts, processes, best practices, and strategy", icon: Sparkles, color: "text-primary", bgColor: "bg-primary/10", roles: ["support", "sales", "am", "manager"] },
];

/* ── Scenario presets per tool ──────────────────────────────── */
interface Scenario {
  label: string;
  prompt: string;
}

const SCENARIOS: Record<string, Record<string, Scenario[]>> = {
  script: {
    support: [
      { label: "Escalation Call", prompt: "Generate a call script for escalating a critical ticket with a frustrated customer" },
      { label: "Resolution Follow-up", prompt: "Create a follow-up call script after resolving a high-priority support ticket" },
      { label: "Bug Triage Call", prompt: "Draft a call script for triaging a newly reported bug with the customer" },
    ],
    sales: [
      { label: "Discovery Call", prompt: "Generate a discovery call script for a new prospect evaluating our platform" },
      { label: "Upsell Pitch", prompt: "Create a call script for pitching an upsell to an existing customer" },
      { label: "Competitive Win-Back", prompt: "Draft a call script for winning back a customer who switched to a competitor" },
    ],
    am: [
      { label: "QBR Call", prompt: "Generate a QBR call script covering metrics review, goals, and expansion opportunities" },
      { label: "Health Check", prompt: "Create a health check call script for an at-risk account" },
      { label: "Renewal Discussion", prompt: "Draft a renewal discussion call script with value reinforcement" },
    ],
    manager: [
      { label: "Team 1:1", prompt: "Generate a 1:1 call script for reviewing a rep's pipeline and coaching opportunities" },
      { label: "Executive Briefing", prompt: "Create an executive briefing call script for presenting quarterly results" },
      { label: "Escalation Review", prompt: "Draft a call script for reviewing escalated accounts with the team" },
    ],
  },
  email: {
    support: [
      { label: "Ticket Update", prompt: "Draft a professional email updating the customer on their support ticket progress" },
      { label: "Resolution Summary", prompt: "Write an email summarizing the resolution of a complex support issue" },
      { label: "SLA Breach Apology", prompt: "Compose an apology email for an SLA breach with a remediation plan" },
    ],
    sales: [
      { label: "Cold Outreach", prompt: "Write a compelling cold outreach email to a VP of Operations at a mid-market company" },
      { label: "Proposal Follow-up", prompt: "Draft a follow-up email after sending a pricing proposal" },
      { label: "Case Study Share", prompt: "Create an email sharing a relevant case study with a prospect" },
    ],
    am: [
      { label: "QBR Invite", prompt: "Write a QBR invitation email with agenda preview and value highlights" },
      { label: "Check-in Email", prompt: "Draft a monthly check-in email with usage insights and recommendations" },
      { label: "Expansion Proposal", prompt: "Compose an email proposing additional modules with ROI justification" },
    ],
    manager: [
      { label: "Team Update", prompt: "Write a weekly team update email summarizing pipeline and key wins" },
      { label: "Stakeholder Report", prompt: "Draft an email report for stakeholders on portfolio health and revenue trends" },
      { label: "Process Change", prompt: "Compose an email announcing a new process or workflow change to the team" },
    ],
  },
  "support-assist": {
    support: [
      { label: "Troubleshoot Error", prompt: "Help me troubleshoot a revenue recognition module error on multi-currency invoices in NetSuite" },
      { label: "Escalation Template", prompt: "Generate an escalation template for a critical issue affecting a Gold-tier account" },
      { label: "Knowledge Base Draft", prompt: "Help me draft a knowledge base article for a common HubSpot email sequence issue" },
    ],
    am: [
      { label: "Ticket Summary", prompt: "Summarize all open tickets for my at-risk accounts and recommend prioritization" },
      { label: "Customer Talking Points", prompt: "Generate talking points for discussing ongoing support issues with a frustrated customer" },
    ],
  },
  "sales-assist": {
    sales: [
      { label: "Objection Handling", prompt: "Help me handle the objection: 'Your pricing is too high compared to competitors'" },
      { label: "ROI Calculator", prompt: "Build an ROI argument for a prospect currently using spreadsheets for pipeline management" },
      { label: "Competitive Analysis", prompt: "Give me competitive positioning against Salesforce for a mid-market logistics company" },
    ],
    am: [
      { label: "Upsell Strategy", prompt: "Recommend an upsell strategy for a Gold-tier account with 95 health score and $120K ARR" },
      { label: "Renewal Risk Assessment", prompt: "Assess renewal risk for accounts with declining health scores and generate mitigation plan" },
    ],
  },
  pipeline: {
    manager: [
      { label: "Pipeline Forecast", prompt: "Analyze the current pipeline and provide a revenue forecast for next quarter" },
      { label: "Risk Assessment", prompt: "Identify the top 3 at-risk deals in the pipeline and recommend intervention strategies" },
      { label: "Team Performance", prompt: "Analyze team performance metrics and identify coaching opportunities" },
    ],
    am: [
      { label: "Account Portfolio", prompt: "Analyze my account portfolio health and recommend focus areas" },
      { label: "Expansion Opportunities", prompt: "Identify the best expansion opportunities across my accounts based on health and usage" },
    ],
    sales: [
      { label: "Deal Prioritization", prompt: "Help me prioritize my open deals based on likelihood to close and revenue impact" },
      { label: "Stage Analysis", prompt: "Analyze my deals by stage and identify bottlenecks in the pipeline" },
    ],
  },
  universal: {
    support: [
      { label: "Best Practices", prompt: "What are the best practices for handling a critical escalation with a Gold-tier account?" },
      { label: "Process Question", prompt: "What's our SLA policy for Critical vs High priority tickets?" },
    ],
    sales: [
      { label: "Market Insight", prompt: "What are the key trends in the logistics SaaS market I should know for my next discovery call?" },
      { label: "Strategy Help", prompt: "Help me build a multi-touch outreach strategy for a new enterprise prospect" },
    ],
    am: [
      { label: "Account Strategy", prompt: "Help me build a 90-day success plan for an at-risk account with declining health" },
      { label: "QBR Prep", prompt: "Help me prepare for a QBR with Apex Manufacturing — what metrics and talking points should I cover?" },
    ],
    manager: [
      { label: "Strategic Planning", prompt: "Help me build a quarterly strategic plan for improving portfolio health across the team" },
      { label: "Process Optimization", prompt: "Recommend process improvements for reducing average ticket resolution time" },
    ],
  },
};

/* ── Simulated AI responses ─────────────────────────────────── */
const AI_RESPONSES: Record<string, Record<string, string[]>> = {
  script: {
    support: [
      `## Escalation Call Script — Support Rep\n\n**Opening (30 sec)**\n> "Hi [Customer Name], this is [Your Name] from Partner OS Support. Thank you for taking the time to speak with me today. I understand you've been experiencing [issue] and I want to assure you that resolving this is my top priority."\n\n**Acknowledge & Empathize (1 min)**\n> "I've reviewed ticket [#] and I completely understand your frustration. Downtime on [module] directly impacts your team's ability to [business impact]. That's unacceptable, and I take full responsibility for getting this resolved."\n\n**Status Update (2 min)**\n- Share what's been done so far\n- Explain the root cause (if known)\n- If unknown: "Our engineering team has been investigating and we've narrowed it down to [area]"\n\n**Resolution Plan (2 min)**\n> "Here's what we're doing right now:"\n1. **Immediate:** [Workaround or temporary fix]\n2. **Short-term (24-48h):** [Patch or hotfix timeline]\n3. **Long-term:** [Permanent fix and prevention]\n\n**Commitment & Next Steps (1 min)**\n> "I'm personally going to own this until it's fully resolved. You'll hear from me by [specific time] with an update. Would you prefer updates via email or a quick call?"\n\n**Close**\n> "Thank you for your patience, [Name]. We value your partnership and I'm committed to making this right."`,
      `## Resolution Follow-up Call Script\n\n**Opening**\n> "Hi [Customer Name], this is [Your Name] following up on ticket [#]. I'm happy to share that the issue has been resolved. Do you have a few minutes so I can walk you through what happened and what we've done?"\n\n**Resolution Summary**\n- Explain the root cause in non-technical terms\n- Describe the fix that was implemented\n- Mention any preventive measures added\n\n**Verification**\n> "Have you had a chance to verify on your end? I'd love to walk through it together to make sure everything is working as expected."\n\n**Prevent Future Issues**\n> "To prevent this from happening again, we've [action taken]. I'd also recommend [proactive suggestion]."\n\n**Close & Satisfaction Check**\n> "Is there anything else I can help with? And honestly — how was your experience with our support on this? Your feedback helps us improve."`,
    ],
    sales: [
      `## Discovery Call Script — Sales Rep\n\n**Pre-Call Prep (review before dialing)**\n- Company: [Prospect Name] | Industry: [Industry]\n- Size: [Employee count] | Current tools: [Known stack]\n- Trigger: [What prompted outreach]\n\n---\n\n**Opening (1 min)**\n> "Hi [Name], thanks for taking the time today. I'm [Your Name] with Partner OS. Before I dive into anything, I'd love to understand more about your world. Can you tell me a bit about your current setup for managing partner and customer relationships?"\n\n**Situation Questions (3-4 min)**\n1. "How are you currently tracking account health across your portfolio?"\n2. "What tools are your team using day-to-day for outreach and pipeline management?"\n3. "How many accounts does each rep typically manage?"\n4. "Walk me through what happens when an account shows signs of risk."\n\n**Pain Discovery (3-4 min)**\n1. "What's the biggest challenge your team faces with [current process]?"\n2. "How much time does your team spend on manual reporting each week?"\n3. "When was the last time you lost an account you didn't see coming?"\n4. "If you could fix one thing about your current workflow, what would it be?"\n\n**Impact Quantification (2 min)**\n> "So if I'm hearing you correctly, [pain point] is costing your team roughly [X hours/week] and has contributed to [Y% churn]. Is that accurate?"\n\n**Solution Bridge (2 min)**\n> "That's exactly why companies like [similar customer] came to us. They were facing the same challenge and within [timeframe], they saw [specific result]. Would it be helpful if I showed you how that would work for your team?"\n\n**Next Steps (1 min)**\n> "Based on what you've shared, I think a focused demo with [stakeholder] would be really valuable. Are you available [date/time]? I'll tailor it specifically to [their pain point]."`,
    ],
    am: [
      `## QBR Call Script — Account Manager\n\n**Pre-Call Setup**\n- Pull latest health score, ARR, usage metrics\n- Review open tickets and recent interactions\n- Prepare 3 wins and 1 growth opportunity\n\n---\n\n**Opening (2 min)**\n> "Hi [Name], great to connect for our quarterly review. I've put together a comprehensive look at how things have been going, and I'm excited to share some wins. I also want to make sure we're aligned on priorities for next quarter. Sound good?"\n\n**Section 1: Wins & Value Delivered (5 min)**\n> "Let me start with the highlights:"\n1. **Health Score:** "Your account health is at [X], which is [up/stable/down] from last quarter"\n2. **Key Win 1:** [Specific achievement with metrics]\n3. **Key Win 2:** [Specific achievement with metrics]\n4. **ROI Impact:** "Based on our analysis, you've seen [X%] improvement in [metric]"\n\n**Section 2: Usage & Adoption (3 min)**\n- Show adoption metrics and trends\n- Highlight underutilized features\n> "I noticed your team hasn't explored [feature] yet. Companies similar to yours have seen [benefit] from it. Would you like a quick walkthrough?"\n\n**Section 3: Roadmap & Opportunities (3 min)**\n> "Looking ahead, here are three things I think could drive even more value:"\n1. [Expansion module] — "This would help with [specific need they've mentioned]"\n2. [Integration] — "Connecting [tool] would save your team [X hours/week]"\n3. [Training] — "A refresher session could boost adoption of [underused feature]"\n\n**Section 4: Their Priorities (3 min)**\n> "What are your top priorities for next quarter? I want to make sure our plan supports your goals."\n\n**Close & Action Items (2 min)**\n> "Great discussion. Let me recap our action items:"\n- [Action 1] — Owner: [Name] — Due: [Date]\n- [Action 2] — Owner: [Name] — Due: [Date]\n> "I'll send a summary email within the hour. Thanks, [Name]!"`,
    ],
    manager: [
      `## Team 1:1 Call Script — Manager\n\n**Opening (1 min)**\n> "Hey [Rep Name], thanks for making time. I want to use our 1:1 today to review your pipeline, celebrate some wins, and talk about where I can help. How are you feeling about this quarter?"\n\n**Pipeline Review (5 min)**\n> "Let's walk through your top deals:"\n\nFor each deal, ask:\n1. "What's the current status and next step?"\n2. "What's the biggest risk to this deal closing?"\n3. "Who's the champion and have we multi-threaded?"\n4. "What do you need from me to move this forward?"\n\n**Metrics Check (3 min)**\n- Review activity metrics (calls, emails, meetings)\n- Compare to targets\n> "Your [metric] is [above/below] target. What's driving that? How can we adjust?"\n\n**Coaching Moment (3 min)**\n- Pick ONE area to coach on (don't overload)\n> "I noticed [observation]. Here's a technique that's worked well: [specific advice]. Want to try it on your next [call/email]?"\n\n**Wins & Recognition (2 min)**\n> "Before we wrap, I want to call out [specific win]. That was excellent work because [why it matters]. Keep that up."\n\n**Close (1 min)**\n> "What's your #1 priority this week? And what's one thing I can do to help you succeed?"`,
    ],
  },
  email: {
    support: [
      `## Support Ticket Update Email\n\n---\n\n**Subject:** Update on Ticket [#] — [Issue Summary]\n\nHi [Customer Name],\n\nI wanted to provide you with an update on your support ticket regarding **[issue description]**.\n\n**Current Status:** Our engineering team has identified the root cause and is actively working on a fix.\n\n**What we've done so far:**\n- Reproduced the issue in our staging environment\n- Identified the root cause: [brief technical explanation in plain language]\n- Developed a fix that is currently in testing\n\n**Expected timeline:** We anticipate the fix will be deployed within **[X business hours/days]**.\n\n**In the meantime:** You can use [workaround] to continue your workflow without interruption.\n\nI'll send another update by **[specific date/time]** with confirmation that the fix is live. If you have any questions before then, please don't hesitate to reach out directly.\n\nThank you for your patience — we know this impacts your team's productivity and we're treating it as a top priority.\n\nBest regards,\n[Your Name]\nPartner OS Support`,
    ],
    sales: [
      `## Cold Outreach Email — Sales Rep\n\n---\n\n**Subject:** [Company Name]'s approach to partner management\n\nHi [First Name],\n\nI've been following [Company Name]'s growth in [industry] — impressive trajectory, especially [specific recent achievement or news].\n\nI'm reaching out because companies scaling at your pace often hit a wall with partner and account management. Specifically:\n\n- **Visibility gaps** — hard to see which accounts need attention before it's too late\n- **Manual reporting** — hours spent building dashboards instead of building relationships\n- **Reactive support** — finding out about issues after they've already escalated\n\nWe helped [Similar Company] solve exactly this. Within 90 days, they:\n- Reduced churn by **34%** with proactive health monitoring\n- Cut reporting time by **12 hours/week** with automated dashboards\n- Increased upsell revenue by **28%** with AI-driven expansion signals\n\nWould it be worth a 20-minute conversation to see if we could do something similar for [Company Name]?\n\nI have availability [Day 1] at [Time] or [Day 2] at [Time] — or happy to work around your schedule.\n\nBest,\n[Your Name]\n\n*P.S. — I put together a [brief case study / ROI calculator] specific to [their industry]. Happy to share if you're interested.*`,
    ],
    am: [
      `## QBR Invitation Email — Account Manager\n\n---\n\n**Subject:** Your Q2 Business Review — Let's celebrate some wins 🎯\n\nHi [Name],\n\nIt's that time again! I'd love to schedule our **Q2 Quarterly Business Review** to walk through your results, share some exciting insights, and align on priorities for the next quarter.\n\n**Here's a preview of what we'll cover:**\n\n📊 **Performance Highlights**\n- Your account health score and trend analysis\n- Key metrics and ROI impact since our last review\n- Usage and adoption insights across your team\n\n🏆 **Wins to Celebrate**\n- [Win 1 — specific to their account]\n- [Win 2 — specific to their account]\n\n🚀 **Looking Ahead**\n- New features and roadmap items relevant to your goals\n- Expansion opportunities we've identified\n- Your priorities and how we can better support them\n\n**Proposed time:** [Date] at [Time] (45 minutes)\n**Attendees:** I'd recommend including [their stakeholder] — I'll have [our stakeholder] join as well.\n\nDoes this work for your schedule? If not, I'm flexible — just let me know what works best.\n\nLooking forward to it!\n\nBest,\n[Your Name]`,
    ],
    manager: [
      `## Weekly Team Update Email — Manager\n\n---\n\n**Subject:** Weekly Pipeline & Portfolio Update — Week of [Date]\n\nTeam,\n\nHere's our weekly snapshot. Strong progress on several fronts — let's keep the momentum.\n\n---\n\n### 📊 Pipeline Summary\n| Metric | This Week | Last Week | Δ |\n|--------|-----------|-----------|---|\n| Total Pipeline Value | $[X] | $[Y] | [+/-]% |\n| Deals in Negotiation | [X] | [Y] | [+/-] |\n| Weighted Forecast | $[X] | $[Y] | [+/-]% |\n| New Opportunities | [X] | [Y] | [+/-] |\n\n### 🏆 Key Wins\n- **[Rep Name]** closed [Deal] for $[Amount] — great execution on the multi-thread strategy\n- **[Rep Name]** moved [Account] from At Risk to Stable — health score up 15 points\n\n### ⚠️ Watch Items\n- **[Account]** — health declining, [Rep] scheduling intervention call\n- **[Deal]** — stalled at [stage], need executive sponsor engagement\n\n### 🎯 This Week's Priorities\n1. Close [Deal 1] and [Deal 2] — combined $[X] in pipeline\n2. Complete health checks for all At Risk accounts\n3. Prep for [upcoming event/QBR]\n\nLet's have a great week. Reach out if you need anything.\n\n— [Your Name]`,
    ],
  },
  "support-assist": {
    support: [
      `## Troubleshooting Guide: Revenue Recognition Module — Multi-Currency Invoices\n\n### Problem Summary\nThe revenue recognition module is throwing errors when processing invoices with multiple currencies, specifically affecting NetSuite environments.\n\n### Diagnostic Steps\n\n**Step 1: Verify Currency Configuration**\n- Navigate to Setup → Company → Enable Features → Currencies\n- Confirm multi-currency is enabled\n- Check that all relevant currencies have active exchange rates\n\n**Step 2: Check Exchange Rate Tables**\n- Go to Lists → Accounting → Currency Exchange Rates\n- Verify rates exist for the invoice date range\n- Look for gaps or stale rates (>30 days old)\n\n**Step 3: Review Revenue Recognition Rules**\n- Navigate to Setup → Accounting → Revenue Recognition Rules\n- Check if rules are configured for multi-currency scenarios\n- Verify the "Currency Conversion Method" is set correctly\n\n**Step 4: Examine Error Logs**\n\`\`\`\nSystem → Support → Login Audit Trail → Search for "RevRec" errors\n\`\`\`\nLook for:\n- \`CURRENCY_MISMATCH\` — indicates mismatched base/transaction currencies\n- \`RATE_NOT_FOUND\` — missing exchange rate for the period\n- \`CALC_OVERFLOW\` — rounding issue on high-volume batches\n\n### Common Fixes\n\n| Error Code | Fix | Time |\n|------------|-----|------|\n| CURRENCY_MISMATCH | Update subsidiary currency mapping | 15 min |\n| RATE_NOT_FOUND | Add missing exchange rates | 5 min |\n| CALC_OVERFLOW | Enable "High Precision" mode | 10 min |\n\n### Escalation Criteria\nEscalate to Tier 2 if:\n- Error persists after all diagnostic steps\n- Multiple subsidiaries affected\n- Data corruption suspected\n\n### Customer Communication Template\n> "We've identified the issue as [root cause]. The fix involves [action] and should be resolved within [timeframe]. In the meantime, you can [workaround]."`,
    ],
    am: [
      `## At-Risk Account Ticket Summary & Prioritization\n\n### Current Open Tickets for At-Risk Accounts\n\n| Priority | Account | Ticket | Issue | Age | Recommendation |\n|----------|---------|--------|-------|-----|----------------|\n| 🔴 Critical | BlueWave Logistics | T-1041 | Revenue recognition errors | 3d | **Immediate escalation** — revenue impact |\n| 🟠 High | Apex Manufacturing | T-1038 | Dashboard not reflecting real-time data | 5d | Schedule call with Dana Reyes |\n\n### Recommended Prioritization\n\n**1. BlueWave Logistics (T-1041) — URGENT**\n- Health score: 67 (declining)\n- This is a revenue-impacting issue on a Silver-tier account already flagged At Risk\n- **Action:** Escalate to engineering lead, schedule call with Marcus Lin within 24h\n- **Talking point:** Acknowledge the impact, share specific timeline, offer temporary workaround\n\n**2. Apex Manufacturing (T-1038) — HIGH**\n- Health score: 92 (stable but could drop)\n- Gold-tier account in Expansion — don't let support issues derail the upsell\n- **Action:** Ensure Tier 2 is actively working, update Dana by EOD\n- **Talking point:** Frame as "we caught this early" and reinforce proactive monitoring\n\n### Proactive Recommendations\n- Schedule weekly ticket review for all accounts with health < 70\n- Set up automated alerts when Gold-tier accounts open Critical tickets\n- Create a shared dashboard for real-time ticket status visibility`,
    ],
  },
  "sales-assist": {
    sales: [
      `## Objection Handling: "Your pricing is too high"\n\n### The Framework: Acknowledge → Reframe → Prove → Advance\n\n---\n\n**Step 1: Acknowledge (don't dismiss)**\n> "I appreciate you being upfront about that. Pricing is always an important consideration, and I want to make sure the investment makes sense for [Company Name]."\n\n**Step 2: Reframe from cost to value**\n> "Let me ask — when you say 'too high,' are you comparing to a specific alternative, or is it more about the overall budget allocation?"\n\n*If comparing to competitor:*\n> "That's helpful context. [Competitor] does offer a lower entry price, but here's what I've seen from customers who've used both..."\n\n| Factor | Partner OS | Competitor |\n|--------|-----------|------------|\n| Time to value | 2 weeks | 6-8 weeks |\n| Account health monitoring | AI-powered, real-time | Manual, weekly |\n| Support response (Critical) | 2 hours | 24 hours |\n| Integration depth | Native + API | API only |\n| Total cost of ownership (3yr) | $[X] | $[Y] (higher) |\n\n**Step 3: Prove with social proof**\n> "[Similar Company] had the same concern. They chose us over [competitor] and within 6 months:\n> - Reduced churn by 34% (saving $[X] in retained revenue)\n> - Cut manual reporting by 12 hours/week\n> - ROI payback period was just 4 months"\n\n**Step 4: Advance**\n> "Would it be helpful if I put together a custom ROI analysis for [Company Name]? I can show you exactly what the return looks like based on your portfolio size and current churn rate."\n\n### Key Stats to Have Ready\n- Average customer ROI: **340%** over 3 years\n- Average payback period: **4.2 months**\n- Net revenue retention of our customers: **118%**`,
    ],
    am: [
      `## Upsell Strategy: Gold-Tier Account — Driftwood Capital\n\n### Account Snapshot\n- **Health Score:** 95 (Excellent)\n- **Current ARR:** $120,000\n- **Stage:** Upsell Ready\n- **Platform:** Salesforce\n- **Champion:** Tom Hargrove (CFO)\n\n### Why Now?\n1. ✅ Health score at all-time high (95) — strong satisfaction signal\n2. ✅ Recent ROI report showed 340% return — quantified value\n3. ✅ Tom mentioned "expanding analytics capabilities" in last call\n4. ✅ No open support tickets — clean slate\n\n### Recommended Expansion Modules\n\n| Module | Value Proposition | Est. ARR Impact |\n|--------|------------------|----------------|\n| Advanced Analytics | Real-time pipeline forecasting + custom dashboards | +$36,000/yr |\n| AI Insights | Predictive health scoring + churn risk alerts | +$24,000/yr |\n| Multi-Entity | Cross-subsidiary reporting and consolidation | +$18,000/yr |\n\n### Approach Strategy\n\n**Phase 1: Seed (This Week)**\n- Share the ROI report highlighting areas where additional modules would amplify returns\n- Mention that similar companies have expanded to [modules] with great results\n\n**Phase 2: Discover (Next Week)**\n- Schedule a "strategic planning" call (not a "sales" call)\n- Ask about their analytics pain points and growth plans\n- Introduce the modules as solutions to their stated needs\n\n**Phase 3: Propose (Week 3)**\n- Send a tailored proposal with tiered options\n- Include customer testimonials from similar companies\n- Offer a pilot period for the highest-value module\n\n### Potential ARR Outcome: $120K → $162K–$198K (+35-65%)`,
    ],
  },
  pipeline: {
    manager: [
      `## Pipeline Analysis & Forecast — Q2 2026\n\n### Executive Summary\nThe current pipeline shows **$64K in active potential** across 5 managed accounts. Overall portfolio health is mixed, with 2 accounts at risk requiring immediate attention.\n\n---\n\n### Pipeline by Stage\n\n| Stage | Accounts | Combined ARR | Avg Health | Risk Level |\n|-------|----------|-------------|------------|------------|\n| Expansion | 1 | $84,000 | 92 | 🟢 Low |\n| Upsell Ready | 1 | $120,000 | 95 | 🟢 Low |\n| Stable | 1 | $18,000 | 88 | 🟢 Low |\n| At Risk | 2 | $63,000 | 60.5 | 🔴 High |\n\n### Revenue Forecast\n\n**Best Case:** $349K (all accounts renew + Driftwood upsell closes)\n**Expected:** $298K (lose 1 at-risk account, partial upsell)\n**Worst Case:** $222K (lose both at-risk, no expansion)\n\n### Top 3 Risks\n\n1. **🔴 Edgeline Foods (Health: 54)**\n   - Declining health, budget concerns flagged\n   - ARR at risk: $27,000\n   - **Action:** Execute 30-day recovery plan, schedule exec sponsor call\n\n2. **🟠 BlueWave Logistics (Health: 67)**\n   - Critical open ticket (T-1041), CSAT declining\n   - ARR at risk: $36,000\n   - **Action:** Resolve ticket within 48h, schedule health check\n\n3. **🟡 Apex Manufacturing (T-1038)**\n   - Gold account with open High ticket — could impact expansion\n   - **Action:** Fast-track ticket resolution, don't let it delay QBR\n\n### Strategic Recommendations\n1. **Prioritize Driftwood Capital upsell** — highest probability, highest value ($36-78K potential)\n2. **Allocate dedicated resources to BlueWave recovery** — $36K ARR worth saving\n3. **Accelerate Apex QBR** — lock in expansion before any support friction builds\n4. **Consider Edgeline executive intervention** — if health drops below 50, involve VP of CS`,
    ],
    am: [
      `## Account Portfolio Health Analysis\n\n### Your Portfolio at a Glance\n\n| Account | Tier | Health | Trend | ARR | Priority Action |\n|---------|------|--------|-------|-----|----------------|\n| Driftwood Capital | Gold | 95 | ↑ | $120K | Upsell — strike while hot |\n| Apex Manufacturing | Gold | 92 | → | $84K | QBR prep — expand |\n| ClearPath Retail | Bronze | 88 | → | $18K | Nurture — upgrade tier? |\n| BlueWave Logistics | Silver | 67 | ↓ | $36K | Intervene — resolve ticket |\n| Edgeline Foods | Silver | 54 | ↓↓ | $27K | Urgent — recovery plan |\n\n### Focus Area Recommendations\n\n**🟢 Growth Zone (Health 85+): 60% of your time**\n- Driftwood and Apex are primed for expansion\n- Combined upsell potential: $54K-$96K additional ARR\n- Schedule strategic planning calls, not just check-ins\n\n**🟡 Nurture Zone (Health 65-84): 15% of your time**\n- ClearPath is stable but could be a tier upgrade candidate\n- BlueWave needs the critical ticket resolved ASAP\n\n**🔴 Recovery Zone (Health <65): 25% of your time**\n- Edgeline requires a structured 30-day recovery plan\n- Consider involving your manager for executive-level intervention\n\n### Key Metric: Your Portfolio Health Score\n**79.2** (down 3 pts from last month)\n- Dragged down by Edgeline (-8 pts) and BlueWave (-5 pts)\n- If both recover to 75+, your portfolio score jumps to **85+**`,
    ],
    sales: [
      `## Deal Prioritization Analysis\n\n### Prioritized Deal Stack\n\nBased on likelihood to close, revenue impact, and strategic value:\n\n| Rank | Account | Stage | ARR | Close Probability | Priority Score |\n|------|---------|-------|-----|-------------------|---------------|\n| 1 | Driftwood Capital | Upsell Ready | $120K (+$36-78K) | 85% | ⭐⭐⭐⭐⭐ |\n| 2 | Apex Manufacturing | Expansion | $84K (+$24-42K) | 75% | ⭐⭐⭐⭐ |\n| 3 | ClearPath Retail | Stable | $18K (+$6-12K) | 60% | ⭐⭐⭐ |\n| 4 | BlueWave Logistics | At Risk | $36K (retention) | 55% | ⭐⭐⭐ |\n| 5 | Edgeline Foods | At Risk | $27K (retention) | 35% | ⭐⭐ |\n\n### Recommended Time Allocation This Week\n- **40%** — Driftwood Capital (close the upsell)\n- **25%** — Apex Manufacturing (advance expansion)\n- **20%** — BlueWave Logistics (save the account)\n- **10%** — ClearPath Retail (plant expansion seeds)\n- **5%** — Edgeline Foods (monitor recovery plan)`,
    ],
  },
  universal: {
    support: [
      `## Best Practices: Critical Escalation — Gold-Tier Account\n\n### The Golden Rules\n\n**1. Speed is everything**\n- Acknowledge within 15 minutes (even if you don't have answers yet)\n- Gold-tier SLA: 2-hour response, 24-hour resolution target\n- If you can't resolve in 24h, escalate to Tier 2 + notify the Account Manager\n\n**2. Over-communicate, don't under-communicate**\n- Send updates every 4 hours minimum during active investigation\n- Use the customer's preferred channel (ask if you don't know)\n- Always include: what you've done, what you're doing next, expected timeline\n\n**3. Own it personally**\n- Assign a single owner (you) — no bouncing between reps\n- Give the customer your direct line/email\n- Follow up even after resolution to ensure satisfaction\n\n**4. Involve the right people early**\n- Loop in the Account Manager immediately for Gold-tier escalations\n- If revenue-impacting: notify the engineering lead within 1 hour\n- For data loss or security: invoke the incident response protocol\n\n**5. Document everything**\n- Log all interactions in the ticket\n- Create a post-mortem within 48h of resolution\n- Share learnings with the team to prevent recurrence\n\n### Quick Reference: Escalation Matrix\n\n| Severity | Response Time | Update Frequency | Escalation Path |\n|----------|--------------|-------------------|------------------|\n| Critical | 15 min | Every 2 hours | Tier 2 → Eng Lead → VP |\n| High | 2 hours | Every 4 hours | Tier 2 → Eng Lead |\n| Medium | 8 hours | Daily | Tier 2 |\n| Low | 24 hours | As needed | Self-serve KB |`,
    ],
    sales: [
      `## Logistics SaaS Market Trends — Discovery Call Prep\n\n### Key Trends to Reference\n\n**1. AI-Powered Predictive Analytics (Hot Topic)**\n- 73% of logistics companies plan to invest in predictive analytics by 2027\n- Key use cases: demand forecasting, route optimization, inventory management\n- *Your angle:* "How are you currently forecasting demand? Many logistics companies are moving from reactive to predictive..."\n\n**2. Real-Time Visibility & IoT Integration**\n- Supply chain visibility platforms grew 28% YoY\n- Customers expect real-time tracking and proactive alerts\n- *Your angle:* "Your customers are expecting real-time visibility. How are you delivering that today?"\n\n**3. Sustainability & ESG Reporting**\n- Regulatory pressure increasing (EU CSRD, SEC climate rules)\n- Logistics companies need carbon tracking and reporting\n- *Your angle:* "Are you seeing pressure from customers or regulators around sustainability reporting?"\n\n**4. Consolidation & Platform Fatigue**\n- Average logistics company uses 12+ software tools\n- Strong appetite for consolidated platforms\n- *Your angle:* "How many tools is your team juggling? We're seeing a big push toward consolidation..."`,
    ],
    am: [
      `## 90-Day Success Plan: At-Risk Account Recovery\n\n### Phase 1: Stabilize (Days 1-30)\n\n**Week 1: Emergency Response**\n- [ ] Schedule urgent call with primary contact\n- [ ] Resolve all open Critical/High tickets\n- [ ] Identify the #1 pain point driving dissatisfaction\n- [ ] Assign dedicated support resource\n\n**Week 2-3: Quick Wins**\n- [ ] Deliver 2-3 quick wins that show immediate value\n- [ ] Set up weekly check-in cadence\n- [ ] Share a "what we've done" summary with stakeholders\n\n**Week 4: Assess**\n- [ ] Review health score trend (target: +10 points)\n- [ ] Gather informal NPS/satisfaction feedback\n- [ ] Adjust plan based on progress\n\n### Phase 2: Rebuild (Days 31-60)\n\n**Focus: Re-establish value and trust**\n- [ ] Conduct a mini-QBR focused on ROI and wins\n- [ ] Introduce new features or capabilities they haven't explored\n- [ ] Connect them with a peer customer for a success story\n- [ ] Involve executive sponsor for a relationship-building call\n\n**Target:** Health score at 70+ by Day 60\n\n### Phase 3: Grow (Days 61-90)\n\n**Focus: Shift from defense to offense**\n- [ ] Propose a growth plan (new modules, expanded usage)\n- [ ] Discuss renewal terms proactively\n- [ ] Set up a customer advisory board invitation\n- [ ] Transition from weekly to bi-weekly check-ins\n\n**Target:** Health score at 80+ by Day 90, renewal confirmed`,
    ],
    manager: [
      `## Quarterly Strategic Plan: Portfolio Health Improvement\n\n### Current State\n- Average portfolio health: **79.2** (target: 85+)\n- At-risk accounts: **2 of 5** (40% — target: <15%)\n- Total ARR at risk: **$63,000** (22% of portfolio)\n\n### Strategic Pillars\n\n**Pillar 1: Proactive Health Monitoring**\n- Implement weekly health score reviews (every Monday)\n- Set automated alerts for any account dropping below 75\n- Create a "Health Score Playbook" with intervention triggers\n- *KPI: Reduce average time-to-intervention from 14 days to 3 days*\n\n**Pillar 2: Support Excellence**\n- Target: Resolve Critical tickets within 24 hours\n- Assign dedicated support resources to Gold-tier accounts\n- Implement post-resolution satisfaction surveys\n- *KPI: Reduce average ticket age from 6.75 days to <3 days*\n\n**Pillar 3: Revenue Expansion**\n- Identify upsell opportunities for all accounts with health 85+\n- Create account-specific expansion proposals\n- Target: 2 upsell closes per quarter\n- *KPI: Increase net revenue retention from 105% to 115%*\n\n**Pillar 4: Team Development**\n- Weekly pipeline reviews with coaching focus\n- Monthly skill-building sessions (objection handling, QBR delivery)\n- Peer shadowing program for new reps\n- *KPI: Improve team average deal velocity by 20%*\n\n### 90-Day Milestones\n| Day | Milestone | Owner |\n|-----|-----------|-------|\n| 15 | Health monitoring system live | Ops |\n| 30 | All at-risk accounts have recovery plans | AMs |\n| 45 | First upsell proposal sent | Sales |\n| 60 | Support SLA compliance at 95%+ | Support Lead |\n| 90 | Portfolio health at 85+ | All |`,
    ],
  },
};

/* ── Typing animation hook ──────────────────────────────────── */
function useTypingEffect(text: string, speed: number = 8) {
  const [displayed, setDisplayed] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    setDisplayed("");
    setIsComplete(false);
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1));
        i++;
      } else {
        setIsComplete(true);
        clearInterval(interval);
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);

  return { displayed, isComplete };
}

/* ── Main Component ─────────────────────────────────────────── */
export default function AIAssistantView() {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const role = ROLES.find((r) => r.id === selectedRole);
  const tool = TOOLS.find((t) => t.id === activeTool);
  const roleTools = TOOLS.filter((t) => selectedRole && t.roles.includes(selectedRole));
  const scenarios = activeTool && selectedRole ? SCENARIOS[activeTool]?.[selectedRole] || [] : [];

  const handleGenerate = useCallback((inputPrompt?: string) => {
    const finalPrompt = inputPrompt || prompt;
    if (!finalPrompt.trim() || !activeTool || !selectedRole) return;

    setIsGenerating(true);
    setGeneratedContent(null);

    // Simulate AI generation delay
    const responses = AI_RESPONSES[activeTool]?.[selectedRole] || [];
    const response = responses[Math.floor(Math.random() * responses.length)] ||
      `## AI Response\n\nBased on your request as a **${role?.label}** using the **${tool?.label}**:\n\n${finalPrompt}\n\n---\n\n*This is a simulated AI response. In production, this would connect to an LLM API for real-time generation.*`;

    setTimeout(() => {
      setIsGenerating(false);
      setGeneratedContent(response);
    }, 1500 + Math.random() * 1000);
  }, [prompt, activeTool, selectedRole, role, tool]);

  const handleCopy = useCallback(() => {
    if (generatedContent) {
      navigator.clipboard.writeText(generatedContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [generatedContent]);

  const handleReset = useCallback(() => {
    setGeneratedContent(null);
    setPrompt("");
  }, []);

  const handleBack = useCallback(() => {
    if (generatedContent) {
      handleReset();
    } else if (activeTool) {
      setActiveTool(null);
      setPrompt("");
    } else if (selectedRole) {
      setSelectedRole(null);
    }
  }, [activeTool, selectedRole, generatedContent, handleReset]);

  /* ── Render: Role Selection ─────────────────────────────── */
  if (!selectedRole) {
    return (
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">AI Assistant</h2>
              <p className="text-xs text-muted-foreground">Select your role to get personalized AI tools</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {ROLES.map((r, i) => (
            <motion.button
              key={r.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 + i * 0.06 }}
              onClick={() => setSelectedRole(r.id)}
              className={cn(
                "group relative text-left rounded-xl border p-5 transition-all duration-200",
                "border-border bg-card hover:border-primary/40 hover:bg-primary/[0.04]",
                "hover:shadow-lg hover:shadow-primary/5"
              )}
            >
              <div className="flex items-start gap-4">
                <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border", r.bgColor, r.borderColor)}>
                  <r.icon className={cn("w-5 h-5", r.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground group-hover:text-foreground transition-colors">
                      {r.label}
                    </h3>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                    {r.description}
                  </p>
                  <div className="flex items-center gap-1.5 mt-3">
                    <Zap className="w-3 h-3 text-muted-foreground/40" />
                    <span className="text-[10px] text-muted-foreground/60">
                      {TOOLS.filter((t) => t.roles.includes(r.id)).length} AI tools available
                    </span>
                  </div>
                </div>
              </div>
            </motion.button>
          ))}
        </motion.div>

        {/* Quick stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex items-center gap-6 pt-2"
        >
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground/50">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{TOOLS.length} AI tools</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground/50">
            <FileText className="w-3.5 h-3.5" />
            <span>Pre-built scenarios for every role</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground/50">
            <Shield className="w-3.5 h-3.5" />
            <span>Context-aware generation</span>
          </div>
        </motion.div>
      </div>
    );
  }

  /* ── Render: Tool Selection ─────────────────────────────── */
  if (!activeTool) {
    return (
      <div className="space-y-6">
        {/* Header with back button */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
          <button onClick={handleBack} className="w-8 h-8 rounded-lg border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-muted-foreground/40 transition-all">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border", role!.bgColor, role!.borderColor)}>
            {role && <role.icon className={cn("w-5 h-5", role.color)} />}
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">{role?.label} Tools</h2>
            <p className="text-xs text-muted-foreground">Choose an AI tool to get started</p>
          </div>
        </motion.div>

        {/* Tool grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roleTools.map((t, i) => (
            <motion.button
              key={t.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + i * 0.06 }}
              onClick={() => setActiveTool(t.id)}
              className={cn(
                "group relative text-left rounded-xl border p-5 transition-all duration-200",
                "border-border bg-card hover:border-primary/40 hover:bg-primary/[0.04]",
                "hover:shadow-lg hover:shadow-primary/5"
              )}
            >
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3 border", t.bgColor, `border-${t.color.replace('text-', '')}/20`)}>
                <t.icon className={cn("w-5 h-5", t.color)} />
              </div>
              <div className="flex items-center justify-between mb-1.5">
                <h3 className="text-sm font-semibold text-foreground group-hover:text-foreground transition-colors">
                  {t.label}
                </h3>
                <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {t.description}
              </p>
            </motion.button>
          ))}
        </div>
      </div>
    );
  }

  /* ── Render: Tool Workspace ─────────────────────────────── */
  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <button onClick={handleBack} className="w-8 h-8 rounded-lg border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-muted-foreground/40 transition-all">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", tool!.bgColor)}>
          {tool && <tool.icon className={cn("w-5 h-5", tool.color)} />}
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-foreground">{tool?.label}</h2>
          <p className="text-[11px] text-muted-foreground flex items-center gap-2">
            <span className={cn("flex items-center gap-1", role!.color)}>
              {role && <role.icon className="w-3 h-3" />}
              {role?.label}
            </span>
            <span className="text-muted-foreground/30">·</span>
            {tool?.description}
          </p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-6">
        {/* Left: Input panel */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.05 }}
          className="space-y-4"
        >
          {/* Quick scenarios */}
          {scenarios.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <h3 className="text-[11px] tracking-[0.1em] uppercase text-muted-foreground font-medium">
                Quick Scenarios
              </h3>
              <div className="space-y-2">
                {scenarios.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setPrompt(s.prompt);
                      handleGenerate(s.prompt);
                    }}
                    className="w-full text-left rounded-lg border border-border/60 bg-card/50 px-3 py-2.5 hover:border-primary/30 hover:bg-primary/[0.04] transition-all group/sc"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-foreground group-hover/sc:text-foreground transition-colors">
                        {s.label}
                      </span>
                      <Zap className="w-3 h-3 text-muted-foreground/30 group-hover/sc:text-primary transition-colors" />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                      {s.prompt}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Custom prompt */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <h3 className="text-[11px] tracking-[0.1em] uppercase text-muted-foreground font-medium">
              Custom Prompt
            </h3>
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={`Describe what you need as a ${role?.label}...`}
              rows={4}
              className="w-full rounded-lg border border-border bg-background/50 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all resize-none"
            />
            <button
              onClick={() => handleGenerate()}
              disabled={!prompt.trim() || isGenerating}
              className={cn(
                "w-full flex items-center justify-center gap-2 h-10 rounded-lg text-sm font-medium transition-all",
                prompt.trim() && !isGenerating
                  ? "bg-gradient-to-r from-primary to-primary/80 text-foreground hover:shadow-lg hover:shadow-primary/20"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate
                </>
              )}
            </button>
          </div>

          {/* Context panel */}
          <div className="rounded-xl border border-border/60 bg-card/40 p-4 space-y-3">
            <h3 className="text-[11px] tracking-[0.1em] uppercase text-muted-foreground/60 font-medium flex items-center gap-1.5">
              <Building2 className="w-3 h-3" />
              Account Context Available
            </h3>
            <div className="space-y-1.5">
              {ACCOUNTS.slice(0, 3).map((acc) => (
                <div key={acc.id} className="flex items-center gap-2 text-[11px] text-muted-foreground/60">
                  <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                  <span>{acc.name}</span>
                  <span className="text-[10px]">· {acc.tier} · Health {acc.health}</span>
                </div>
              ))}
              <div className="text-[10px] text-muted-foreground/40 mt-1">
                + {ACCOUNTS.length - 3} more accounts · {TICKETS.length} tickets · {OUTREACH.length} sequences
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right: Output panel */}
        <motion.div
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-border bg-card overflow-hidden"
        >
          {/* Output header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-foreground">AI Output</span>
              {isGenerating && (
                <span className="text-[10px] text-primary flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Generating...
                </span>
              )}
            </div>
            {generatedContent && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 h-7 px-2.5 rounded-md border border-border bg-card text-[10px] text-muted-foreground hover:text-foreground hover:border-muted-foreground/40 transition-all"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-700" /> : <Copy className="w-3 h-3" />}
                  {copied ? "Copied" : "Copy"}
                </button>
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1 h-7 px-2.5 rounded-md border border-border bg-card text-[10px] text-muted-foreground hover:text-foreground hover:border-muted-foreground/40 transition-all"
                >
                  <RefreshCw className="w-3 h-3" />
                  New
                </button>
              </div>
            )}
          </div>

          {/* Output content */}
          <div className="p-5 min-h-[400px] max-h-[600px] overflow-auto">
            <AnimatePresence mode="wait">
              {isGenerating ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center h-[300px] gap-4"
                >
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <Sparkles className="w-7 h-7 text-primary animate-pulse" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary animate-ping opacity-30" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">Generating your content...</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Analyzing context and crafting a tailored response
                    </p>
                  </div>
                  {/* Shimmer lines */}
                  <div className="w-full max-w-md space-y-2 mt-4">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className="h-3 rounded-md bg-muted/40 animate-pulse"
                        style={{
                          width: `${60 + Math.random() * 40}%`,
                          animationDelay: `${i * 0.15}s`,
                        }}
                      />
                    ))}
                  </div>
                </motion.div>
              ) : generatedContent ? (
                <motion.div
                  key="content"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="prose prose-invert prose-sm max-w-none"
                >
                  <MarkdownRenderer content={generatedContent} />
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center h-[300px] gap-3 text-center"
                >
                  <div className="w-14 h-14 rounded-2xl bg-muted/30 flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-muted-foreground/30" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">No content generated yet</p>
                    <p className="text-[11px] text-muted-foreground/50 mt-1">
                      Choose a quick scenario or write a custom prompt
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/* ── Simple Markdown Renderer ───────────────────────────────── */
function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split("\n");

  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        // Headers
        if (line.startsWith("## ")) {
          return <h2 key={i} className="text-base font-bold text-foreground mt-4 mb-2">{line.replace("## ", "")}</h2>;
        }
        if (line.startsWith("### ")) {
          return <h3 key={i} className="text-sm font-semibold text-foreground mt-3 mb-1.5">{line.replace("### ", "")}</h3>;
        }
        // Blockquotes
        if (line.startsWith("> ")) {
          return (
            <blockquote key={i} className="border-l-2 border-primary/40 pl-3 py-1 text-[12px] text-foreground/80 italic bg-primary/[0.03] rounded-r-md">
              {renderInline(line.replace("> ", ""))}
            </blockquote>
          );
        }
        // Horizontal rule
        if (line.trim() === "---") {
          return <hr key={i} className="border-border/40 my-3" />;
        }
        // Table rows
        if (line.includes("|") && line.trim().startsWith("|")) {
          const cells = line.split("|").filter(Boolean).map((c) => c.trim());
          if (cells.every((c) => /^[-:]+$/.test(c))) return null; // separator row
          const isHeader = i + 1 < lines.length && lines[i + 1]?.includes("---");
          return (
            <div key={i} className={cn("grid gap-2 text-[11px] px-2 py-1.5 rounded-md", isHeader ? "font-semibold text-foreground bg-muted/30" : "text-muted-foreground")} style={{ gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))` }}>
              {cells.map((cell, j) => (
                <span key={j} className="truncate">{renderInline(cell)}</span>
              ))}
            </div>
          );
        }
        // Numbered list
        if (/^\d+\.\s/.test(line.trim())) {
          return (
            <div key={i} className="flex gap-2 text-[12px] text-foreground/80 pl-1">
              <span className="text-primary font-mono font-semibold shrink-0">{line.trim().match(/^\d+/)?.[0]}.</span>
              <span>{renderInline(line.trim().replace(/^\d+\.\s/, ""))}</span>
            </div>
          );
        }
        // Bullet list
        if (line.trim().startsWith("- ")) {
          const indent = line.search(/\S/);
          return (
            <div key={i} className="flex gap-2 text-[12px] text-foreground/80" style={{ paddingLeft: `${Math.max(0, indent / 2) * 8 + 4}px` }}>
              <span className="text-primary mt-1.5 shrink-0">•</span>
              <span>{renderInline(line.trim().replace(/^- /, ""))}</span>
            </div>
          );
        }
        // Checkbox
        if (line.trim().startsWith("- [ ] ") || line.trim().startsWith("- [x] ")) {
          const checked = line.trim().startsWith("- [x] ");
          return (
            <div key={i} className="flex items-start gap-2 text-[12px] text-foreground/80 pl-1">
              <span className="mt-0.5 shrink-0">
                {checked ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" /> : <Circle className="w-3.5 h-3.5 text-muted-foreground/40" />}
              </span>
              <span className={checked ? "line-through text-muted-foreground" : ""}>
                {renderInline(line.trim().replace(/^- \[.\] /, ""))}
              </span>
            </div>
          );
        }
        // Code block
        if (line.trim().startsWith("```")) {
          return null; // Skip code fences
        }
        // Empty line
        if (line.trim() === "") {
          return <div key={i} className="h-2" />;
        }
        // Regular paragraph
        return (
          <p key={i} className="text-[12px] text-foreground/80 leading-relaxed">
            {renderInline(line)}
          </p>
        );
      })}
    </div>
  );
}

function renderInline(text: string): React.ReactNode {
  // Bold
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={i} className="italic">{part.slice(1, -1)}</em>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={i} className="text-[11px] px-1 py-0.5 rounded bg-muted/50 text-primary font-mono">{part.slice(1, -1)}</code>;
    }
    return part;
  });
}
