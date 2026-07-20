/*
 * ThemeContext — Fixed light enterprise theme (teal primary)
 * Simplified from the previous time-of-day adaptive system
 * to a consistent professional palette.
 */
import React, { createContext, useContext, useEffect } from "react";

type TimePhase = "morning" | "afternoon" | "evening";

interface ThemeContextType {
  phase: TimePhase;
  hour: number;
  forcePhase: (phase: TimePhase | null) => void;
  forcedPhase: TimePhase | null;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/* ── Fixed enterprise palette ─────────────────────────────── */
const ENTERPRISE_PALETTE: Record<string, string> = {
  "--background": "oklch(0.975 0.003 240)",        // very light cool gray
  "--foreground": "oklch(0.20 0.015 250)",          // deep charcoal
  "--card": "oklch(0.995 0.002 240)",               // near-white
  "--card-foreground": "oklch(0.20 0.015 250)",
  "--popover": "oklch(0.995 0.002 240)",
  "--popover-foreground": "oklch(0.20 0.015 250)",
  "--primary": "oklch(0.50 0.10 195)",              // teal #0B7285
  "--primary-foreground": "oklch(0.99 0 0)",
  "--secondary": "oklch(0.95 0.005 240)",           // light gray
  "--secondary-foreground": "oklch(0.35 0.01 250)",
  "--muted": "oklch(0.94 0.005 240)",
  "--muted-foreground": "oklch(0.50 0.015 250)",
  "--accent": "oklch(0.94 0.015 195)",              // light teal tint
  "--accent-foreground": "oklch(0.20 0.015 250)",
  "--destructive": "oklch(0.58 0.22 25)",
  "--destructive-foreground": "oklch(0.99 0 0)",
  "--border": "oklch(0.91 0.005 240)",              // subtle cool border
  "--input": "oklch(0.91 0.005 240)",
  "--ring": "oklch(0.50 0.10 195)",
  "--chart-1": "oklch(0.50 0.10 195)",              // teal
  "--chart-2": "oklch(0.60 0.12 155)",              // green
  "--chart-3": "oklch(0.65 0.10 75)",               // warm gold
  "--chart-4": "oklch(0.55 0.10 260)",              // indigo
  "--chart-5": "oklch(0.62 0.08 30)",               // coral
  "--sidebar": "oklch(0.99 0.002 240)",             // white sidebar
  "--sidebar-foreground": "oklch(0.40 0.01 250)",   // medium gray text
  "--sidebar-primary": "oklch(0.50 0.10 195)",      // teal
  "--sidebar-primary-foreground": "oklch(0.99 0 0)",
  "--sidebar-accent": "oklch(0.96 0.012 195)",      // light teal bg
  "--sidebar-accent-foreground": "oklch(0.35 0.08 195)", // teal text
  "--sidebar-border": "oklch(0.92 0.005 240)",      // subtle border
  "--sidebar-ring": "oklch(0.50 0.10 195)",
};

function applyPalette() {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(ENTERPRISE_PALETTE)) {
    root.style.setProperty(key, value);
  }
}

/* ── Provider ────────────────────────────────────────────── */
interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  // Apply fixed palette on mount
  useEffect(() => {
    applyPalette();
    document.documentElement.classList.remove("dark");
  }, []);

  // Provide stable context values (phase kept for backward compatibility)
  const value: ThemeContextType = {
    phase: "morning",
    hour: new Date().getHours(),
    forcePhase: () => {},
    forcedPhase: null,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}

export { type TimePhase };
