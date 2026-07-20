/*
 * Topbar — Light enterprise header with page title, search, notifications, avatar
 * Teal primary accent theme
 */
import { useState, useRef, useEffect } from "react";
import { Menu, LogOut } from "lucide-react";
import GlobalSearch from "@/components/GlobalSearch";
import NotificationCenter from "@/components/NotificationCenter";
import { useAdminSettings } from "@/contexts/AdminSettingsContext";
import { useAuth } from "@/contexts/AuthContext";
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
  const { user, logout } = useAuth();
  // Prefer the logged-in user; fall back to the settings profile (shared-code demo path).
  const displayName = user?.name || settings.general.userDisplayName || "Jordan Davis";
  const email = user?.email;
  const role = user?.role;
  const avatarUrl = user ? undefined : settings.general.userAvatarUrl;
  const initials = getInitials(displayName);
  const firstName = displayName.split(" ")[0];

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

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

      {/* User avatar + menu */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="flex items-center gap-2 rounded-full hover:bg-muted/40 pl-1 pr-2 py-1 transition-colors"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} className="w-8 h-8 rounded-full object-cover shrink-0 border border-border" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0">
              {initials}
            </div>
          )}
          <span className="text-sm font-medium text-foreground hidden md:block">{firstName}</span>
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-60 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-20">
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
                  {email && <p className="text-[11px] text-muted-foreground truncate">{email}</p>}
                </div>
              </div>
              {role && (
                <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary font-semibold">{role}</span>
              )}
            </div>
            <button
              onClick={() => { setMenuOpen(false); onNavigate("admin-settings" as NavId); }}
              className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-muted/40 transition-colors"
            >
              Profile & settings
            </button>
            <button
              onClick={() => { setMenuOpen(false); logout(); }}
              className="w-full flex items-center gap-2 text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-500/10 transition-colors border-t border-border"
            >
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
