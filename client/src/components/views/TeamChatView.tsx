/*
 * TeamChatView — Internal collaboration chat with channels, Q&A tagging, and KB linking
 * Features: channel sidebar, real-time messaging, question threads, KB article suggestions
 * Warm adaptive theme
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  MessageSquare, Send, Hash, Users, Search, Pin, Star,
  HelpCircle, Lightbulb, ChevronRight, X, Plus, AtSign,
  Paperclip, Smile, BookOpen, CheckCircle2, Clock, ThumbsUp,
  ArrowRight, Bell, BellOff, MoreHorizontal, User,
} from "lucide-react";

/* ── Types ──────────────────────────────────────────────────── */
interface Channel {
  id: string;
  name: string;
  icon: "hash" | "users" | "help" | "star";
  unread: number;
  description: string;
}

interface ChatMessage {
  id: string;
  author: string;
  authorRole: string;
  avatar: string;
  content: string;
  timestamp: string;
  isQuestion?: boolean;
  isPinned?: boolean;
  reactions: { emoji: string; count: number; reacted: boolean }[];
  thread?: { count: number; lastReply: string };
  kbLink?: { id: string; title: string };
}

interface ThreadMessage {
  id: string;
  author: string;
  authorRole: string;
  avatar: string;
  content: string;
  timestamp: string;
  isAnswer?: boolean;
  upvotes: number;
}

/* ── Mock Data ──────────────────────────────────────────────── */
const CHANNELS: Channel[] = [
  { id: "general", name: "general", icon: "hash", unread: 3, description: "General team discussion and announcements" },
  { id: "support-help", name: "support-help", icon: "help", unread: 5, description: "Ask support questions and share troubleshooting tips" },
  { id: "sales-strategy", name: "sales-strategy", icon: "hash", unread: 0, description: "Sales tactics, objection handling, and deal strategy" },
  { id: "account-mgmt", name: "account-mgmt", icon: "users", unread: 2, description: "Account management best practices and QBR prep" },
  { id: "product-updates", name: "product-updates", icon: "star", unread: 1, description: "Latest product updates and feature releases" },
  { id: "wins-celebrations", name: "wins-celebrations", icon: "star", unread: 0, description: "Share wins, closed deals, and team celebrations" },
];

const TEAM_MEMBERS = [
  { name: "Jordan Davis", role: "Sales Director", status: "online" },
  { name: "Sarah Chen", role: "Sr. Support Engineer", status: "online" },
  { name: "Marcus Lin", role: "Sr. Account Manager", status: "away" },
  { name: "Priya Nair", role: "Salesforce Lead", status: "online" },
  { name: "Dana Reyes", role: "VP Customer Success", status: "offline" },
  { name: "Tom Hargrove", role: "HubSpot Specialist", status: "online" },
  { name: "Sofia Ruiz", role: "Account Executive", status: "away" },
  { name: "Alex Rivera", role: "RevOps Director", status: "online" },
];

const CHANNEL_MESSAGES: Record<string, ChatMessage[]> = {
  "general": [
    {
      id: "m1", author: "Dana Reyes", authorRole: "VP Customer Success", avatar: "DR",
      content: "Team — reminder that our Q2 planning session is this Thursday at 2 PM. Please come prepared with your top 3 priorities for the quarter.",
      timestamp: "9:15 AM", isPinned: true, reactions: [{ emoji: "👍", count: 6, reacted: false }, { emoji: "📅", count: 3, reacted: false }], thread: { count: 4, lastReply: "10:22 AM" },
    },
    {
      id: "m2", author: "Alex Rivera", authorRole: "RevOps Director", avatar: "AR",
      content: "Just pushed the updated pipeline dashboard. The new forecasting model is now live — accuracy improved by 12% based on last quarter's data. Check it out and let me know if anything looks off.",
      timestamp: "10:45 AM", reactions: [{ emoji: "🚀", count: 4, reacted: true }, { emoji: "🎉", count: 2, reacted: false }],
    },
    {
      id: "m3", author: "Jordan Davis", authorRole: "Sales Director", avatar: "JD",
      content: "Great work on the Driftwood Capital upsell everyone. That's a $36K expansion — our biggest this quarter. Tom and Sofia, excellent teamwork on the proposal.",
      timestamp: "11:30 AM", reactions: [{ emoji: "🎉", count: 8, reacted: true }, { emoji: "💪", count: 5, reacted: false }, { emoji: "🏆", count: 3, reacted: false }],
    },
  ],
  "support-help": [
    {
      id: "s1", author: "Sarah Chen", authorRole: "Sr. Support Engineer", avatar: "SC",
      content: "Has anyone seen the multi-currency revenue recognition error in NetSuite before? BlueWave Logistics is hitting it on every invoice batch. I've checked the exchange rate tables but they look complete.",
      timestamp: "8:30 AM", isQuestion: true, reactions: [{ emoji: "👀", count: 2, reacted: false }],
      thread: { count: 7, lastReply: "9:45 AM" },
      kbLink: { id: "KB-001", title: "Resolving Multi-Currency Revenue Recognition Errors in NetSuite" },
    },
    {
      id: "s2", author: "Tom Hargrove", authorRole: "HubSpot Specialist", avatar: "TH",
      content: "Quick tip for anyone dealing with HubSpot sequence triggers not firing: always check if the contacts have been previously unenrolled. HubSpot won't re-enroll them automatically even if they match the criteria again. You need to manually re-enroll or create a new sequence.",
      timestamp: "9:15 AM", reactions: [{ emoji: "💡", count: 5, reacted: false }, { emoji: "🙏", count: 3, reacted: false }],
      kbLink: { id: "KB-006", title: "HubSpot Email Sequence Troubleshooting — Triggers Not Firing" },
    },
    {
      id: "s3", author: "Priya Nair", authorRole: "Salesforce Lead", avatar: "PN",
      content: "Anyone have experience with Apex trigger CPU limits on large batches? Driftwood Capital's opportunity trigger is timing out on batches over 150 records. I suspect it's the SOQL in the loop but want to confirm before refactoring.",
      timestamp: "10:00 AM", isQuestion: true, reactions: [{ emoji: "🤔", count: 2, reacted: false }],
      thread: { count: 5, lastReply: "11:30 AM" },
      kbLink: { id: "KB-004", title: "Salesforce Apex Trigger CPU Limit Optimization" },
    },
  ],
  "sales-strategy": [
    {
      id: "ss1", author: "Jordan Davis", authorRole: "Sales Director", avatar: "JD",
      content: "Team — I've updated the competitive positioning guide with new data on Competitor X's pricing changes. Key takeaway: they raised prices 15% but didn't add features. This is a huge opening for us on deals where pricing is the main objection.",
      timestamp: "8:00 AM", isPinned: true, reactions: [{ emoji: "🎯", count: 4, reacted: false }],
      kbLink: { id: "KB-003", title: "Handling 'Your Pricing Is Too High' Objection" },
    },
    {
      id: "ss2", author: "Sofia Ruiz", authorRole: "Account Executive", avatar: "SR",
      content: "What's the best approach for the initial upsell conversation with a Gold tier account that's been stable for 6+ months? I don't want to come across as pushy but Apex Manufacturing is showing all the expansion signals.",
      timestamp: "9:30 AM", isQuestion: true, reactions: [{ emoji: "👀", count: 3, reacted: false }],
      thread: { count: 6, lastReply: "10:45 AM" },
      kbLink: { id: "KB-008", title: "Upsell Discovery Framework — Identifying Expansion Signals" },
    },
    {
      id: "ss3", author: "Marcus Lin", authorRole: "Sr. Account Manager", avatar: "ML",
      content: "Pro tip from today's call with ClearPath Retail: when they say 'we need to think about it,' ask 'what specific information would help you make a decision?' — it reframes the conversation from stalling to problem-solving. Worked perfectly today.",
      timestamp: "2:15 PM", reactions: [{ emoji: "💡", count: 6, reacted: true }, { emoji: "📝", count: 4, reacted: false }],
    },
  ],
  "account-mgmt": [
    {
      id: "am1", author: "Marcus Lin", authorRole: "Sr. Account Manager", avatar: "ML",
      content: "Heads up — Edgeline Foods health score dropped to 54 this week. I'm initiating the at-risk recovery protocol. If anyone has a good relationship with Sofia Ruiz (their contact), please reach out to help smooth things over.",
      timestamp: "8:45 AM", reactions: [{ emoji: "⚠️", count: 3, reacted: false }],
      thread: { count: 3, lastReply: "9:30 AM" },
      kbLink: { id: "KB-002", title: "At-Risk Account Recovery: 30-Day Turnaround Playbook" },
    },
    {
      id: "am2", author: "Dana Reyes", authorRole: "VP Customer Success", avatar: "DR",
      content: "QBR season is coming up. I've updated the preparation checklist with lessons learned from last quarter. The biggest improvement: sending the agenda preview 3 days before instead of 1 day. Executive attendance went up 40%.",
      timestamp: "10:00 AM", isPinned: true, reactions: [{ emoji: "📋", count: 5, reacted: false }, { emoji: "🎯", count: 3, reacted: false }],
      kbLink: { id: "KB-005", title: "QBR Preparation Checklist — Maximizing Executive Impact" },
    },
  ],
  "product-updates": [
    {
      id: "pu1", author: "Alex Rivera", authorRole: "RevOps Director", avatar: "AR",
      content: "🆕 New feature: AI-assisted pipeline forecasting is now available in the Pipeline Analyst tool. It uses historical deal data to predict close probability with 87% accuracy. Give it a try and share your feedback!",
      timestamp: "9:00 AM", isPinned: true, reactions: [{ emoji: "🚀", count: 7, reacted: false }, { emoji: "🤖", count: 4, reacted: false }],
    },
  ],
  "wins-celebrations": [
    {
      id: "w1", author: "Tom Hargrove", authorRole: "HubSpot Specialist", avatar: "TH",
      content: "🏆 ClearPath Retail just renewed for another year AND added the advanced analytics module. That's a 22% expansion on a Bronze account! Proof that consistent support drives growth.",
      timestamp: "3:00 PM", reactions: [{ emoji: "🎉", count: 9, reacted: true }, { emoji: "🏆", count: 6, reacted: false }, { emoji: "💰", count: 4, reacted: false }],
    },
  ],
};

const THREAD_MESSAGES: Record<string, ThreadMessage[]> = {
  "s1": [
    { id: "t1", author: "Priya Nair", authorRole: "Salesforce Lead", avatar: "PN", content: "I've seen this before. Check if there are any exchange rates with overlapping date ranges — NetSuite gets confused when two rates cover the same period for the same currency pair.", timestamp: "8:45 AM", upvotes: 8, isAnswer: false },
    { id: "t2", author: "Tom Hargrove", authorRole: "HubSpot Specialist", avatar: "TH", content: "Also worth checking the Currency Conversion Method setting. If it's set to 'Average Rate' instead of 'Transaction Date Rate', multi-currency invoices can throw errors when the average rate table has gaps.", timestamp: "9:00 AM", upvotes: 12, isAnswer: true },
    { id: "t3", author: "Sarah Chen", authorRole: "Sr. Support Engineer", avatar: "SC", content: "That was it! The Currency Conversion Method was set to Average Rate. Changed it to Transaction Date Rate and the batch processed successfully. I'll update the KB article with this finding. Thanks everyone! 🎉", timestamp: "9:45 AM", upvotes: 5, isAnswer: false },
  ],
  "s3": [
    { id: "t4", author: "Alex Rivera", authorRole: "RevOps Director", avatar: "AR", content: "Classic bulkification issue. Look for any SOQL queries inside the trigger's for loop. Move them outside and use a Map to store the results.", timestamp: "10:15 AM", upvotes: 7, isAnswer: false },
    { id: "t5", author: "Sarah Chen", authorRole: "Sr. Support Engineer", avatar: "SC", content: "Also check if there's a recursive trigger pattern. If the trigger updates the same object it's triggered on, it can cascade and eat up CPU time. Use a static variable to prevent re-entry.", timestamp: "10:30 AM", upvotes: 10, isAnswer: true },
    { id: "t6", author: "Priya Nair", authorRole: "Salesforce Lead", avatar: "PN", content: "Found it — there were 3 SOQL queries inside the loop AND a recursive trigger. Refactored to use collections and added the static guard. Batch of 200 records now processes in 2 seconds instead of timing out. KB article updated!", timestamp: "11:30 AM", upvotes: 15, isAnswer: false },
  ],
  "ss2": [
    { id: "t7", author: "Jordan Davis", authorRole: "Sales Director", avatar: "JD", content: "Don't frame it as an upsell. Frame it as a 'strategic planning session' where you review their goals and see how the platform can better support them. The expansion conversation happens naturally.", timestamp: "9:45 AM", upvotes: 11, isAnswer: true },
    { id: "t8", author: "Marcus Lin", authorRole: "Sr. Account Manager", avatar: "ML", content: "Agree with Jordan. Also, lead with the data — show them their usage trends and where they're approaching limits. Let them connect the dots themselves. Much more effective than pitching features.", timestamp: "10:15 AM", upvotes: 9, isAnswer: false },
    { id: "t9", author: "Dana Reyes", authorRole: "VP Customer Success", avatar: "DR", content: "One more thing: check the KB article on expansion signals. Apex Manufacturing scores high on 4 out of 5 signals. That's strong enough to justify a direct conversation. You won't come across as pushy with that data backing you up.", timestamp: "10:45 AM", upvotes: 7, isAnswer: false },
  ],
};

const channelIconMap: Record<string, React.ElementType> = {
  hash: Hash,
  users: Users,
  help: HelpCircle,
  star: Star,
};

const statusColors: Record<string, string> = {
  online: "bg-emerald-600",
  away: "bg-amber-500",
  offline: "bg-muted-foreground/30",
};

/* ── Main Component ─────────────────────────────────────────── */
export default function TeamChatView() {
  const [activeChannel, setActiveChannel] = useState("general");
  const [message, setMessage] = useState("");
  const [showThread, setShowThread] = useState<string | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const [localMessages, setLocalMessages] = useState<Record<string, ChatMessage[]>>(CHANNEL_MESSAGES);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const channel = CHANNELS.find((c) => c.id === activeChannel)!;
  const messages = localMessages[activeChannel] || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, activeChannel]);

  const handleSend = useCallback(() => {
    if (!message.trim()) return;
    const isQuestion = message.includes("?");
    const newMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      author: "You",
      authorRole: "Team Member",
      avatar: "YO",
      content: message,
      timestamp: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true }),
      isQuestion,
      reactions: [],
    };
    setLocalMessages((prev) => ({
      ...prev,
      [activeChannel]: [...(prev[activeChannel] || []), newMsg],
    }));
    setMessage("");
  }, [message, activeChannel]);

  const handleReaction = useCallback((msgId: string, emoji: string) => {
    setLocalMessages((prev) => {
      const channelMsgs = prev[activeChannel] || [];
      return {
        ...prev,
        [activeChannel]: channelMsgs.map((m) => {
          if (m.id !== msgId) return m;
          const existing = m.reactions.find((r) => r.emoji === emoji);
          if (existing) {
            return {
              ...m,
              reactions: m.reactions.map((r) =>
                r.emoji === emoji
                  ? { ...r, count: r.reacted ? r.count - 1 : r.count + 1, reacted: !r.reacted }
                  : r
              ),
            };
          }
          return { ...m, reactions: [...m.reactions, { emoji, count: 1, reacted: true }] };
        }),
      };
    });
  }, [activeChannel]);

  return (
    <div className="flex h-[calc(100vh-120px)] gap-0 -m-6">
      {/* Channel sidebar */}
      <motion.div
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-60 border-r border-border bg-sidebar/50 flex flex-col shrink-0"
      >
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Team Chat</h3>
          </div>
          <p className="text-[10px] text-muted-foreground">Collaborate and share knowledge</p>
        </div>

        <div className="flex-1 overflow-auto py-2">
          <div className="px-3 mb-2">
            <span className="text-[10px] tracking-[0.1em] uppercase text-muted-foreground/50 font-medium">Channels</span>
          </div>
          {CHANNELS.map((ch) => {
            const Icon = channelIconMap[ch.icon];
            const isActive = activeChannel === ch.id;
            return (
              <button
                key={ch.id}
                onClick={() => { setActiveChannel(ch.id); setShowThread(null); }}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-all",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/20"
                )}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{ch.name}</span>
                {ch.unread > 0 && (
                  <span className="ml-auto w-5 h-5 rounded-full bg-primary text-foreground text-[10px] font-bold flex items-center justify-center shrink-0">
                    {ch.unread}
                  </span>
                )}
              </button>
            );
          })}

          <div className="px-3 mt-4 mb-2">
            <span className="text-[10px] tracking-[0.1em] uppercase text-muted-foreground/50 font-medium">Team ({TEAM_MEMBERS.length})</span>
          </div>
          {TEAM_MEMBERS.map((member) => (
            <div key={member.name} className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground">
              <div className="relative">
                <div className="w-6 h-6 rounded-full bg-muted/40 flex items-center justify-center text-[9px] font-bold text-muted-foreground">
                  {member.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div className={cn("absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-sidebar/50", statusColors[member.status])} />
              </div>
              <div className="truncate">
                <div className="text-[11px] text-foreground/70 truncate">{member.name}</div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Channel header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="h-14 border-b border-border flex items-center px-5 gap-3 shrink-0"
        >
          <Hash className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">{channel.name}</span>
          <span className="text-[11px] text-muted-foreground/50 hidden sm:block">{channel.description}</span>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setShowMembers(!showMembers)}
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center transition-all border",
                showMembers ? "border-primary/30 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              <Users className="w-4 h-4" />
            </button>
          </div>
        </motion.div>

        {/* Messages area */}
        <div className="flex-1 overflow-auto px-5 py-4 space-y-4">
          <AnimatePresence>
            {messages.map((msg, i) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className={cn(
                  "group flex gap-3 rounded-xl p-3 -mx-2 transition-colors hover:bg-muted/10",
                  msg.isPinned && "border-l-2 border-amber-400/40 pl-4"
                )}
              >
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/60 to-primary/50 flex items-center justify-center text-foreground text-[11px] font-bold shrink-0">
                  {msg.avatar}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Author line */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[13px] font-semibold text-foreground">{msg.author}</span>
                    <span className="text-[10px] text-muted-foreground/40">{msg.authorRole}</span>
                    <span className="text-[10px] text-muted-foreground/30 font-mono">{msg.timestamp}</span>
                    {msg.isPinned && <Pin className="w-3 h-3 text-amber-600/60" />}
                    {msg.isQuestion && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-medium">
                        QUESTION
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <p className="text-[13px] text-foreground/80 leading-relaxed whitespace-pre-wrap">{msg.content}</p>

                  {/* KB Link */}
                  {msg.kbLink && (
                    <div className="mt-2 flex items-center gap-2 rounded-lg bg-amber-500/[0.05] border border-amber-400/15 px-3 py-2">
                      <BookOpen className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="text-[11px] text-amber-600/80 truncate">KB: {msg.kbLink.title}</span>
                      <ArrowRight className="w-3 h-3 text-amber-600/40 shrink-0 ml-auto" />
                    </div>
                  )}

                  {/* Reactions */}
                  {msg.reactions.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      {msg.reactions.map((r) => (
                        <button
                          key={r.emoji}
                          onClick={() => handleReaction(msg.id, r.emoji)}
                          className={cn(
                            "flex items-center gap-1 h-6 px-2 rounded-full text-[11px] border transition-all",
                            r.reacted
                              ? "border-primary/30 bg-primary/10"
                              : "border-border bg-card/50 hover:border-muted-foreground/30"
                          )}
                        >
                          <span>{r.emoji}</span>
                          <span className="font-medium">{r.count}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Thread indicator */}
                  {msg.thread && (
                    <button
                      onClick={() => setShowThread(showThread === msg.id ? null : msg.id)}
                      className={cn(
                        "mt-2 flex items-center gap-2 text-[11px] font-medium transition-all rounded-lg px-2 py-1 -mx-2",
                        showThread === msg.id
                          ? "text-primary bg-primary/10"
                          : "text-primary/70 hover:text-primary hover:bg-primary/5"
                      )}
                    >
                      <MessageSquare className="w-3 h-3" />
                      {msg.thread.count} replies
                      <span className="text-muted-foreground/30">· Last reply {msg.thread.lastReply}</span>
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Message input */}
        <div className="p-4 border-t border-border">
          <div className="flex items-end gap-2 rounded-xl border border-border bg-card p-2 focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={`Message #${channel.name}... (questions auto-tagged with ?)`}
              rows={1}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/30 resize-none focus:outline-none min-h-[36px] max-h-[120px] py-1.5 px-2"
            />
            <div className="flex items-center gap-1 shrink-0">
              <button className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/20 transition-colors">
                <Paperclip className="w-4 h-4" />
              </button>
              <button className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/20 transition-colors">
                <AtSign className="w-4 h-4" />
              </button>
              <button
                onClick={handleSend}
                disabled={!message.trim()}
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                  message.trim()
                    ? "bg-gradient-to-r from-primary to-primary/70 text-foreground shadow-lg shadow-primary/20"
                    : "bg-muted/30 text-muted-foreground/30"
                )}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-2 px-2 text-[10px] text-muted-foreground/30">
            <span className="flex items-center gap-1"><HelpCircle className="w-3 h-3" />Messages ending with ? are auto-tagged as questions</span>
            <span>·</span>
            <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />Linked KB articles appear inline</span>
          </div>
        </div>
      </div>

      {/* Thread panel */}
      <AnimatePresence>
        {showThread && THREAD_MESSAGES[showThread] && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 360, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="border-l border-border bg-sidebar/30 flex flex-col overflow-hidden shrink-0"
          >
            <div className="h-14 border-b border-border flex items-center justify-between px-4 shrink-0">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Thread</span>
                <span className="text-[10px] text-muted-foreground/40">{THREAD_MESSAGES[showThread].length} replies</span>
              </div>
              <button
                onClick={() => setShowThread(null)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-4">
              {THREAD_MESSAGES[showThread].map((reply, i) => (
                <motion.div
                  key={reply.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={cn(
                    "flex gap-3 rounded-lg p-3",
                    reply.isAnswer && "border border-emerald-200 bg-emerald-600/[0.03]"
                  )}
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/50 to-primary/30 flex items-center justify-center text-foreground text-[9px] font-bold shrink-0">
                    {reply.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[12px] font-semibold text-foreground">{reply.author}</span>
                      <span className="text-[9px] text-muted-foreground/30 font-mono">{reply.timestamp}</span>
                      {reply.isAnswer && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-600/10 text-emerald-700 border border-emerald-200 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          BEST ANSWER
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-foreground/75 leading-relaxed">{reply.content}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <button className="flex items-center gap-1 text-[10px] text-muted-foreground/40 hover:text-primary transition-colors">
                        <ThumbsUp className="w-3 h-3" />
                        {reply.upvotes}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
