/*
 * Notification Center — Bell icon dropdown with categorized alerts,
 * mark-as-read, dismiss, and settings. Simulates real-time SLA breach
 * alerts, health score changes, ticket assignments, and chat mentions.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, X, Check, CheckCheck, Settings, AlertTriangle, Clock,
  MessageSquare, TrendingDown, UserPlus, FileText, Shield,
  ChevronRight, Filter, Volume2, VolumeX, ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";

/* ─── Types ─── */
export type NotifCategory = "sla" | "health" | "ticket" | "chat" | "system" | "downsell";

export interface Notification {
  id: string;
  category: NotifCategory;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  dismissed: boolean;
  priority: "critical" | "high" | "medium" | "low";
  actionLabel?: string;
  actionTarget?: string;
}

/* ─── Category Config ─── */
const CATEGORY_CONFIG: Record<NotifCategory, { icon: React.ElementType; label: string; color: string; bg: string }> = {
  sla: { icon: Clock, label: "SLA Alert", color: "text-red-600", bg: "bg-red-100" },
  health: { icon: TrendingDown, label: "Health", color: "text-amber-600", bg: "bg-amber-100" },
  ticket: { icon: FileText, label: "Ticket", color: "text-blue-600", bg: "bg-blue-100" },
  chat: { icon: MessageSquare, label: "Chat", color: "text-emerald-600", bg: "bg-emerald-100" },
  system: { icon: Shield, label: "System", color: "text-slate-600", bg: "bg-slate-100" },
  downsell: { icon: ShieldAlert, label: "Downsell Risk", color: "text-rose-600", bg: "bg-rose-100" },
};

const PRIORITY_DOT: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-amber-400",
  low: "bg-slate-400",
};

/* ─── Initial Notifications ─── */
const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: "n1", category: "sla", title: "SLA Breach Warning",
    message: "BlueWave Logistics T-1041 — Critical ticket approaching SLA breach in 15 minutes. Immediate action required.",
    timestamp: new Date(Date.now() - 3 * 60000), read: false, dismissed: false, priority: "critical",
    actionLabel: "View Ticket", actionTarget: "sla-tracker",
  },
  {
    id: "n2", category: "health", title: "Health Score Drop",
    message: "Edgeline Foods health score dropped from 62 to 54 (−8 points). Account is now flagged as At Risk.",
    timestamp: new Date(Date.now() - 18 * 60000), read: false, dismissed: false, priority: "high",
    actionLabel: "View Account", actionTarget: "accounts",
  },
  {
    id: "n3", category: "ticket", title: "New Ticket Assigned",
    message: "T-1042 assigned to you: Driftwood Capital — Apex trigger causing CPU limit on large opportunity batch.",
    timestamp: new Date(Date.now() - 35 * 60000), read: false, dismissed: false, priority: "medium",
    actionLabel: "View Ticket", actionTarget: "support",
  },
  {
    id: "n4", category: "chat", title: "Mention in #support-help",
    message: "@you — Has anyone dealt with NetSuite multi-currency reconciliation issues before? Need help ASAP.",
    timestamp: new Date(Date.now() - 52 * 60000), read: false, dismissed: false, priority: "medium",
    actionLabel: "View Chat", actionTarget: "chat",
  },
  {
    id: "n5", category: "sla", title: "SLA Escalated",
    message: "Apex Manufacturing T-1038 has been auto-escalated to Tier 2 support after exceeding 4-hour response SLA.",
    timestamp: new Date(Date.now() - 90 * 60000), read: true, dismissed: false, priority: "high",
    actionLabel: "View SLA", actionTarget: "sla-tracker",
  },
  {
    id: "n6", category: "system", title: "Integration Sync Complete",
    message: "Salesforce data sync completed successfully. 142 records updated, 3 conflicts resolved automatically.",
    timestamp: new Date(Date.now() - 120 * 60000), read: true, dismissed: false, priority: "low",
    actionLabel: "View Integrations", actionTarget: "integrations",
  },
  {
    id: "n7", category: "health", title: "QBR Reminder",
    message: "Apex Manufacturing QBR is scheduled for Apr 18. Preparation checklist is 60% complete.",
    timestamp: new Date(Date.now() - 180 * 60000), read: true, dismissed: false, priority: "low",
    actionLabel: "View Account", actionTarget: "accounts",
  },
  {
    id: "n8", category: "health", title: "Renewal Alert — Edgeline Foods",
    message: "License ends May 15 (31 days). Renewal risk is Critical with High downsell risk. Immediate action required — begin renewal negotiation now.",
    timestamp: new Date(Date.now() - 10 * 60000), read: false, dismissed: false, priority: "critical",
    actionLabel: "View Renewals", actionTarget: "renewals",
  },
  {
    id: "n9", category: "health", title: "Renewal Window — BlueWave Logistics",
    message: "BlueWave Logistics license ends Jun 15 (62 days). High renewal risk with potential downsell of Service Cloud module. Renewal discovery should begin immediately.",
    timestamp: new Date(Date.now() - 45 * 60000), read: false, dismissed: false, priority: "high",
    actionLabel: "View Renewals", actionTarget: "renewals",
  },
  {
    id: "n10", category: "system", title: "Renewal Approaching — Apex Manufacturing",
    message: "Apex Manufacturing license ends Jul 31 (108 days). Renewal discovery is in progress. Low risk — account health is strong at 92.",
    timestamp: new Date(Date.now() - 240 * 60000), read: true, dismissed: false, priority: "medium",
    actionLabel: "View Renewals", actionTarget: "renewals",
  },
  {
    id: "n11", category: "downsell", title: "Downsell Risk — BlueWave Logistics",
    message: "AI detected 4 high-severity signals: declining CSAT (6.2→5.8), 2 unresolved critical tickets, and reduced login frequency. Estimated $18K ARR at risk.",
    timestamp: new Date(Date.now() - 8 * 60000), read: false, dismissed: false, priority: "critical",
    actionLabel: "View Mitigation", actionTarget: "downsell",
  },
  {
    id: "n12", category: "downsell", title: "New Signal — Edgeline Foods",
    message: "Support ticket volume increased 3x in the past 30 days. Customer expressed frustration with implementation timeline during latest call.",
    timestamp: new Date(Date.now() - 25 * 60000), read: false, dismissed: false, priority: "high",
    actionLabel: "View Mitigation", actionTarget: "downsell",
  },
  {
    id: "n13", category: "downsell", title: "Mitigation Action Due — Driftwood Capital",
    message: "Executive QBR with Driftwood Capital is due in 3 days. Value demonstration deck has not been prepared. Risk of losing $12K in module renewals.",
    timestamp: new Date(Date.now() - 60 * 60000), read: false, dismissed: false, priority: "high",
    actionLabel: "View Mitigation", actionTarget: "downsell",
  },
];

/* ─── Time Formatter ─── */
function timeAgo(date: Date): string {
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/* ═══════════════════════════════════════════════════════════════
   NOTIFICATION CENTER COMPONENT
   ═══════════════════════════════════════════════════════════════ */
interface NotificationCenterProps {
  onNavigate: (id: string) => void;
}

export default function NotificationCenter({ onNavigate }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS);
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<NotifCategory | "all">("all");
  const [showSettings, setShowSettings] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [categories, setCategories] = useState<Record<NotifCategory, boolean>>({
    sla: true, health: true, ticket: true, chat: true, system: true, downsell: true,
  });
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read && !n.dismissed).length;
  const criticalCount = notifications.filter((n) => !n.read && !n.dismissed && n.priority === "critical").length;

  const filtered = notifications
    .filter((n) => !n.dismissed)
    .filter((n) => filter === "all" || n.category === filter)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  /* Simulate incoming notifications */
  useEffect(() => {
    const timer = setInterval(() => {
      const newNotifs: Notification[] = [
        {
          id: `sim-${Date.now()}`, category: "sla", title: "SLA Warning Update",
          message: "BlueWave Logistics T-1041 — SLA timer now at 92% elapsed. Escalation imminent.",
          timestamp: new Date(), read: false, dismissed: false, priority: "critical",
          actionLabel: "View SLA", actionTarget: "sla-tracker",
        },
      ];
      if (categories.sla) {
        setNotifications((prev) => [...newNotifs, ...prev].slice(0, 50));
        if (soundEnabled) {
          toast.warning("SLA Warning: BlueWave T-1041 approaching breach", {
            action: { label: "View", onClick: () => { onNavigate("sla-tracker"); setIsOpen(false); } },
          });
        }
      }
    }, 120000); // Every 2 minutes
    return () => clearInterval(timer);
  }, [categories.sla, soundEnabled, onNavigate]);

  /* Close on outside click */
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowSettings(false);
      }
    }
    if (isOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.success("All notifications marked as read");
  }, []);

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, dismissed: true } : n));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, dismissed: true })));
    toast.success("All notifications cleared");
  }, []);

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={() => { setIsOpen(!isOpen); setShowSettings(false); }}
        className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1 ${
              criticalCount > 0 ? "bg-red-500 animate-pulse" : "bg-primary"
            }`}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-[400px] max-h-[520px] bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button onClick={markAllRead} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors" title="Mark all read">
                  <CheckCheck className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setShowSettings(!showSettings)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors" title="Settings">
                  <Settings className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Settings Panel */}
            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-b border-border overflow-hidden"
                >
                  <div className="px-4 py-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-foreground">Sound Alerts</span>
                      <button
                        onClick={() => setSoundEnabled(!soundEnabled)}
                        className={`p-1.5 rounded-md transition-colors ${soundEnabled ? "text-primary bg-primary/10" : "text-muted-foreground bg-muted"}`}
                      >
                        {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-foreground block mb-2">Categories</span>
                      <div className="grid grid-cols-2 gap-2">
                        {(Object.keys(categories) as NotifCategory[]).map((cat) => {
                          const cfg = CATEGORY_CONFIG[cat];
                          return (
                            <button
                              key={cat}
                              onClick={() => setCategories((p) => ({ ...p, [cat]: !p[cat] }))}
                              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors border ${
                                categories[cat]
                                  ? "border-primary/30 bg-primary/5 text-foreground"
                                  : "border-border bg-muted/30 text-muted-foreground line-through"
                              }`}
                            >
                              <cfg.icon className="w-3 h-3" />
                              {cfg.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Filter Chips */}
            <div className="flex items-center gap-1 px-4 py-2 border-b border-border overflow-x-auto">
              <button
                onClick={() => setFilter("all")}
                className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors whitespace-nowrap ${
                  filter === "all" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"
                }`}
              >
                All
              </button>
              {(Object.keys(CATEGORY_CONFIG) as NotifCategory[]).map((cat) => {
                const cfg = CATEGORY_CONFIG[cat];
                const count = notifications.filter((n) => !n.dismissed && n.category === cat && !n.read).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setFilter(cat)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors whitespace-nowrap ${
                      filter === cat ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {cfg.label}
                    {count > 0 && <span className="text-[9px] opacity-60">({count})</span>}
                  </button>
                );
              })}
            </div>

            {/* Notification List */}
            <div className="overflow-y-auto max-h-[340px]">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Bell className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-xs">No notifications</p>
                </div>
              ) : (
                filtered.map((n) => {
                  const cfg = CATEGORY_CONFIG[n.category];
                  const Icon = cfg.icon;
                  return (
                    <motion.div
                      key={n.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8 }}
                      className={`group flex gap-3 px-4 py-3 border-b border-border/50 transition-colors cursor-pointer ${
                        !n.read ? "bg-primary/[0.03]" : "hover:bg-accent/30"
                      }`}
                      onClick={() => {
                        markAsRead(n.id);
                        if (n.actionTarget) {
                          onNavigate(n.actionTarget);
                          setIsOpen(false);
                        }
                      }}
                    >
                      {/* Icon */}
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.bg}`}>
                        <Icon className={`w-4 h-4 ${cfg.color}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          {!n.read && <div className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[n.priority]}`} />}
                          <span className={`text-xs font-semibold ${!n.read ? "text-foreground" : "text-muted-foreground"}`}>
                            {n.title}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">{n.message}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] text-muted-foreground/60">{timeAgo(n.timestamp)}</span>
                          {n.actionLabel && (
                            <span className="text-[10px] text-primary font-medium flex items-center gap-0.5">
                              {n.actionLabel} <ChevronRight className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        {!n.read && (
                          <button
                            onClick={(e) => { e.stopPropagation(); markAsRead(n.id); }}
                            className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            title="Mark as read"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); dismiss(n.id); }}
                          className="p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Dismiss"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            {filtered.length > 0 && (
              <div className="flex items-center justify-between px-4 py-2.5 border-t border-border">
                <button
                  onClick={clearAll}
                  className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  Clear all
                </button>
                <span className="text-[10px] text-muted-foreground">
                  {filtered.length} notification{filtered.length !== 1 ? "s" : ""}
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
