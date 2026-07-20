/*
 * AdminSettingsView — Centralized admin configuration panel
 * Tabs: General, Notifications, Renewals, Downsell, Accounts, Team & Roles
 * Warm adaptive theme
 */
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAdminSettings } from "@/contexts/AdminSettingsContext";
import { useUsers } from "@/contexts/UsersContext";
import { ACCOUNTS, type Account } from "@/lib/data";
import { roleBadgeColor, statusBadgeColor, type User } from "@/lib/users";
import UserFormDialog from "@/components/UserFormDialog";
import { toast } from "sonner";
import {
  Settings2, Bell, CalendarClock, ShieldAlert, Building2, Users,
  Save, RotateCcw, CheckCircle2, Clock, AlertTriangle, ChevronRight,
  Plus, Pencil, Trash2, X, Shield, Sliders, Globe, DollarSign,
  Volume2, VolumeX, Mail, MessageSquare, Timer, TrendingDown,
  BarChart3, Zap, Eye, EyeOff, GripVertical,
} from "lucide-react";

/* ── Tab definitions ──────────────────────────────────────── */
const TABS = [
  { id: "general", label: "General", icon: Settings2 },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "renewals", label: "Renewals", icon: CalendarClock },
  { id: "downsell", label: "Downsell Signals", icon: ShieldAlert },
  { id: "accounts", label: "Account Data", icon: Building2 },
  { id: "team", label: "Team & Roles", icon: Users },
] as const;

type TabId = (typeof TABS)[number]["id"];

/* ── Helpers ──────────────────────────────────────────────── */
function SectionCard({ title, description, icon: Icon, children }: {
  title: string; description?: string; icon: React.ElementType; children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/30 p-5">
      <div className="flex items-center gap-2.5 mb-1">
        <Icon className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      {description && <p className="text-[11px] text-muted-foreground/50 mb-4 ml-6.5">{description}</p>}
      {!description && <div className="mb-4" />}
      {children}
    </div>
  );
}

function Toggle({ checked, onChange, label, description }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; description?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border/30 last:border-0">
      <div>
        <span className="text-xs font-medium text-foreground">{label}</span>
        {description && <p className="text-[10px] text-muted-foreground/50 mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={cn("w-10 h-5 rounded-full relative transition-colors", checked ? "bg-primary/30" : "bg-muted/30")}
      >
        <motion.div
          animate={{ x: checked ? 20 : 2 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className={cn("w-4 h-4 rounded-full absolute top-0.5", checked ? "bg-primary" : "bg-muted-foreground/40")}
        />
      </button>
    </div>
  );
}

function NumberInput({ value, onChange, label, suffix, min, max }: {
  value: number; onChange: (v: number) => void; label: string; suffix?: string; min?: number; max?: number;
}) {
  return (
    <div>
      <label className="text-[10px] tracking-[0.08em] uppercase text-muted-foreground/50 mb-1.5 block">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          onChange={(e) => onChange(parseInt(e.target.value) || 0)}
          className="h-8 w-24 rounded-lg bg-background border border-border text-xs text-foreground px-3 font-mono"
        />
        {suffix && <span className="text-[10px] text-muted-foreground/50">{suffix}</span>}
      </div>
    </div>
  );
}

function SelectInput({ value, onChange, label, options }: {
  value: string; onChange: (v: string) => void; label: string; options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="text-[10px] tracking-[0.08em] uppercase text-muted-foreground/50 mb-1.5 block">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 rounded-lg bg-background border border-border text-xs text-foreground px-3 w-full"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

/* ── General Tab ──────────────────────────────────────────── */
function GeneralTab() {
  const { settings, updateGeneral } = useAdminSettings();
  const g = settings.general;

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2 MB");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      updateGeneral({ userAvatarUrl: dataUrl });
      toast.success("Profile picture updated");
    };
    reader.readAsDataURL(file);
  };

  const removeAvatar = () => {
    updateGeneral({ userAvatarUrl: "" });
    toast.success("Profile picture removed");
  };

  const initials = g.userDisplayName
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-5">
      {/* User Profile */}
      <SectionCard title="User Profile" icon={Users} description="Your display name and profile picture">
        <div className="flex items-start gap-6">
          {/* Avatar preview + upload */}
          <div className="flex flex-col items-center gap-2">
            <div className="relative group">
              {g.userAvatarUrl ? (
                <img
                  src={g.userAvatarUrl}
                  alt={g.userDisplayName}
                  className="w-20 h-20 rounded-full object-cover border-2 border-border"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-xl font-bold text-primary-foreground border-2 border-border">
                  {initials}
                </div>
              )}
              <label className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                <Pencil className="w-5 h-5 text-white" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </label>
            </div>
            {g.userAvatarUrl && (
              <button
                onClick={removeAvatar}
                className="text-[10px] text-red-500 hover:text-red-600 transition-colors"
              >
                Remove photo
              </button>
            )}
            <p className="text-[9px] text-muted-foreground/40 text-center">Click to upload<br/>Max 2 MB</p>
          </div>

          {/* Name fields */}
          <div className="flex-1 grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-[10px] tracking-[0.08em] uppercase text-muted-foreground/50 mb-1.5 block">Display Name</label>
              <input
                value={g.userDisplayName}
                onChange={(e) => updateGeneral({ userDisplayName: e.target.value })}
                placeholder="Your full name"
                className="h-8 w-full rounded-lg bg-background border border-border text-xs text-foreground px-3"
              />
              <p className="text-[9px] text-muted-foreground/40 mt-1">Shown in the header and greeting banner</p>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Organization" icon={Globe} description="Basic organization settings">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] tracking-[0.08em] uppercase text-muted-foreground/50 mb-1.5 block">Consulting Firm Name</label>
            <input
              value={g.consultingFirmName}
              onChange={(e) => updateGeneral({ consultingFirmName: e.target.value })}
              placeholder="Your firm name (shown in sidebar)"
              className="h-8 w-full rounded-lg bg-background border border-border text-xs text-foreground px-3"
            />
            <p className="text-[9px] text-muted-foreground/40 mt-1">Displayed under the Partner OS logo in the sidebar</p>
          </div>
          <SelectInput
            label="Timezone"
            value={g.timezone}
            onChange={(v) => updateGeneral({ timezone: v })}
            options={[
              { value: "America/New_York", label: "Eastern (ET)" },
              { value: "America/Chicago", label: "Central (CT)" },
              { value: "America/Denver", label: "Mountain (MT)" },
              { value: "America/Los_Angeles", label: "Pacific (PT)" },
              { value: "Europe/London", label: "GMT" },
              { value: "Europe/Berlin", label: "CET" },
              { value: "Asia/Tokyo", label: "JST" },
            ]}
          />
          <SelectInput
            label="Date Format"
            value={g.dateFormat}
            onChange={(v) => updateGeneral({ dateFormat: v })}
            options={[
              { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
              { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
              { value: "YYYY-MM-DD", label: "YYYY-MM-DD" },
            ]}
          />
          <SelectInput
            label="Currency"
            value={g.currency}
            onChange={(v) => updateGeneral({ currency: v })}
            options={[
              { value: "USD", label: "USD ($)" },
              { value: "EUR", label: "EUR (€)" },
              { value: "GBP", label: "GBP (£)" },
              { value: "CAD", label: "CAD (C$)" },
            ]}
          />
          <SelectInput
            label="Fiscal Year Start"
            value={g.fiscalYearStart}
            onChange={(v) => updateGeneral({ fiscalYearStart: v })}
            options={["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((m) => ({ value: m, label: m }))}
          />
        </div>
      </SectionCard>

      <SectionCard title="Health Score Configuration" icon={BarChart3} description="Adjust how account health scores are calculated">
        <SelectInput
          label="Scoring Method"
          value={g.defaultHealthScoreMethod}
          onChange={(v) => updateGeneral({ defaultHealthScoreMethod: v as "weighted" | "simple" })}
          options={[
            { value: "weighted", label: "Weighted Average" },
            { value: "simple", label: "Simple Average" },
          ]}
        />
        {g.defaultHealthScoreMethod === "weighted" && (
          <div className="mt-4 space-y-3">
            <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">Weight Distribution (must total 100%)</p>
            {(["csat", "support", "engagement", "revenue"] as const).map((key) => (
              <div key={key} className="flex items-center gap-3">
                <span className="text-xs text-foreground w-24 capitalize">{key}</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={g.healthWeights[key]}
                  onChange={(e) => updateGeneral({ healthWeights: { ...g.healthWeights, [key]: parseInt(e.target.value) } })}
                  className="flex-1 h-1.5 accent-primary"
                />
                <span className="text-xs font-mono text-primary w-10 text-right">{g.healthWeights[key]}%</span>
              </div>
            ))}
            <div className="text-right">
              <span className={cn(
                "text-[10px] font-mono",
                Object.values(g.healthWeights).reduce((a, b) => a + b, 0) === 100 ? "text-emerald-600" : "text-red-500"
              )}>
                Total: {Object.values(g.healthWeights).reduce((a, b) => a + b, 0)}%
              </span>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

/* ── Notifications Tab ────────────────────────────────────── */
function NotificationsTab() {
  const { settings, updateNotifications } = useAdminSettings();
  const n = settings.notifications;

  return (
    <div className="space-y-5">
      <SectionCard title="Alert Channels" icon={Bell} description="Configure which alerts are active and how they're delivered">
        <Toggle
          checked={n.slaBreachEnabled}
          onChange={(v) => updateNotifications({ slaBreachEnabled: v })}
          label="SLA Breach Alerts"
          description="Notify when SLA timelines are about to be breached"
        />
        <Toggle
          checked={n.renewalAlertEnabled}
          onChange={(v) => updateNotifications({ renewalAlertEnabled: v })}
          label="Renewal Alerts"
          description="Notify when accounts enter renewal windows"
        />
        <Toggle
          checked={n.downsellAlertEnabled}
          onChange={(v) => updateNotifications({ downsellAlertEnabled: v })}
          label="Downsell Risk Alerts"
          description="Notify when downsell risk score exceeds threshold"
        />
        <Toggle
          checked={n.healthDropEnabled}
          onChange={(v) => updateNotifications({ healthDropEnabled: v })}
          label="Health Score Drop Alerts"
          description="Notify when an account's health drops significantly"
        />
        <Toggle
          checked={n.ticketEscalationEnabled}
          onChange={(v) => updateNotifications({ ticketEscalationEnabled: v })}
          label="Ticket Escalation Alerts"
          description="Notify when support tickets are escalated"
        />
      </SectionCard>

      <SectionCard title="Thresholds" icon={Sliders} description="Set trigger thresholds for automated alerts">
        <div className="grid grid-cols-2 gap-4">
          <NumberInput
            label="Downsell Alert Threshold"
            value={n.downsellAlertThreshold}
            onChange={(v) => updateNotifications({ downsellAlertThreshold: v })}
            suffix="risk score"
            min={0}
            max={100}
          />
          <NumberInput
            label="Health Drop Threshold"
            value={n.healthDropThreshold}
            onChange={(v) => updateNotifications({ healthDropThreshold: v })}
            suffix="% drop"
            min={1}
            max={50}
          />
        </div>
      </SectionCard>

      <SectionCard title="Delivery Preferences" icon={Mail} description="How and when notifications are delivered">
        <div className="space-y-3">
          <div>
            <label className="text-[10px] tracking-[0.08em] uppercase text-muted-foreground/50 mb-2 block">SLA Breach Channels</label>
            <div className="flex gap-2">
              {(["in-app", "email", "slack"] as const).map((ch) => (
                <button
                  key={ch}
                  onClick={() => {
                    const channels = n.slaBreachChannels.includes(ch)
                      ? n.slaBreachChannels.filter((c) => c !== ch)
                      : [...n.slaBreachChannels, ch];
                    updateNotifications({ slaBreachChannels: channels });
                  }}
                  className={cn(
                    "h-7 px-3 rounded-lg text-[10px] font-medium border transition-colors",
                    n.slaBreachChannels.includes(ch)
                      ? "bg-primary/15 border-primary/30 text-primary"
                      : "bg-muted/10 border-border text-muted-foreground/50"
                  )}
                >
                  {ch === "in-app" ? "In-App" : ch === "email" ? "Email" : "Slack"}
                </button>
              ))}
            </div>
          </div>
          <Toggle
            checked={n.dailyDigestEnabled}
            onChange={(v) => updateNotifications({ dailyDigestEnabled: v })}
            label="Daily Digest Email"
            description="Send a summary of all alerts at a scheduled time"
          />
          {n.dailyDigestEnabled && (
            <div className="ml-6">
              <label className="text-[10px] tracking-[0.08em] uppercase text-muted-foreground/50 mb-1.5 block">Digest Time</label>
              <input
                type="time"
                value={n.dailyDigestTime}
                onChange={(e) => updateNotifications({ dailyDigestTime: e.target.value })}
                className="h-8 rounded-lg bg-background border border-border text-xs text-foreground px-3 font-mono"
              />
            </div>
          )}
          <Toggle
            checked={n.soundEnabled}
            onChange={(v) => updateNotifications({ soundEnabled: v })}
            label="Notification Sounds"
            description="Play sound for critical alerts"
          />
        </div>
      </SectionCard>

      <SectionCard title="Renewal Alert Schedule" icon={CalendarClock} description="Configure when renewal reminders are sent before LED">
        <div className="space-y-2">
          <p className="text-[10px] text-muted-foreground/50">Alerts will be sent at these intervals before License End Date:</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {[180, 150, 120, 90, 60, 45, 30, 21, 14, 7, 3, 1].map((days) => (
              <button
                key={days}
                onClick={() => {
                  const current = n.renewalAlertDaysBefore;
                  const updated = current.includes(days) ? current.filter((d) => d !== days) : [...current, days].sort((a, b) => b - a);
                  updateNotifications({ renewalAlertDaysBefore: updated });
                }}
                className={cn(
                  "h-7 px-3 rounded-lg text-[10px] font-mono font-medium border transition-colors",
                  n.renewalAlertDaysBefore.includes(days)
                    ? "bg-amber-500/15 border-amber-500/30 text-amber-600"
                    : "bg-muted/10 border-border text-muted-foreground/40"
                )}
              >
                {days}d
              </button>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground/40 mt-1">
            Active: {n.renewalAlertDaysBefore.sort((a, b) => b - a).map((d) => `${d}d`).join(", ")}
          </p>
        </div>
      </SectionCard>
    </div>
  );
}

/* ── Renewals Tab ─────────────────────────────────────────── */
function RenewalsTab() {
  const { settings, updateRenewals } = useAdminSettings();
  const r = settings.renewals;

  return (
    <div className="space-y-5">
      <SectionCard title="Renewal Window" icon={CalendarClock} description="Define when the renewal process begins relative to License End Date">
        <div className="grid grid-cols-3 gap-4">
          <NumberInput
            label="Renewal Window"
            value={r.renewalWindowMonths}
            onChange={(v) => updateRenewals({ renewalWindowMonths: v })}
            suffix="months before LED"
            min={1}
            max={12}
          />
          <NumberInput
            label="Critical Threshold"
            value={r.criticalThresholdDays}
            onChange={(v) => updateRenewals({ criticalThresholdDays: v })}
            suffix="days = Critical"
            min={1}
            max={90}
          />
          <NumberInput
            label="Urgent Threshold"
            value={r.urgentThresholdDays}
            onChange={(v) => updateRenewals({ urgentThresholdDays: v })}
            suffix="days = Urgent"
            min={30}
            max={180}
          />
        </div>
        <div className="mt-4 rounded-lg bg-amber-500/5 border border-amber-500/15 p-3">
          <p className="text-[10px] text-amber-600">
            <strong>Current policy:</strong> Renewal process starts <strong>{r.renewalWindowMonths} months</strong> before LED.
            Accounts become <strong>Urgent</strong> at {r.urgentThresholdDays} days and <strong>Critical</strong> at {r.criticalThresholdDays} days before LED.
          </p>
        </div>
      </SectionCard>

      <SectionCard title="Automation" icon={Zap} description="Configure automatic renewal workflow actions">
        <Toggle
          checked={r.autoCreateRenewalTask}
          onChange={(v) => updateRenewals({ autoCreateRenewalTask: v })}
          label="Auto-Create Renewal Tasks"
          description="Automatically create a renewal task when an account enters the renewal window"
        />
        <Toggle
          checked={r.autoAssignToOwner}
          onChange={(v) => updateRenewals({ autoAssignToOwner: v })}
          label="Auto-Assign to Account Owner"
          description="Automatically assign renewal tasks to the account's designated renewal owner"
        />
        <Toggle
          checked={r.renewalApprovalRequired}
          onChange={(v) => updateRenewals({ renewalApprovalRequired: v })}
          label="Manager Approval Required"
          description="Require manager sign-off before marking a renewal as committed"
        />
      </SectionCard>

      <SectionCard title="Defaults" icon={Settings2} description="Default values for new accounts and contracts">
        <div className="grid grid-cols-2 gap-4">
          <SelectInput
            label="Default Contract Term"
            value={String(r.defaultContractTermMonths)}
            onChange={(v) => updateRenewals({ defaultContractTermMonths: parseInt(v) })}
            options={[
              { value: "12", label: "12 months (1 year)" },
              { value: "24", label: "24 months (2 years)" },
              { value: "36", label: "36 months (3 years)" },
            ]}
          />
        </div>
      </SectionCard>

      <SectionCard title="Renewal Stages" icon={ChevronRight} description="Customize the stages in the renewal pipeline">
        <div className="space-y-2">
          {r.renewalStages.map((stage, i) => (
            <div key={i} className="flex items-center gap-2">
              <GripVertical className="w-3.5 h-3.5 text-muted-foreground/30" />
              <span className="text-xs text-foreground flex-1">{stage}</span>
              <span className="text-[10px] text-muted-foreground/40 font-mono">Stage {i + 1}</span>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

/* ── Downsell Tab ─────────────────────────────────────────── */
function DownsellTab() {
  const { settings, updateDownsell } = useAdminSettings();
  const d = settings.downsell;

  const totalWeight = Object.values(d.signalWeights).reduce((a, b) => a + b, 0);

  const signalLabels: Record<string, { label: string; icon: React.ElementType }> = {
    usageDrop: { label: "Usage Drop", icon: TrendingDown },
    supportIssues: { label: "Support Issues", icon: AlertTriangle },
    csatDecline: { label: "CSAT Decline", icon: BarChart3 },
    billingFriction: { label: "Billing Friction", icon: DollarSign },
    lowEngagement: { label: "Low Engagement", icon: Eye },
    outreachGhosting: { label: "Outreach Ghosting", icon: MessageSquare },
  };

  return (
    <div className="space-y-5">
      <SectionCard title="Signal Weights" icon={Sliders} description="Adjust the relative importance of each downsell signal in the risk score calculation">
        <div className="space-y-3">
          {(Object.keys(d.signalWeights) as (keyof typeof d.signalWeights)[]).map((key) => {
            const { label, icon: Icon } = signalLabels[key];
            return (
              <div key={key} className="flex items-center gap-3">
                <Icon className="w-3.5 h-3.5 text-muted-foreground/50" />
                <span className="text-xs text-foreground w-32">{label}</span>
                <input
                  type="range"
                  min={0}
                  max={50}
                  value={d.signalWeights[key]}
                  onChange={(e) => updateDownsell({
                    signalWeights: { ...d.signalWeights, [key]: parseInt(e.target.value) }
                  })}
                  className="flex-1 h-1.5 accent-red-500"
                />
                <span className="text-xs font-mono text-red-500 w-10 text-right">{d.signalWeights[key]}%</span>
              </div>
            );
          })}
          <div className="text-right">
            <span className={cn("text-[10px] font-mono", totalWeight === 100 ? "text-emerald-600" : "text-red-500")}>
              Total: {totalWeight}%
            </span>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Risk Thresholds" icon={ShieldAlert} description="Define score boundaries for each risk level">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-[10px] tracking-[0.08em] uppercase text-muted-foreground/50 mb-1.5 block">Low → Medium</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={d.riskThresholds.low}
                onChange={(e) => updateDownsell({ riskThresholds: { ...d.riskThresholds, low: parseInt(e.target.value) || 0 } })}
                className="h-8 w-20 rounded-lg bg-background border border-border text-xs text-foreground px-3 font-mono"
              />
              <span className="text-[10px] text-emerald-600 font-medium">Low</span>
            </div>
          </div>
          <div>
            <label className="text-[10px] tracking-[0.08em] uppercase text-muted-foreground/50 mb-1.5 block">Medium → High</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={d.riskThresholds.medium}
                onChange={(e) => updateDownsell({ riskThresholds: { ...d.riskThresholds, medium: parseInt(e.target.value) || 0 } })}
                className="h-8 w-20 rounded-lg bg-background border border-border text-xs text-foreground px-3 font-mono"
              />
              <span className="text-[10px] text-amber-600 font-medium">Medium</span>
            </div>
          </div>
          <div>
            <label className="text-[10px] tracking-[0.08em] uppercase text-muted-foreground/50 mb-1.5 block">High → Critical</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={d.riskThresholds.high}
                onChange={(e) => updateDownsell({ riskThresholds: { ...d.riskThresholds, high: parseInt(e.target.value) || 0 } })}
                className="h-8 w-20 rounded-lg bg-background border border-border text-xs text-foreground px-3 font-mono"
              />
              <span className="text-[10px] text-red-500 font-medium">High</span>
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1">
          <div className="h-2 flex-1 rounded-full bg-emerald-600/20" />
          <div className="h-2 flex-1 rounded-full bg-amber-500/20" />
          <div className="h-2 flex-1 rounded-full bg-orange-500/20" />
          <div className="h-2 flex-1 rounded-full bg-red-500/20" />
        </div>
        <div className="flex justify-between text-[9px] text-muted-foreground/40 mt-1">
          <span>0</span>
          <span>{d.riskThresholds.low}</span>
          <span>{d.riskThresholds.medium}</span>
          <span>{d.riskThresholds.high}</span>
          <span>100</span>
        </div>
      </SectionCard>

      <SectionCard title="Automation" icon={Zap} description="Configure automated downsell mitigation workflows">
        <Toggle
          checked={d.autoRunAnalysis}
          onChange={(v) => updateDownsell({ autoRunAnalysis: v })}
          label="Auto-Run AI Analysis"
          description="Automatically run downsell risk analysis on a weekly schedule"
        />
        {d.autoRunAnalysis && (
          <div className="ml-6 mt-2">
            <SelectInput
              label="Analysis Day"
              value={d.autoRunDay}
              onChange={(v) => updateDownsell({ autoRunDay: v })}
              options={["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map((d) => ({ value: d, label: d }))}
            />
          </div>
        )}
        <Toggle
          checked={d.mitigationAutoAssign}
          onChange={(v) => updateDownsell({ mitigationAutoAssign: v })}
          label="Auto-Assign Mitigations"
          description="Automatically assign mitigation actions to the account owner"
        />
        <Toggle
          checked={d.executivePdfAutoSend}
          onChange={(v) => updateDownsell({ executivePdfAutoSend: v })}
          label="Auto-Send Executive PDF"
          description="Automatically email the executive summary PDF to leadership weekly"
        />
        {d.executivePdfAutoSend && (
          <div className="ml-6 mt-2">
            <label className="text-[10px] tracking-[0.08em] uppercase text-muted-foreground/50 mb-1.5 block">Recipients (comma-separated emails)</label>
            <input
              value={d.executivePdfRecipients.join(", ")}
              onChange={(e) => updateDownsell({ executivePdfRecipients: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
              placeholder="ceo@company.com, vp-sales@company.com"
              className="h-8 w-full rounded-lg bg-background border border-border text-xs text-foreground px-3"
            />
          </div>
        )}
      </SectionCard>
    </div>
  );
}

/* ── Accounts Tab ─────────────────────────────────────────── */
function AccountsTab() {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([...ACCOUNTS]);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return accounts;
    const q = search.toLowerCase();
    return accounts.filter((a) => a.name.toLowerCase().includes(q) || a.platform.toLowerCase().includes(q));
  }, [accounts, search]);

  function handleUpdate(id: number, field: keyof Account, value: string | number) {
    setAccounts((prev) => prev.map((a) => a.id === id ? { ...a, [field]: value } : a));
  }

  function handleSaveLED(id: number, led: string) {
    setAccounts((prev) => prev.map((a) => {
      if (a.id !== id || !a.saasLicense) return a;
      return { ...a, saasLicense: { ...a.saasLicense, licenseEndDate: led } };
    }));
  }

  return (
    <div className="space-y-5">
      <SectionCard title="Account Data Management" icon={Building2} description="Edit account records, customer types, LED dates, and ARR values">
        <div className="mb-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search accounts..."
            className="h-8 w-72 rounded-lg bg-background border border-border text-xs text-foreground px-3"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground/50">
                <th className="text-left py-2 pr-3">Account</th>
                <th className="text-left py-2 pr-3">Type</th>
                <th className="text-left py-2 pr-3">Platform</th>
                <th className="text-left py-2 pr-3">Tier</th>
                <th className="text-right py-2 pr-3">ARR</th>
                <th className="text-right py-2 pr-3">Health</th>
                <th className="text-left py-2 pr-3">LED</th>
                <th className="text-left py-2 pr-3">Contact</th>
                <th className="text-center py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => {
                const isEditing = editingId === a.id;
                return (
                  <tr key={a.id} className={cn("border-b border-border/30 transition-colors", isEditing && "bg-primary/5")}>
                    <td className="py-2.5 pr-3">
                      {isEditing ? (
                        <input value={a.name} onChange={(e) => handleUpdate(a.id, "name", e.target.value)} className="h-7 w-full rounded bg-background border border-border text-xs px-2" />
                      ) : (
                        <span className="font-medium text-foreground">{a.name}</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3">
                      {isEditing ? (
                        <select value={a.customerType} onChange={(e) => handleUpdate(a.id, "customerType", e.target.value)} className="h-7 rounded bg-background border border-border text-xs px-1">
                          <option value="SaaS">SaaS</option>
                          <option value="Services">Services</option>
                          <option value="Hybrid">Hybrid</option>
                        </select>
                      ) : (
                        <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded",
                          a.customerType === "SaaS" ? "bg-blue-500/10 text-blue-600" :
                          a.customerType === "Hybrid" ? "bg-purple-500/10 text-purple-600" :
                          "bg-emerald-500/10 text-emerald-600"
                        )}>{a.customerType}</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 text-muted-foreground">{a.platform}</td>
                    <td className="py-2.5 pr-3">
                      {isEditing ? (
                        <select value={a.tier} onChange={(e) => handleUpdate(a.id, "tier", e.target.value)} className="h-7 rounded bg-background border border-border text-xs px-1">
                          <option value="Gold">Gold</option>
                          <option value="Silver">Silver</option>
                          <option value="Bronze">Bronze</option>
                        </select>
                      ) : (
                        <span className={cn("text-[10px] font-medium",
                          a.tier === "Gold" ? "text-amber-600" : a.tier === "Silver" ? "text-slate-400" : "text-orange-700"
                        )}>{a.tier}</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 text-right font-mono">
                      {isEditing ? (
                        <input type="number" value={a.arr} onChange={(e) => handleUpdate(a.id, "arr", parseInt(e.target.value) || 0)} className="h-7 w-24 rounded bg-background border border-border text-xs px-2 text-right font-mono" />
                      ) : (
                        <span className="text-foreground">${(a.arr / 1000).toFixed(0)}K</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 text-right font-mono">
                      {isEditing ? (
                        <input type="number" value={a.health} min={0} max={100} onChange={(e) => handleUpdate(a.id, "health", parseInt(e.target.value) || 0)} className="h-7 w-16 rounded bg-background border border-border text-xs px-2 text-right font-mono" />
                      ) : (
                        <span className={cn(a.health >= 80 ? "text-emerald-600" : a.health >= 60 ? "text-amber-600" : "text-red-500")}>{a.health}</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3">
                      {a.saasLicense ? (
                        isEditing ? (
                          <input type="date" value={a.saasLicense.licenseEndDate} onChange={(e) => handleSaveLED(a.id, e.target.value)} className="h-7 rounded bg-background border border-border text-xs px-2 font-mono" />
                        ) : (
                          <span className="text-xs font-mono text-muted-foreground">{new Date(a.saasLicense.licenseEndDate).toLocaleDateString()}</span>
                        )
                      ) : (
                        <span className="text-[10px] text-muted-foreground/30">N/A</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3">
                      {isEditing ? (
                        <input value={a.contact} onChange={(e) => handleUpdate(a.id, "contact", e.target.value)} className="h-7 w-full rounded bg-background border border-border text-xs px-2" />
                      ) : (
                        <span className="text-muted-foreground">{a.contact}</span>
                      )}
                    </td>
                    <td className="py-2.5 text-center">
                      {isEditing ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => { setEditingId(null); toast.success(`${a.name} updated`); }}
                            className="w-6 h-6 rounded flex items-center justify-center bg-emerald-600/15 text-emerald-600 hover:bg-emerald-600/25 transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="w-6 h-6 rounded flex items-center justify-center bg-muted/15 text-muted-foreground hover:bg-muted/25 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setEditingId(a.id)}
                          className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground/40 hover:text-primary hover:bg-primary/10 transition-colors mx-auto"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

/* ── Users management (actual people + access levels) ─────── */
function UsersManagementCard() {
  const { users, addUser, updateUser, deleteUser } = useUsers();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);

  const openAdd = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (u: User) => { setEditing(u); setFormOpen(true); };

  return (
    <SectionCard
      title="Users"
      icon={Users}
      description="Team members and their access level (Admin · Account Manager · Supervisor)"
    >
      <div className="flex justify-end -mt-1 mb-3">
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <Plus className="w-3.5 h-3.5" /> Add User
        </button>
      </div>

      <div className="space-y-2">
        {users.map((u) => {
          const rc = roleBadgeColor[u.role];
          const scb = statusBadgeColor[u.status];
          return (
            <div key={u.id} className="flex items-center gap-3 py-2 px-1 border-b border-border/30 last:border-0 group">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[11px] font-bold text-primary shrink-0">
                {u.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-foreground truncate">{u.name}</span>
                  <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-semibold", rc.bg, rc.text)}>{u.role}</span>
                  <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-medium", scb.bg, scb.text)}>{u.status}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-muted-foreground/70">
                  <Mail className="w-2.5 h-2.5" />
                  <span className="truncate">{u.email}</span>
                  {u.title && <><span className="text-muted-foreground/30">·</span><span className="truncate">{u.title}</span></>}
                </div>
              </div>
              <button
                onClick={() => openEdit(u)}
                title="Edit user"
                className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground/40 hover:text-primary hover:bg-primary/10 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Pencil className="w-3 h-3" />
              </button>
              <button
                onClick={() => { if (confirm(`Remove ${u.name}?`)) { deleteUser(u.id); toast.success("User removed"); } }}
                title="Remove user"
                className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground/40 hover:text-red-500 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          );
        })}
        {users.length === 0 && (
          <p className="text-xs text-muted-foreground py-6 text-center">No users yet — add your first team member.</p>
        )}
      </div>

      <UserFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        user={editing}
        onSubmit={(data) => {
          if (editing) { updateUser(editing.id, data); toast.success("User updated"); }
          else { addUser(data); toast.success("User added"); }
        }}
      />
    </SectionCard>
  );
}

/* ── Team Tab ─────────────────────────────────────────────── */
function TeamTab() {
  const { settings, updateTeam } = useAdminSettings();
  const t = settings.team;

  return (
    <div className="space-y-5">
      <UsersManagementCard />

      <SectionCard title="Roles & Permissions" icon={Shield} description="Define roles and their access levels">
        <div className="space-y-3">
          {t.roles.map((role) => (
            <div key={role.id} className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <span className="text-xs font-semibold text-foreground">{role.name}</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {role.permissions.map((p) => (
                    <span key={p} className="text-[9px] px-1.5 py-0.5 rounded bg-muted/15 text-muted-foreground/60">{p}</span>
                  ))}
                </div>
              </div>
              <button className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground/40 hover:text-primary hover:bg-primary/10 transition-colors">
                <Pencil className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Escalation Chain" icon={AlertTriangle} description="Define the order of escalation for unresolved issues">
        <div className="space-y-2">
          {t.escalationChain.map((role, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">{i + 1}</span>
              <span className="text-xs text-foreground flex-1">{role}</span>
              {i < t.escalationChain.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground/30" />}
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Assignment Rules" icon={Settings2} description="How new tasks and tickets are assigned to team members">
        <SelectInput
          label="Default Assignment Method"
          value={t.defaultAssignment}
          onChange={(v) => updateTeam({ defaultAssignment: v as "round-robin" | "load-balanced" | "manual" })}
          options={[
            { value: "round-robin", label: "Round Robin — Distribute evenly" },
            { value: "load-balanced", label: "Load Balanced — Based on current workload" },
            { value: "manual", label: "Manual — Manager assigns" },
          ]}
        />
      </SectionCard>
    </div>
  );
}

/* ── Main Component ──────────────────────────────────────── */
export default function AdminSettingsView() {
  const [activeTab, setActiveTab] = useState<TabId>("general");
  const { hasUnsavedChanges, saveSettings, resetToDefaults, lastSaved } = useAdminSettings();

  function handleSave() {
    saveSettings();
    toast.success("Settings saved successfully", { description: "All changes have been applied across the platform." });
  }

  function handleReset() {
    resetToDefaults();
    toast.info("Settings reset to defaults", { description: "All configuration has been restored to factory defaults." });
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2.5">
            <Settings2 className="w-5 h-5 text-primary" />
            Admin Settings
          </h1>
          <p className="text-xs text-muted-foreground/50 mt-0.5">
            Configure SLA timelines, notification rules, renewal thresholds, downsell signals, and account data
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastSaved && (
            <span className="text-[10px] text-muted-foreground/40 mr-2">
              Last saved: {lastSaved.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={handleReset}
            className="h-8 px-3 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/10 transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={!hasUnsavedChanges}
            className={cn(
              "h-8 px-4 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all",
              hasUnsavedChanges
                ? "bg-gradient-to-r from-primary to-primary/70 text-foreground shadow-lg shadow-primary/20"
                : "bg-muted/20 text-muted-foreground/30 cursor-not-allowed"
            )}
          >
            <Save className="w-3.5 h-3.5" />
            Save Changes
          </button>
        </div>
      </div>

      {/* Unsaved changes banner */}
      <AnimatePresence>
        {hasUnsavedChanges && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-2.5 flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span className="text-xs text-amber-600 font-medium">You have unsaved changes</span>
            <button onClick={handleSave} className="ml-auto text-[10px] font-semibold text-amber-600 hover:text-amber-500 underline">
              Save now
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab navigation */}
      <div className="flex gap-1 border-b border-border pb-px">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "h-9 px-4 rounded-t-lg text-xs font-medium flex items-center gap-2 transition-colors border-b-2",
              activeTab === tab.id
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-muted-foreground/50 hover:text-foreground hover:bg-muted/10"
            )}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
        >
          {activeTab === "general" && <GeneralTab />}
          {activeTab === "notifications" && <NotificationsTab />}
          {activeTab === "renewals" && <RenewalsTab />}
          {activeTab === "downsell" && <DownsellTab />}
          {activeTab === "accounts" && <AccountsTab />}
          {activeTab === "team" && <TeamTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
