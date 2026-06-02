"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Key, Sparkles, Eye, EyeOff, CheckCircle2, AlertCircle, Save, Brain,
  ToggleLeft, ToggleRight, Zap, Activity, RefreshCw, AlertTriangle, ShieldCheck, Lock,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useState, useEffect } from "react";

interface SettingsData {
  geminiApiKey: string; googleSearchApiKey: string; googleSearchEngineId: string;
  googleAiApiKey: string; hunterApiKey: string; clearbitApiKey: string;
  apolloApiKey: string; idealCustomerProfile: string; creditsUsed: number;
  _hasGeminiKey: boolean; _hasSearchKey: boolean; _hasAiKey: boolean;
  _hasHunterKey: boolean; _hasApolloKey: boolean;
  // Toggles
  serperEnabled: boolean; apolloEnabled: boolean; geminiEnabled: boolean;
  // Credits
  serperCreditsUsed: number; serperCreditsTotal: number;
  apolloCreditsUsed: number; apolloCreditsTotal: number;
  geminiCallsToday: number; geminiCallsLimit: number;
  // Warnings
  _serperLow: boolean; _serperCritical: boolean;
  _apolloLow: boolean; _apolloCritical: boolean;
  _geminiLow: boolean; _geminiCritical: boolean;
  _serperRemaining: number; _apolloRemaining: number; _geminiRemaining: number;
}

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-all duration-300",
        enabled ? "bg-emerald-500 shadow-emerald-500/30 shadow-md" : "bg-slate-200"
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-all duration-300",
          enabled ? "translate-x-6" : "translate-x-1"
        )}
      />
    </button>
  );
}

function CreditBar({
  label, icon, used, total, remaining, low, critical, enabled,
  color, onToggle, extraInfo,
}: {
  label: string; icon: React.ReactNode; used: number; total: number; remaining: number;
  low: boolean; critical: boolean; enabled: boolean;
  color: string; onToggle: () => void; extraInfo?: string;
}) {
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  const barColor = critical
    ? "bg-rose-500"
    : low
    ? "bg-amber-500"
    : "bg-emerald-500";
  const textColor = critical
    ? "text-rose-600"
    : low
    ? "text-amber-600"
    : "text-emerald-600";
  const bgColor = critical
    ? "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800/40"
    : low
    ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/40"
    : "bg-card border-border";

  return (
    <div className={cn("rounded-xl border p-4 transition-all", bgColor, !enabled && "opacity-50")}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg text-white text-xs font-bold", color)}>
            {icon}
          </div>
          <div>
            <p className="text-xs font-bold text-foreground">{label}</p>
            {extraInfo && <p className="text-[10px] text-muted-foreground">{extraInfo}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {(low || critical) && (
            <span className={cn("flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full",
            critical ? "text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/40" : "text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40"
            )}>
              <AlertTriangle className="h-2.5 w-2.5" />
              {critical ? "Critical" : "Low"}
            </span>
          )}
          <Toggle enabled={enabled} onToggle={onToggle} />
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between text-[10px] font-medium">
          <span className="text-muted-foreground">{used.toLocaleString()} used</span>
          <span className={cn("font-bold", textColor)}>{remaining.toLocaleString()} left / {total.toLocaleString()}</span>
        </div>
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={cn("h-full rounded-full transition-colors", barColor)}
          />
        </div>
        <p className="text-[10px] text-muted-foreground text-right">{pct}% consumed</p>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const qc = useQueryClient();
  const [geminiKey, setGeminiKey] = useState("");
  const [searchKey, setSearchKey] = useState("");
  const [searchEngineId, setSearchEngineId] = useState("");
  const [aiKey, setAiKey] = useState("");
  const [hunterKey, setHunterKey] = useState("");
  const [clearbitKey, setClearbitKey] = useState("");
  const [apolloKey, setApolloKey] = useState("");
  const [icp, setIcp] = useState("");
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  // Toggles
  const [serperEnabled, setSerperEnabled] = useState(true);
  const [apolloEnabled, setApolloEnabled] = useState(true);
  const [geminiEnabled, setGeminiEnabled] = useState(true);

  // Credit totals (editable)
  const [serperTotal, setSerperTotal] = useState(2500);
  const [apolloTotal, setApolloTotal] = useState(50);
  const [geminiLimit, setGeminiLimit] = useState(200);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const { data: settings } = useQuery<SettingsData>({
    queryKey: ["settings"],
    queryFn: () => fetch("/api/settings").then(r => r.json()),
    refetchInterval: 15000, // refresh credits every 15s
  });

  useEffect(() => {
    if (settings) {
      setGeminiKey(settings.geminiApiKey);
      setSearchKey(settings.googleSearchApiKey);
      setSearchEngineId(settings.googleSearchEngineId);
      setAiKey(settings.googleAiApiKey);
      setHunterKey(settings.hunterApiKey);
      setClearbitKey(settings.clearbitApiKey);
      setApolloKey(settings.apolloApiKey);
      setIcp(settings.idealCustomerProfile);
      setSerperEnabled(settings.serperEnabled ?? true);
      setApolloEnabled(settings.apolloEnabled ?? true);
      setGeminiEnabled(settings.geminiEnabled ?? true);
      setSerperTotal(settings.serperCreditsTotal ?? 2500);
      setApolloTotal(settings.apolloCreditsTotal ?? 50);
      setGeminiLimit(settings.geminiCallsLimit ?? 200);
    }
  }, [settings]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          geminiApiKey: geminiKey,
          googleSearchApiKey: searchKey,
          googleSearchEngineId: searchEngineId,
          googleAiApiKey: aiKey,
          hunterApiKey: hunterKey,
          clearbitApiKey: clearbitKey,
          apolloApiKey: apolloKey,
          idealCustomerProfile: icp,
          serperEnabled,
          apolloEnabled,
          geminiEnabled,
          serperCreditsTotal: serperTotal,
          apolloCreditsTotal: apolloTotal,
          geminiCallsLimit: geminiLimit,
        }),
      });
      return res.json();
    },
    onSuccess: () => { toast.success("Settings saved"); qc.invalidateQueries({ queryKey: ["settings"] }); },
    onError: () => toast.error("Failed to save"),
  });

  const resetPasswordMut = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Reset failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update password");
    },
  });

  const resetCreditsMut = useMutation({
    mutationFn: async (service: "serper" | "apollo" | "gemini") => {
      const fieldMap = {
        serper: { serperCreditsUsed: 0 },
        apollo: { apolloCreditsUsed: 0 },
        gemini: { geminiCallsToday: 0 },
      };
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fieldMap[service]),
      });
      return res.json();
    },
    onSuccess: (_, service) => {
      toast.success(`${service} credits reset`);
      qc.invalidateQueries({ queryKey: ["settings"] });
    },
  });

  const toggle = (key: string) => setShowKeys(p => ({ ...p, [key]: !p[key] }));

  const coreFields = [
    { label: "Gemini API Key (Legacy)", desc: "Legacy key — use Google AI Key below instead", key: "gemini", value: geminiKey, setter: setGeminiKey, hasKey: settings?._hasGeminiKey, placeholder: "AIza..." },
    { label: "Google AI / Gemini API Key", desc: "Powers AI extraction, scoring, and intelligence analysis", key: "ai", value: aiKey, setter: setAiKey, hasKey: settings?._hasAiKey, placeholder: "AIza...", important: true },
    { label: "Serper.dev API Key", desc: "Enables search, news, and places APIs for lead discovery & intelligence", key: "search", value: searchKey, setter: setSearchKey, hasKey: settings?._hasSearchKey, placeholder: "Your Serper API Key...", important: true },
    { label: "Google Search Engine ID (Deprecated)", desc: "No longer needed when using Serper.dev API", key: "searchId", value: searchEngineId, setter: setSearchEngineId, hasKey: !!searchEngineId, placeholder: "abc123...", isPlainText: true },
  ];

  const enrichmentFields = [
    { label: "Hunter.io API Key", desc: "Email discovery and verification (optional — 25 free/month)", key: "hunter", value: hunterKey, setter: setHunterKey, hasKey: settings?._hasHunterKey, placeholder: "abc123..." },
    { label: "Apollo.io API Key", desc: "Decision-maker discovery — CEO, CTO, founder contacts + verified emails & phones", key: "apollo", value: apolloKey, setter: setApolloKey, hasKey: settings?._hasApolloKey, placeholder: "Your Apollo API Key..." },
    { label: "Clearbit API Key", desc: "Company enrichment data (optional)", key: "clearbit", value: clearbitKey, setter: setClearbitKey, hasKey: false, placeholder: "sk_..." },
  ];

  return (
    <div className="space-y-6">

      {/* ── API Health & Credits ── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-slate-700 to-slate-900 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <Activity className="h-4.5 w-4.5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">API Health & Credits</h2>
              <p className="text-[11px] text-white/70">Live usage tracking — toggle tools on/off for each campaign</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Serper */}
          <CreditBar
            label="Serper.dev"
            icon={<Zap className="h-4 w-4" />}
            used={settings?.serperCreditsUsed ?? 0}
            total={serperTotal}
            remaining={settings?._serperRemaining ?? serperTotal}
            low={settings?._serperLow ?? false}
            critical={settings?._serperCritical ?? false}
            enabled={serperEnabled}
            color="bg-indigo-500"
            onToggle={() => setSerperEnabled(p => !p)}
            extraInfo="Google Search + Places for lead discovery"
          />

          {/* Apollo */}
          <CreditBar
            label="Apollo.io"
            icon={<Brain className="h-4 w-4" />}
            used={settings?.apolloCreditsUsed ?? 0}
            total={apolloTotal}
            remaining={settings?._apolloRemaining ?? apolloTotal}
            low={settings?._apolloLow ?? false}
            critical={settings?._apolloCritical ?? false}
            enabled={apolloEnabled}
            color="bg-violet-500"
            onToggle={() => setApolloEnabled(p => !p)}
            extraInfo="Decision makers, emails & phone numbers"
          />

          {/* Gemini */}
          <CreditBar
            label="Gemini AI"
            icon={<Sparkles className="h-4 w-4" />}
            used={settings?.geminiCallsToday ?? 0}
            total={geminiLimit}
            remaining={settings?._geminiRemaining ?? geminiLimit}
            low={settings?._geminiLow ?? false}
            critical={settings?._geminiCritical ?? false}
            enabled={geminiEnabled}
            color="bg-emerald-500"
            onToggle={() => setGeminiEnabled(p => !p)}
            extraInfo="Daily limit resets at midnight — AI scoring & insights"
          />

          {/* Plan Limits */}
          <div className="pt-4 border-t border-border">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Plan Limits — Update When You Upgrade</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground mb-1 block">Serper Total</label>
                <input type="number" value={serperTotal} onChange={e => setSerperTotal(parseInt(e.target.value) || 0)}
                  className="w-full h-9 rounded-lg bg-muted/40 border border-border px-3 text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-muted-foreground mb-1 block">Apollo Total</label>
                <input type="number" value={apolloTotal} onChange={e => setApolloTotal(parseInt(e.target.value) || 0)}
                  className="w-full h-9 rounded-lg bg-muted/40 border border-border px-3 text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-muted-foreground mb-1 block">Gemini Limit/day</label>
                <input type="number" value={geminiLimit} onChange={e => setGeminiLimit(parseInt(e.target.value) || 0)}
                  className="w-full h-9 rounded-lg bg-muted/40 border border-border px-3 text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
            </div>
          </div>

          {/* Manual Reset */}
          <div className="pt-2 border-t border-border">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Reset Counters</p>
            <p className="text-[10px] text-muted-foreground mb-3">Use after your plan renews or if counters are out of sync.</p>
            <div className="flex gap-2">
              {(["serper", "apollo", "gemini"] as const).map(s => (
                <button key={s} onClick={() => resetCreditsMut.mutate(s)}
                  className="flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-all">
                  <RefreshCw className="h-3 w-3" /> Reset {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Core API Keys ── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-500 to-violet-600 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm"><Key className="h-4.5 w-4.5 text-white" /></div>
            <div><h2 className="text-sm font-bold text-white">Core API Configuration</h2><p className="text-[11px] text-white/80">Required: Gemini AI + Serper.dev for lead generation</p></div>
          </div>
        </div>
        <div className="p-6 space-y-5">
          {coreFields.map((field) => (
            <div key={field.key} className={cn(field.important && "p-3 -mx-3 rounded-xl bg-primary/5 border border-primary/10")}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{field.label}</label>
                {field.hasKey
                  ? <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Configured</span>
                  : <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1"><AlertCircle className="h-3 w-3" />Not set</span>}
              </div>
              <p className="text-[10px] text-muted-foreground mb-2">{field.desc}</p>
              <div className="relative">
                <input type={field.isPlainText || showKeys[field.key] ? "text" : "password"} value={field.value} onChange={e => field.setter(e.target.value)} placeholder={field.placeholder}
                  className="w-full h-10 rounded-xl bg-muted/40 border border-border px-4 pr-10 text-sm font-mono font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all" />
                {!field.isPlainText && (
                  <button onClick={() => toggle(field.key)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showKeys[field.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── Enrichment & Intelligence ── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm"><Brain className="h-4.5 w-4.5 text-white" /></div>
            <div><h2 className="text-sm font-bold text-white">Enrichment & Intelligence</h2><p className="text-[11px] text-white/80">Enhance leads with 3rd-party data — phone, email, decision-maker</p></div>
          </div>
        </div>
        <div className="p-6 space-y-5">
          {enrichmentFields.map((field) => (
            <div key={field.key}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{field.label}</label>
                {field.hasKey
                  ? <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Configured</span>
                  : <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">Optional</span>}
              </div>
              <p className="text-[10px] text-muted-foreground mb-2">{field.desc}</p>
              <div className="relative">
                <input type={showKeys[field.key] ? "text" : "password"} value={field.value} onChange={e => field.setter(e.target.value)} placeholder={field.placeholder}
                  className="w-full h-10 rounded-xl bg-muted/40 border border-border px-4 pr-10 text-sm font-mono font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all" />
                <button onClick={() => toggle(field.key)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showKeys[field.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── ICP ── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm"><Sparkles className="h-4.5 w-4.5 text-white" /></div>
            <div><h2 className="text-sm font-bold text-white">Ideal Customer Profile</h2><p className="text-[11px] text-white/80">Define your target customer for AI scoring</p></div>
          </div>
        </div>
        <div className="p-6">
          <p className="text-[11px] text-muted-foreground mb-3">Describe your ideal B2B customer. The AI will use this to score and prioritize leads.</p>
          <textarea value={icp} onChange={e => setIcp(e.target.value)} rows={6}
            placeholder="Example: We target SaaS companies with 50-500 employees in the fintech space, Series A or later, with a CTO or VP of Engineering as the decision maker. They should be actively hiring engineers and expanding their tech infrastructure."
            className="w-full rounded-xl bg-muted/40 border border-border px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all resize-none" />
        </div>
      </motion.div>

      {/* ── Security ── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-slate-700 to-slate-900 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm"><ShieldCheck className="h-4.5 w-4.5 text-white" /></div>
            <div><h2 className="text-sm font-bold text-white">Security & Authentication</h2><p className="text-[11px] text-white/80">Manage superadmin credentials</p></div>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Current Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground"><Lock className="h-4 w-4" /></div>
                <input type={showCurrentPassword ? "text" : "password"} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Current admin password"
                  className="w-full h-10 rounded-xl bg-muted/40 border border-border pl-11 pr-10 text-sm font-mono font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all" />
                <button onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">New Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground"><Key className="h-4 w-4" /></div>
                <input type={showNewPassword ? "text" : "password"} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New password (min 6 chars)"
                  className="w-full h-10 rounded-xl bg-muted/40 border border-border pl-11 pr-10 text-sm font-mono font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all" />
                <button onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
             <button onClick={() => resetPasswordMut.mutate()} disabled={resetPasswordMut.isPending || !currentPassword || newPassword.length < 6}
                className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-bold text-white hover:bg-slate-800 transition-all disabled:opacity-50">
                {resetPasswordMut.isPending ? "Updating..." : "Update Password"}
             </button>
          </div>
        </div>
      </motion.div>

      {/* ── Save ── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
        <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:scale-[1.01] transition-all disabled:opacity-50">
          {saveMut.isPending ? <><Save className="h-4 w-4 animate-pulse" />Saving...</> : <><Save className="h-4 w-4" />Save All Settings</>}
        </button>
      </motion.div>

    </div>
  );
}
