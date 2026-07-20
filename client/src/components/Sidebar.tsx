/*
 * Sidebar — Grouped enterprise navigation with thin line-art icons
 * Light theme with teal primary accent
 */
import type { NavId } from "@/lib/data";
import { cn } from "@/lib/utils";
import { useAdminSettings } from "@/contexts/AdminSettingsContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Building2,
  Eye,
  TrendingUp,
  CalendarClock,
  Receipt,
  ShieldAlert,
  FolderKanban,
  LifeBuoy,
  Shield,
  Timer,
  Send,
  Megaphone,
  Star,
  StickyNote,
  MessageSquare,
  Bot,
  Library,
  BookOpen,
  BarChart3,
  Plug,
  Settings2,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

/* ── Grouped navigation structure ──────────────────────────── */
interface NavGroup {
  label?: string; // undefined = ungrouped top section
  items: { id: NavId; label: string; Icon: React.ElementType }[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { id: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
      { id: "accounts", label: "Accounts", Icon: Building2 },
      { id: "moment", label: "Moment in Time", Icon: Eye },
    ],
  },
  {
    label: "REVENUE",
    items: [
      { id: "pipeline", label: "Pipeline", Icon: TrendingUp },
      { id: "renewals", label: "Renewals", Icon: CalendarClock },
      { id: "ar", label: "AR Tracker", Icon: Receipt },
      { id: "downsell", label: "Downsell Mitigation", Icon: ShieldAlert },
    ],
  },
  {
    label: "DELIVERY",
    items: [
      { id: "projects", label: "Projects & Services", Icon: FolderKanban },
      { id: "support", label: "Support", Icon: LifeBuoy },
      { id: "sla-config", label: "SLA Config", Icon: Shield },
      { id: "sla-tracker", label: "SLA Tracker", Icon: Timer },
    ],
  },
  {
    label: "ENGAGEMENT",
    items: [
      { id: "outreach", label: "Engagement Hub", Icon: Megaphone },
      { id: "csat", label: "CSAT", Icon: Star },
      { id: "notes", label: "Notes", Icon: StickyNote },
      { id: "chat", label: "Team Chat", Icon: MessageSquare },
    ],
  },
  {
    label: "INTELLIGENCE",
    items: [
      { id: "ai", label: "AI Assistant", Icon: Bot },
      { id: "kb", label: "Knowledge Base", Icon: Library },
      { id: "playbooks", label: "Playbooks", Icon: BookOpen },
      { id: "reporting", label: "Reporting", Icon: BarChart3 },
    ],
  },
  {
    label: "CONFIGURATION",
    items: [
      { id: "integrations", label: "Integrations", Icon: Plug },
      { id: "admin-settings", label: "Admin Settings", Icon: Settings2 },
    ],
  },
];

interface SidebarProps {
  active: NavId;
  onNavigate: (id: NavId) => void;
  open: boolean;
  onToggle: () => void;
}

export default function Sidebar({ active, onNavigate, open, onToggle }: SidebarProps) {
  const { settings } = useAdminSettings();
  const firmName = settings.general.consultingFirmName || "Acme Consulting";

  return (
    <motion.aside
      initial={false}
      animate={{ width: open ? 240 : 64 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="relative flex flex-col border-r border-sidebar-border bg-sidebar shrink-0 z-20 h-screen"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-2">
        <AnimatePresence mode="wait">
          {open ? (
            <motion.div
              key="full-logo"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col min-w-0"
            >
              <div className="flex items-baseline gap-0 whitespace-nowrap">
                <span
                  className="text-[22px] tracking-tight text-foreground"
                  style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 700 }}
                >
                  Partner OS
                </span>
                <span
                  className="text-[22px] ml-1.5"
                  style={{
                    fontFamily: "'Playfair Display', Georgia, serif",
                    fontStyle: "italic",
                    fontWeight: 600,
                    color: "#B8922F",
                    letterSpacing: "-0.02em",
                  }}
                >
                  Ai
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap mt-0.5">
                {firmName}
              </span>
            </motion.div>
          ) : (
            <motion.div
              key="icon-logo"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="w-8 h-8 shrink-0 flex items-center justify-center"
            >
              <div className="flex items-baseline">
                <span className="text-[16px] font-bold tracking-tight text-foreground" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>P</span>
                <span className="text-[14px]" style={{ fontFamily: "'Playfair Display', Georgia, serif", fontStyle: "italic", fontWeight: 600, color: "#B8922F" }}>ai</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-0 px-2 pt-2 overflow-y-auto">
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi}>
            {/* Section header / divider */}
            {group.label && (
              <AnimatePresence>
                {open ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="px-3 pt-4 pb-1.5"
                  >
                    <div className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground/70 uppercase">
                      {group.label}
                    </div>
                  </motion.div>
                ) : (
                  <div className="mx-3 my-2 border-t border-sidebar-border" />
                )}
              </AnimatePresence>
            )}

            {/* Nav items */}
            {group.items.map((item) => {
              const isActive = active === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-md text-[13px] font-medium transition-all duration-150 w-full",
                    open ? "px-3 py-2" : "px-0 py-2 justify-center",
                    isActive
                      ? "text-sidebar-accent-foreground bg-sidebar-accent"
                      : "text-sidebar-foreground hover:text-foreground hover:bg-muted/60"
                  )}
                >
                  {/* Active indicator — teal left bar */}
                  {isActive && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-sidebar-primary"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <item.Icon
                    className={cn(
                      "w-[18px] h-[18px] shrink-0 stroke-[1.5]",
                      isActive ? "text-sidebar-primary" : "text-sidebar-foreground"
                    )}
                  />
                  <AnimatePresence>
                    {open && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.15 }}
                        className="whitespace-nowrap overflow-hidden"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="mx-3 mb-4 mt-2 flex items-center justify-center gap-2 rounded-md py-2 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
      >
        {open ? <ChevronsLeft className="w-4 h-4" /> : <ChevronsRight className="w-4 h-4" />}
      </button>
    </motion.aside>
  );
}
