"use client";

import { usePathname, useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { Search, Zap, Brain, Sparkles, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { toast } from "sonner";
import { useEffect, useRef } from "react";

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": { title: "Dashboard", subtitle: "AI lead generation overview" },
  "/campaigns": { title: "Campaigns", subtitle: "Manage your lead generation campaigns" },
  "/campaigns/new": { title: "New Campaign", subtitle: "Configure and launch a new AI search" },
  "/leads": { title: "All Leads", subtitle: "Browse and manage generated leads" },
  "/settings": { title: "Settings", subtitle: "API keys and scoring configuration" },
};

interface SettingsData {
  serperCreditsUsed: number; serperCreditsTotal: number; serperEnabled: boolean;
  apolloCreditsUsed: number; apolloCreditsTotal: number; apolloEnabled: boolean;
  geminiCallsToday: number; geminiCallsLimit: number; geminiEnabled: boolean;
  _serperLow: boolean; _serperCritical: boolean; _serperRemaining: number;
  _apolloLow: boolean; _apolloCritical: boolean; _apolloRemaining: number;
  _geminiLow: boolean; _geminiCritical: boolean; _geminiRemaining: number;
}

function CreditPill({
  icon, label, remaining, total, low, critical, enabled,
}: {
  icon: React.ReactNode; label: string; remaining: number; total: number;
  low: boolean; critical: boolean; enabled: boolean;
}) {
  if (!enabled) return null;

  const pillBg = critical
    ? "bg-rose-500/10 border-rose-500/30"
    : low
    ? "bg-amber-500/10 border-amber-500/30"
    : "bg-slate-500/10 border-slate-500/20";

  const textColor = critical
    ? "text-rose-600 dark:text-rose-400"
    : low
    ? "text-amber-600 dark:text-amber-400"
    : "text-muted-foreground";

  const iconColor = critical
    ? "text-rose-500"
    : low
    ? "text-amber-500"
    : "text-slate-400";

  return (
    <div className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border transition-all", pillBg)}>
      {(critical || low) && <AlertTriangle className={cn("h-3 w-3", iconColor)} />}
      <span className={cn("h-3 w-3", iconColor)}>{icon}</span>
      <span className={cn("text-[11px] font-bold", textColor)}>
        {remaining.toLocaleString()}
        <span className={cn("font-medium opacity-60 ml-0.5 text-[10px]")}>/{total.toLocaleString()} {label}</span>
      </span>
    </div>
  );
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const warnedRef = useRef<Set<string>>(new Set());

  const { data: settings } = useQuery<SettingsData>({
    queryKey: ["settings"],
    queryFn: () => fetch("/api/settings").then(r => r.json()),
    refetchInterval: 30000,
  });

  // Fire low-credit toasts once per session
  useEffect(() => {
    if (!settings) return;

    const checks = [
      { key: "serper", critical: settings._serperCritical, low: settings._serperLow, remaining: settings._serperRemaining, label: "Serper" },
      { key: "apollo", critical: settings._apolloCritical, low: settings._apolloLow, remaining: settings._apolloRemaining, label: "Apollo" },
      { key: "gemini", critical: settings._geminiCritical, low: settings._geminiLow, remaining: settings._geminiRemaining, label: "Gemini" },
    ];

    for (const { key, critical, low, remaining, label } of checks) {
      if (critical && !warnedRef.current.has(`${key}-critical`)) {
        warnedRef.current.add(`${key}-critical`);
        toast.error(`🚨 ${label} credits critical! Only ${remaining} left — add credits soon or leads will fail.`, {
          duration: 8000,
          id: `${key}-critical`,
        });
      } else if (low && !warnedRef.current.has(`${key}-low`)) {
        warnedRef.current.add(`${key}-low`);
        toast.warning(`⚠️ ${label} credits running low — ${remaining} remaining. Consider topping up.`, {
          duration: 6000,
          id: `${key}-low`,
        });
      }
    }
  }, [settings]);

  const matchedKey = Object.keys(pageTitles)
    .sort((a, b) => b.length - a.length)
    .find((key) => pathname.startsWith(key));
  const pageInfo = matchedKey
    ? pageTitles[matchedKey]
    : { title: "SENTRA LeadGen", subtitle: "AI-Powered B2B Leads" };

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-white/60 dark:bg-slate-950/60 backdrop-blur-xl px-6">
      <div>
        <h1 className="text-[15px] font-bold text-foreground tracking-tight">{pageInfo.title}</h1>
        <p className="text-[11px] text-muted-foreground font-medium -mt-0.5">{pageInfo.subtitle}</p>
      </div>

      <div className="flex items-center gap-4">
        {settings && (
          <>
            <CreditPill
              icon={<Zap className="h-3 w-3" />}
              label="Serper"
              remaining={settings._serperRemaining ?? 0}
              total={settings.serperCreditsTotal ?? 2500}
              low={settings._serperLow}
              critical={settings._serperCritical}
              enabled={settings.serperEnabled ?? true}
            />
            <CreditPill
              icon={<Brain className="h-3 w-3" />}
              label="Apollo"
              remaining={settings._apolloRemaining ?? 0}
              total={settings.apolloCreditsTotal ?? 50}
              low={settings._apolloLow}
              critical={settings._apolloCritical}
              enabled={settings.apolloEnabled ?? true}
            />
            <CreditPill
              icon={<Sparkles className="h-3 w-3" />}
              label="Gemini/day"
              remaining={settings._geminiRemaining ?? 0}
              total={settings.geminiCallsLimit ?? 200}
              low={settings._geminiLow}
              critical={settings._geminiCritical}
              enabled={settings.geminiEnabled ?? true}
            />
          </>
        )}

        <form 
          onSubmit={(e) => {
            e.preventDefault();
            if (searchQuery.trim()) {
              router.push(`/leads?search=${encodeURIComponent(searchQuery.trim())}`);
            }
          }}
          className="relative hidden md:block"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search leads..."
            className="h-8 w-48 rounded-lg bg-muted/50 border border-border pl-9 pr-3 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
          />
        </form>
        
        <ThemeToggle />
        
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-[11px] font-bold text-white shadow-md shadow-indigo-500/20">
          S
        </div>
      </div>
    </header>
  );
}
