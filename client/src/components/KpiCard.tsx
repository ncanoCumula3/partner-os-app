/*
 * KPI Card — metric display with delta indicator
 * Warm adaptive theme — card-elevated style
 * Supports onClick for navigation
 */
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string;
  delta: string;
  up: boolean;
  index?: number;
  onClick?: () => void;
}

export default function KpiCard({ label, value, delta, up, index = 0, onClick }: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35, ease: "easeOut" }}
      onClick={onClick}
      className={cn(
        "card-elevated rounded-xl border border-border bg-card p-5 group transition-all",
        onClick && "cursor-pointer hover:border-primary/30 hover:shadow-md"
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] tracking-[0.1em] text-muted-foreground font-medium uppercase">
          {label}
        </div>
        {onClick && (
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
        )}
      </div>
      <div className="text-2xl font-bold text-foreground font-mono tracking-tight">
        {value}
      </div>
      <div
        className={cn(
          "text-xs mt-2 font-medium",
          up ? "text-emerald-700" : "text-red-600"
        )}
      >
        {up ? "▲" : "▼"} {delta}
      </div>
    </motion.div>
  );
}
