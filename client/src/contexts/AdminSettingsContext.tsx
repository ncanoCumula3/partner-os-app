/*
 * AdminSettingsContext — Centralized store for all admin-configurable parameters
 * Covers: General, Notifications, Renewals, Downsell, Account Defaults, Team
 * SLA rules remain in SLAConfigView (already has full CRUD)
 */
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

/* ── Types ──────────────────────────────────────────────────── */
export interface NotificationSettings {
  slaBreachEnabled: boolean;
  slaBreachChannels: ("in-app" | "email" | "slack")[];
  renewalAlertEnabled: boolean;
  renewalAlertDaysBefore: number[];  // e.g. [180, 120, 90, 60, 30, 14, 7]
  downsellAlertEnabled: boolean;
  downsellAlertThreshold: number;    // risk score threshold to trigger alert
  healthDropEnabled: boolean;
  healthDropThreshold: number;       // % drop to trigger alert
  ticketEscalationEnabled: boolean;
  dailyDigestEnabled: boolean;
  dailyDigestTime: string;           // "08:00"
  soundEnabled: boolean;
}

export interface RenewalSettings {
  renewalWindowMonths: number;       // How many months before LED to start renewal (default 6)
  criticalThresholdDays: number;     // Days before LED = "Critical" (default 30)
  urgentThresholdDays: number;       // Days before LED = "Urgent" (default 90)
  autoCreateRenewalTask: boolean;    // Auto-create task when entering renewal window
  autoAssignToOwner: boolean;        // Auto-assign renewal task to account owner
  renewalStages: string[];           // Customizable stages
  defaultContractTermMonths: number; // Default contract length
  renewalApprovalRequired: boolean;  // Require manager approval for renewals
}

export interface DownsellSettings {
  signalWeights: {
    usageDrop: number;       // 0-100 weight
    supportIssues: number;
    csatDecline: number;
    billingFriction: number;
    lowEngagement: number;
    outreachGhosting: number;
  };
  riskThresholds: {
    low: number;             // score below this = Low risk
    medium: number;          // score below this = Medium risk
    high: number;            // score below this = High risk
    // above high = Critical
  };
  autoRunAnalysis: boolean;          // Auto-run AI analysis weekly
  autoRunDay: string;                // "Monday"
  mitigationAutoAssign: boolean;     // Auto-assign mitigations to account owner
  executivePdfAutoSend: boolean;     // Auto-send weekly PDF to leadership
  executivePdfRecipients: string[];
}

export interface GeneralSettings {
  companyName: string;
  consultingFirmName: string;
  userDisplayName: string;
  userAvatarUrl: string;
  timezone: string;
  dateFormat: string;
  currency: string;
  fiscalYearStart: string;           // "January", "April", etc.
  defaultHealthScoreMethod: "weighted" | "simple";
  healthWeights: {
    csat: number;
    support: number;
    engagement: number;
    revenue: number;
  };
}

export interface TeamSettings {
  roles: { id: string; name: string; permissions: string[] }[];
  escalationChain: string[];         // Ordered list of escalation roles
  defaultAssignment: "round-robin" | "load-balanced" | "manual";
}

export interface SLARule {
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

export interface AdminSettings {
  general: GeneralSettings;
  notifications: NotificationSettings;
  renewals: RenewalSettings;
  downsell: DownsellSettings;
  team: TeamSettings;
}

/* ── Defaults ──────────────────────────────────────────────── */
const DEFAULT_SETTINGS: AdminSettings = {
  general: {
    companyName: "Partner OS",
    consultingFirmName: "Acme Consulting",
    userDisplayName: "Jordan Davis",
    userAvatarUrl: "",
    timezone: "America/New_York",
    dateFormat: "MM/DD/YYYY",
    currency: "USD",
    fiscalYearStart: "January",
    defaultHealthScoreMethod: "weighted",
    healthWeights: { csat: 30, support: 25, engagement: 25, revenue: 20 },
  },
  notifications: {
    slaBreachEnabled: true,
    slaBreachChannels: ["in-app", "email"],
    renewalAlertEnabled: true,
    renewalAlertDaysBefore: [180, 120, 90, 60, 30, 14, 7],
    downsellAlertEnabled: true,
    downsellAlertThreshold: 60,
    healthDropEnabled: true,
    healthDropThreshold: 15,
    ticketEscalationEnabled: true,
    dailyDigestEnabled: true,
    dailyDigestTime: "08:00",
    soundEnabled: true,
  },
  renewals: {
    renewalWindowMonths: 6,
    criticalThresholdDays: 30,
    urgentThresholdDays: 90,
    autoCreateRenewalTask: true,
    autoAssignToOwner: true,
    renewalStages: ["Not Started", "Discovery", "Negotiation", "Committed", "Renewed", "Churned"],
    defaultContractTermMonths: 12,
    renewalApprovalRequired: false,
  },
  downsell: {
    signalWeights: {
      usageDrop: 25,
      supportIssues: 20,
      csatDecline: 20,
      billingFriction: 15,
      lowEngagement: 10,
      outreachGhosting: 10,
    },
    riskThresholds: { low: 30, medium: 50, high: 75 },
    autoRunAnalysis: true,
    autoRunDay: "Monday",
    mitigationAutoAssign: true,
    executivePdfAutoSend: false,
    executivePdfRecipients: [],
  },
  team: {
    roles: [
      { id: "admin", name: "Admin", permissions: ["all"] },
      { id: "manager", name: "Account Manager", permissions: ["accounts", "pipeline", "renewals", "downsell", "reporting"] },
      { id: "rep", name: "Sales Rep", permissions: ["accounts", "pipeline", "outreach", "support"] },
      { id: "support", name: "Support Agent", permissions: ["support", "sla-tracker", "kb"] },
      { id: "viewer", name: "Viewer", permissions: ["dashboard", "reporting"] },
    ],
    escalationChain: ["Team Lead", "Senior Consultant", "Account Manager", "Department Head", "VP of Customer Success", "CTO / Executive"],
    defaultAssignment: "round-robin",
  },
};

/* ── Context ──────────────────────────────────────────────── */
interface AdminSettingsContextType {
  settings: AdminSettings;
  updateGeneral: (updates: Partial<GeneralSettings>) => void;
  updateNotifications: (updates: Partial<NotificationSettings>) => void;
  updateRenewals: (updates: Partial<RenewalSettings>) => void;
  updateDownsell: (updates: Partial<DownsellSettings>) => void;
  updateTeam: (updates: Partial<TeamSettings>) => void;
  resetToDefaults: () => void;
  hasUnsavedChanges: boolean;
  saveSettings: () => void;
  lastSaved: Date | null;
  slaRules: SLARule[];
  setSlaRules: (rules: SLARule[]) => void;
}

const AdminSettingsContext = createContext<AdminSettingsContextType | null>(null);

export function useAdminSettings() {
  const ctx = useContext(AdminSettingsContext);
  if (!ctx) throw new Error("useAdminSettings must be used within AdminSettingsProvider");
  return ctx;
}

/* ── Default SLA Rules ─────────────────────────────────────── */
const DEFAULT_SLA_RULES: SLARule[] = [
  { id: "sla-1", category: "support", subcategory: "Bug / Error Resolution", channel: "Email", urgency: "Critical", firstResponse: 15, resolution: 120, escalationAfter: 30, escalateTo: "Department Head", notifyBefore: 10, active: true },
  { id: "sla-2", category: "support", subcategory: "Bug / Error Resolution", channel: "Phone", urgency: "Critical", firstResponse: 5, resolution: 60, escalationAfter: 15, escalateTo: "CTO / Executive", notifyBefore: 5, active: true },
  { id: "sla-3", category: "support", subcategory: "Security Incident", channel: "Email", urgency: "Critical", firstResponse: 10, resolution: 60, escalationAfter: 15, escalateTo: "CTO / Executive", notifyBefore: 5, active: true },
  { id: "sla-4", category: "support", subcategory: "Configuration Issue", channel: "Email", urgency: "High", firstResponse: 30, resolution: 240, escalationAfter: 60, escalateTo: "Team Lead", notifyBefore: 15, active: true },
  { id: "sla-5", category: "support", subcategory: "Integration Troubleshooting", channel: "Email", urgency: "High", firstResponse: 30, resolution: 480, escalationAfter: 120, escalateTo: "Senior Consultant", notifyBefore: 30, active: true },
  { id: "sla-6", category: "support", subcategory: "User Access / Permissions", channel: "Chat", urgency: "Medium", firstResponse: 60, resolution: 480, escalationAfter: 240, escalateTo: "Team Lead", notifyBefore: 30, active: true },
  { id: "sla-7", category: "support", subcategory: "Performance Optimization", channel: "Email", urgency: "Medium", firstResponse: 120, resolution: 1440, escalationAfter: 480, escalateTo: "Senior Consultant", notifyBefore: 60, active: true },
  { id: "sla-8", category: "inquiry", subcategory: "General Account Question", channel: "Email", urgency: "Medium", firstResponse: 120, resolution: 1440, escalationAfter: 480, escalateTo: "Account Manager", notifyBefore: 60, active: true },
  { id: "sla-9", category: "inquiry", subcategory: "General Account Question", channel: "Phone", urgency: "Medium", firstResponse: 5, resolution: 60, escalationAfter: 30, escalateTo: "Account Manager", notifyBefore: 10, active: true },
  { id: "sla-10", category: "inquiry", subcategory: "Billing / Invoice Inquiry", channel: "Email", urgency: "High", firstResponse: 60, resolution: 480, escalationAfter: 120, escalateTo: "Account Manager", notifyBefore: 30, active: true },
  { id: "sla-11", category: "inquiry", subcategory: "Contract / Renewal Question", channel: "Email", urgency: "High", firstResponse: 60, resolution: 1440, escalationAfter: 240, escalateTo: "VP of Customer Success", notifyBefore: 60, active: true },
  { id: "sla-12", category: "inquiry", subcategory: "Training / Onboarding Help", channel: "Email", urgency: "Low", firstResponse: 240, resolution: 2880, escalationAfter: 1440, escalateTo: "Team Lead", notifyBefore: 120, active: true },
  { id: "sla-13", category: "product", subcategory: "New Product Demo Request", channel: "Email", urgency: "High", firstResponse: 60, resolution: 1440, escalationAfter: 480, escalateTo: "Account Manager", notifyBefore: 60, active: true },
  { id: "sla-14", category: "product", subcategory: "Feature Capability Inquiry", channel: "Email", urgency: "Medium", firstResponse: 120, resolution: 1440, escalationAfter: 480, escalateTo: "Senior Consultant", notifyBefore: 60, active: true },
  { id: "sla-15", category: "product", subcategory: "Pricing / Packaging Info", channel: "Phone", urgency: "High", firstResponse: 15, resolution: 240, escalationAfter: 60, escalateTo: "Account Manager", notifyBefore: 15, active: true },
  { id: "sla-16", category: "product", subcategory: "Integration Capabilities", channel: "Email", urgency: "Medium", firstResponse: 120, resolution: 2880, escalationAfter: 1440, escalateTo: "Senior Consultant", notifyBefore: 120, active: true },
  { id: "sla-17", category: "consulting", subcategory: "Business Development Strategy", channel: "Email", urgency: "Medium", firstResponse: 240, resolution: 4320, escalationAfter: 1440, escalateTo: "Department Head", notifyBefore: 120, active: true },
  { id: "sla-18", category: "consulting", subcategory: "Marketing Services", channel: "Email", urgency: "Medium", firstResponse: 240, resolution: 4320, escalationAfter: 1440, escalateTo: "Department Head", notifyBefore: 120, active: true },
  { id: "sla-19", category: "consulting", subcategory: "Sales Enablement", channel: "Email", urgency: "High", firstResponse: 120, resolution: 2880, escalationAfter: 720, escalateTo: "VP of Customer Success", notifyBefore: 60, active: true },
  { id: "sla-20", category: "consulting", subcategory: "Tax Advisory", channel: "Email", urgency: "High", firstResponse: 120, resolution: 2880, escalationAfter: 720, escalateTo: "Department Head", notifyBefore: 60, active: true },
  { id: "sla-21", category: "consulting", subcategory: "Audit & Compliance", channel: "Email", urgency: "Critical", firstResponse: 60, resolution: 1440, escalationAfter: 240, escalateTo: "CTO / Executive", notifyBefore: 30, active: true },
  { id: "sla-22", category: "consulting", subcategory: "Digital Transformation", channel: "Email", urgency: "Medium", firstResponse: 480, resolution: 10080, escalationAfter: 2880, escalateTo: "VP of Customer Success", notifyBefore: 240, active: true },
  { id: "sla-23", category: "consulting", subcategory: "M&A Due Diligence", channel: "Email", urgency: "Critical", firstResponse: 30, resolution: 480, escalationAfter: 120, escalateTo: "CTO / Executive", notifyBefore: 15, active: true },
];

/* ── localStorage helpers ─────────────────────────────────── */
const STORAGE_KEY_SETTINGS = "partner-os-admin-settings";
const STORAGE_KEY_SLA = "partner-os-sla-rules";
const STORAGE_KEY_LAST_SAVED = "partner-os-last-saved";

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveToStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or unavailable — silently ignore
  }
}

export function AdminSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AdminSettings>(() => loadFromStorage(STORAGE_KEY_SETTINGS, DEFAULT_SETTINGS));
  const [savedSettings, setSavedSettings] = useState<AdminSettings>(() => loadFromStorage(STORAGE_KEY_SETTINGS, DEFAULT_SETTINGS));
  const [lastSaved, setLastSaved] = useState<Date | null>(() => {
    const ts = localStorage.getItem(STORAGE_KEY_LAST_SAVED);
    return ts ? new Date(ts) : null;
  });
  const [slaRules, setSlaRulesState] = useState<SLARule[]>(() => loadFromStorage(STORAGE_KEY_SLA, DEFAULT_SLA_RULES));

  const hasUnsavedChanges = JSON.stringify(settings) !== JSON.stringify(savedSettings);

  const updateGeneral = useCallback((updates: Partial<GeneralSettings>) => {
    setSettings((s) => ({ ...s, general: { ...s.general, ...updates } }));
  }, []);

  const updateNotifications = useCallback((updates: Partial<NotificationSettings>) => {
    setSettings((s) => ({ ...s, notifications: { ...s.notifications, ...updates } }));
  }, []);

  const updateRenewals = useCallback((updates: Partial<RenewalSettings>) => {
    setSettings((s) => ({ ...s, renewals: { ...s.renewals, ...updates } }));
  }, []);

  const updateDownsell = useCallback((updates: Partial<DownsellSettings>) => {
    setSettings((s) => ({ ...s, downsell: { ...s.downsell, ...updates } }));
  }, []);

  const updateTeam = useCallback((updates: Partial<TeamSettings>) => {
    setSettings((s) => ({ ...s, team: { ...s.team, ...updates } }));
  }, []);

  const resetToDefaults = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    setSavedSettings(DEFAULT_SETTINGS);
    setSlaRulesState(DEFAULT_SLA_RULES);
    saveToStorage(STORAGE_KEY_SETTINGS, DEFAULT_SETTINGS);
    saveToStorage(STORAGE_KEY_SLA, DEFAULT_SLA_RULES);
    localStorage.removeItem(STORAGE_KEY_LAST_SAVED);
    setLastSaved(null);
  }, []);

  const saveSettings = useCallback(() => {
    const now = new Date();
    setSavedSettings({ ...settings });
    setLastSaved(now);
    saveToStorage(STORAGE_KEY_SETTINGS, settings);
    saveToStorage(STORAGE_KEY_LAST_SAVED, now.toISOString());
  }, [settings]);

  const setSlaRules = useCallback((rules: SLARule[]) => {
    setSlaRulesState(rules);
    saveToStorage(STORAGE_KEY_SLA, rules);
  }, []);

  return (
    <AdminSettingsContext.Provider
      value={{
        settings,
        updateGeneral,
        updateNotifications,
        updateRenewals,
        updateDownsell,
        updateTeam,
        resetToDefaults,
        hasUnsavedChanges,
        saveSettings,
        lastSaved,
        slaRules,
        setSlaRules,
      }}
    >
      {children}
    </AdminSettingsContext.Provider>
  );
}
