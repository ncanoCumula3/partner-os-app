/*
 * AccountsView — account list with search, dropdown filters, sortable columns, and detail panel
 * Filters: Tier (Gold/Silver/Bronze), Stage (Expansion/At Risk/Stable/Upsell Ready)
 * Sortable: Name, Tier, Health, ARR
 * Click row → opens AccountDetailPanel side sheet
 * Warm adaptive theme
 */
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ACCOUNTS, healthColor, tierColors, statusColors,
  customerTypeColors, daysUntilLED, getLEDUrgency, formatLEDDate,
  ledUrgencyColors, ledUrgencyLabels,
} from "@/lib/data";
import type { Account, CustomerType, LEDUrgency } from "@/lib/data";
import { cn } from "@/lib/utils";
import {
  User, Calendar, Search, X, ArrowUp, ArrowDown, ArrowUpDown,
  ChevronDown, Filter, RotateCcw, ChevronRight, CalendarClock, Eye,
} from "lucide-react";
import AccountDetailPanel from "@/components/AccountDetailPanel";

const ACCOUNTS_BG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663541486288/dhFsWnKJaddWAqADhMbet7/accounts-visual-LcJgwXnhqLQ4tmJQaPF7td.webp";

/* ── Sort types ─────────────────────────────────────────────── */
type SortKey = "name" | "tier" | "health" | "arr" | "led";
type SortDir = "asc" | "desc";
const TIER_ORDER: Record<string, number> = { Gold: 3, Silver: 2, Bronze: 1 };

interface ColumnDef { key: SortKey | null; label: string }
const columns: ColumnDef[] = [
  { key: "name", label: "Account" },
  { key: null, label: "Type" },
  { key: "tier", label: "Tier" },
  { key: "health", label: "Health" },
  { key: "arr", label: "ARR" },
  { key: "led", label: "License End" },
  { key: null, label: "Stage" },
  { key: null, label: "" },
];

function compareFn(a: Account, b: Account, key: SortKey, dir: SortDir): number {
  let cmp = 0;
  switch (key) {
    case "name":   cmp = a.name.localeCompare(b.name); break;
    case "tier":   cmp = (TIER_ORDER[a.tier] ?? 0) - (TIER_ORDER[b.tier] ?? 0); break;
    case "health": cmp = a.health - b.health; break;
    case "arr":    cmp = a.arr - b.arr; break;
    case "led": {
      const daysA = a.saasLicense ? daysUntilLED(a.saasLicense.licenseEndDate) : 9999;
      const daysB = b.saasLicense ? daysUntilLED(b.saasLicense.licenseEndDate) : 9999;
      cmp = daysA - daysB;
      break;
    }
  }
  return dir === "asc" ? cmp : -cmp;
}

/* ── Derive unique filter options from data ─────────────────── */
const TIER_OPTIONS = Array.from(new Set(ACCOUNTS.map((a) => a.tier)));
const STAGE_OPTIONS = Array.from(new Set(ACCOUNTS.map((a) => a.stage)));
const TYPE_OPTIONS: CustomerType[] = ["SaaS", "Services", "Hybrid"];

/* ── Dropdown chip component ────────────────────────────────── */
interface DropdownFilterProps {
  label: string;
  options: string[];
  selected: string | null;
  onSelect: (val: string | null) => void;
  colorMap?: Record<string, string>;
}

function DropdownFilter({ label, options, selected, onSelect, colorMap }: DropdownFilterProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const isActive = selected !== null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-1.5 h-8 px-3 rounded-lg border text-xs font-medium transition-all",
          isActive
            ? "border-primary/50 bg-primary/10 text-primary"
            : "border-border bg-card text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground"
        )}
      >
        <Filter className="w-3 h-3" />
        <span>{label}{isActive ? `: ${selected}` : ""}</span>
        <ChevronDown className={cn("w-3 h-3 transition-transform", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-1.5 z-50 min-w-[160px] rounded-lg border border-border bg-popover shadow-xl shadow-black/10 overflow-hidden"
          >
            <button
              type="button"
              onClick={() => { onSelect(null); setOpen(false); }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors text-left",
                selected === null
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              )}
            >
              <span className="w-2 h-2 rounded-full bg-muted-foreground/30" />
              All {label}s
            </button>

            {options.map((opt) => {
              const active = selected === opt;
              const chipClass = colorMap?.[opt];
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => { onSelect(active ? null : opt); setOpen(false); }}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors text-left",
                    active
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                  )}
                >
                  {chipClass ? (
                    <span className={cn("text-[9px] px-1.5 py-px rounded border font-medium", chipClass)}>
                      {opt}
                    </span>
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/50" />
                  )}
                  {!chipClass && opt}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────── */
export default function AccountsView({ onNavigateToMoment }: { onNavigateToMoment?: (id: number) => void }) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [tierFilter, setTierFilter] = useState<string | null>(null);
  const [stageFilter, setStageFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  // Detail panel state
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const openDetail = useCallback((acc: Account) => {
    setSelectedAccount(acc);
    setPanelOpen(true);
  }, []);

  const handleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        if (sortDir === "asc") setSortDir("desc");
        else { setSortKey(null); setSortDir("asc"); }
      } else {
        setSortKey(key);
        setSortDir("asc");
      }
    },
    [sortKey, sortDir]
  );

  const hasAnyFilter = query.trim() || tierFilter || stageFilter || typeFilter || sortKey;

  const clearAll = useCallback(() => {
    setQuery("");
    setTierFilter(null);
    setStageFilter(null);
    setTypeFilter(null);
    setSortKey(null);
    setSortDir("asc");
  }, []);

  const processed = useMemo(() => {
    let list = [...ACCOUNTS];
    if (tierFilter) list = list.filter((a) => a.tier === tierFilter);
    if (stageFilter) list = list.filter((a) => a.stage === stageFilter);
    if (typeFilter) list = list.filter((a) => a.customerType === typeFilter);
    if (query.trim()) {
      const q = query.toLowerCase().trim();
      list = list.filter(
        (acc) =>
          acc.name.toLowerCase().includes(q) ||
          acc.contact.toLowerCase().includes(q) ||
          acc.platform.toLowerCase().includes(q) ||
          acc.tier.toLowerCase().includes(q) ||
          acc.stage.toLowerCase().includes(q) ||
          acc.next.toLowerCase().includes(q) ||
          String(acc.arr).includes(q) ||
          String(acc.health).includes(q)
      );
    }
    if (sortKey) list.sort((a, b) => compareFn(a, b, sortKey, sortDir));
    return list;
  }, [query, sortKey, sortDir, tierFilter, stageFilter, typeFilter]);

  const SortIcon = ({ colKey }: { colKey: SortKey }) => {
    if (sortKey !== colKey)
      return <ArrowUpDown className="w-3 h-3 text-muted-foreground/40 group-hover/hdr:text-muted-foreground transition-colors" />;
    return sortDir === "asc"
      ? <ArrowUp className="w-3 h-3 text-primary" />
      : <ArrowDown className="w-3 h-3 text-primary" />;
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header with visual */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-2xl overflow-hidden border border-border h-32"
        >
          <div
            className="absolute inset-0 bg-cover bg-center opacity-20"
            style={{ backgroundImage: `url(${ACCOUNTS_BG})` }}
          />
          <div className="relative p-6 flex flex-col justify-end h-full">
            <h2 className="text-xl font-bold text-foreground">Accounts</h2>
            <p className="text-xs text-muted-foreground mt-1">
              {ACCOUNTS.length} managed accounts across{" "}
              {new Set(ACCOUNTS.map((a) => a.platform)).size} platforms
              <span className="text-muted-foreground/50 ml-2">· Click a row for details</span>
            </p>
          </div>
        </motion.div>

        {/* Search + Dropdown filters row */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="space-y-3"
        >
          {/* Search input */}
          <div className="relative flex items-center">
            <Search className="absolute left-4 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by name, contact, platform, tier, stage..."
              className="w-full h-11 pl-11 pr-10 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all"
            />
            <AnimatePresence>
              {query && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => setQuery("")}
                  className="absolute right-3 w-6 h-6 rounded-md bg-muted/60 hover:bg-muted flex items-center justify-center transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Dropdown filter chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <DropdownFilter
              label="Tier"
              options={TIER_OPTIONS}
              selected={tierFilter}
              onSelect={setTierFilter}
              colorMap={tierColors}
            />
            <DropdownFilter
              label="Stage"
              options={STAGE_OPTIONS}
              selected={stageFilter}
              onSelect={setStageFilter}
              colorMap={statusColors}
            />
            <DropdownFilter
              label="Type"
              options={TYPE_OPTIONS}
              selected={typeFilter}
              onSelect={setTypeFilter}
              colorMap={customerTypeColors}
            />
            <AnimatePresence>
              {hasAnyFilter && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.15 }}
                  type="button"
                  onClick={clearAll}
                  className="flex items-center gap-1 h-8 px-3 rounded-lg border border-border bg-card text-xs text-muted-foreground hover:text-foreground hover:border-muted-foreground/40 transition-all"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Active filter summary */}
          <div className="flex items-center gap-3 min-h-[18px] flex-wrap">
            {(query.trim() || tierFilter || stageFilter || typeFilter) && (
              <motion.span
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[11px] text-muted-foreground"
              >
                Showing{" "}
                <span className="text-foreground font-semibold font-mono">
                  {processed.length}
                </span>{" "}
                of {ACCOUNTS.length} accounts
                {processed.length === 0 && (
                  <span className="text-red-600 ml-1">— no matches found</span>
                )}
              </motion.span>
            )}
            {sortKey && (
              <motion.span
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-[10px] px-2 py-0.5 rounded-md bg-primary/10 text-primary font-medium flex items-center gap-1"
              >
                Sorted by {sortKey === "arr" ? "ARR" : sortKey.charAt(0).toUpperCase() + sortKey.slice(1)}{" "}
                {sortDir === "asc" ? "↑" : "↓"}
                <button
                  onClick={() => { setSortKey(null); setSortDir("asc"); }}
                  className="ml-1 hover:text-foreground transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </motion.span>
            )}
          </div>
        </motion.div>

        {/* Account table */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card-elevated rounded-xl border border-border bg-card overflow-hidden"
        >
          {/* Header row */}
          <div className="grid grid-cols-[2fr_0.7fr_0.6fr_0.6fr_0.8fr_1.2fr_0.8fr_0.3fr] gap-3 px-5 py-3 border-b border-border">
            {columns.map((col, idx) => {
              const isSortable = col.key !== null;
              const isActive = sortKey === col.key;
              return (
                <button
                  key={col.label || `col-${idx}`}
                  type="button"
                  disabled={!isSortable}
                  onClick={() => isSortable && handleSort(col.key!)}
                  className={cn(
                    "flex items-center gap-1.5 text-[10px] tracking-[0.1em] font-medium uppercase text-left group/hdr transition-colors",
                    isSortable ? "cursor-pointer hover:text-foreground" : "cursor-default",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {col.label && <span>{col.label}</span>}
                  {isSortable && <SortIcon colKey={col.key!} />}
                </button>
              );
            })}
          </div>

          {/* Rows */}
          <AnimatePresence mode="popLayout">
            {processed.map((acc, i) => (
              <motion.div
                key={acc.id}
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8, height: 0, paddingTop: 0, paddingBottom: 0 }}
                transition={{ duration: 0.2, delay: i * 0.03 }}
                onClick={() => openDetail(acc)}
                className="grid grid-cols-[2fr_0.7fr_0.6fr_0.6fr_0.8fr_1.2fr_0.8fr_0.3fr] gap-3 px-5 py-3.5 items-center border-b border-border last:border-0 hover:bg-primary/[0.04] transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-[11px] font-bold text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    {acc.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold text-foreground group-hover:text-primary transition-colors">
                      {acc.name}
                    </div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <User className="w-3 h-3" /> {acc.contact}
                    </div>
                  </div>
                </div>
                <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-medium w-fit", customerTypeColors[acc.customerType])}>
                  {acc.customerType}
                </span>
                <span
                  className={cn(
                    "text-[10px] px-2 py-0.5 rounded-md border font-medium w-fit",
                    tierColors[acc.tier]
                  )}
                >
                  {acc.tier}
                </span>
                <div className="flex items-center gap-1.5">
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full",
                      acc.health >= 85 ? "bg-emerald-600" : acc.health >= 65 ? "bg-amber-500" : "bg-red-500"
                    )}
                  />
                  <span className={cn("text-xs font-mono font-semibold", healthColor(acc.health))}>
                    {acc.health}
                  </span>
                </div>
                <span className="text-xs text-foreground font-mono font-semibold">
                  ${(acc.arr / 1000).toFixed(0)}K
                </span>
                {/* LED column */}
                {acc.saasLicense ? (() => {
                  const days = daysUntilLED(acc.saasLicense.licenseEndDate);
                  const urgency = getLEDUrgency(acc);
                  const uc = ledUrgencyColors[urgency];
                  return (
                    <div className="flex items-center gap-1.5">
                      <div className={cn("w-2 h-2 rounded-full shrink-0", uc.dot, urgency === "critical" && "animate-pulse")} />
                      <div>
                        <span className={cn("text-[11px] font-mono font-semibold block leading-tight", uc.text)}>
                          {days}d
                        </span>
                        <span className="text-[9px] text-muted-foreground">
                          {formatLEDDate(acc.saasLicense.licenseEndDate)}
                        </span>
                      </div>
                    </div>
                  );
                })() : (
                  <span className="text-[10px] text-muted-foreground/50">—</span>
                )}
                <span
                  className={cn(
                    "text-[10px] px-2 py-0.5 rounded-md font-medium w-fit",
                    statusColors[acc.stage] || "text-muted-foreground bg-muted"
                  )}
                >
                  {acc.stage}
                </span>
                {/* Snapshot + Arrow */}
                <div className="flex items-center justify-end gap-1">
                  {onNavigateToMoment && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onNavigateToMoment(acc.id); }}
                      className="p-1 rounded-md hover:bg-primary/10 transition-colors opacity-0 group-hover:opacity-100"
                      title="Moment in Time snapshot"
                    >
                      <Eye className="w-3.5 h-3.5 text-primary" />
                    </button>
                  )}
                  <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Empty state */}
          {processed.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-12 text-center"
            >
              <Search className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                No accounts match your filters
              </p>
              <button
                onClick={clearAll}
                className="mt-3 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
              >
                Clear all filters
              </button>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Account Detail Side Panel */}
      <AccountDetailPanel
        account={selectedAccount}
        open={panelOpen}
        onOpenChange={setPanelOpen}
      />
    </>
  );
}
