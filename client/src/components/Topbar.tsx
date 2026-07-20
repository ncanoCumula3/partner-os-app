/*
 * Topbar — Light enterprise header with page title, search, notifications, avatar
 * Teal primary accent theme
 */
import { Menu, Bell } from "lucide-react";
import GlobalSearch from "@/components/GlobalSearch";
import NotificationCenter from "@/components/NotificationCenter";
import { useAdminSettings } from "@/contexts/AdminSettingsContext";
import type { NavId } from "@/lib/data";

interface TopbarProps {
  onToggleSidebar: () => void;
  active: NavId;
  onNavigate: (id: NavId) => void;
}

const pageTitle: Record<string, string> = {
  dashboard: "Dashboard",
  accounts: "Accounts",
  moment: "Moment in Time",
  pipeline: "Pipeline",
  projects: "Projects & Services",
  support: "Support",
  outreach: "Engagement Hub",
  csat: "CSAT",
  ar: "AR Tracker",
  playbooks: "Playbooks",
  ai: "AI Assistant",
  chat: "Team Chat",
  kb: "Knowledge Base",
  "sla-config": "SLA Configuration",
  "sla-tracker": "SLA Tracker",
  notes: "Notes",
  renewals: "Renewal Tracker",
  downsell: "Downsell Mitigation",
  reporting: "Reporting",
  integrations: "Integrations",
  "admin-settings": "Admin Settings",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function Topbar({ onToggleSidebar, active, onNavigate }: TopbarProps) {
  const { settings } = useAdminSettings();
  const displayName = settings.general.userDisplayName || "Jordan Davis";
  const avatarUrl = settings.general.userAvatarUrl;
  const initials = getInitials(displayName);
  const firstName = displayName.split(" ")[0];

  return (
    <header className="sticky top-0 z-10 flex items-center h-14 border-b border-border bg-white/80 backdrop-blur-md px-6 gap-4">
      <button
        onClick={onToggleSidebar}
        className="text-muted-foreground hover:text-foreground transition-colors p-1"
      >
        <Menu className="w-5 h-5" />
      </button>

      <h2 className="text-[15px] font-semibold text-foreground tracking-tight hidden sm:block">
        {pageTitle[active] || "Dashboard"}
      </h2>

      <div className="flex-1" />

      <GlobalSearch onNavigate={onNavigate} />

      <div className="flex-1" />

      <NotificationCenter onNavigate={(id) => onNavigate(id as NavId)} />

      {/* User avatar */}
      <div className="flex items-center gap-2">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="w-8 h-8 rounded-full object-cover shrink-0 border border-border"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0">
            {initials}
          </div>
        )}
        <span className="text-sm font-medium text-foreground hidden md:block">{firstName}</span>
      </div>
    </header>
  );
}
