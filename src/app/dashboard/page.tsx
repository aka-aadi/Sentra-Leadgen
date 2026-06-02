"use client";

import { useQuery } from "@tanstack/react-query";
import { Users, Crosshair, TrendingUp, Flame, ArrowRight, Sparkles, Zap, ArrowUpRight, BarChart3 } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Stats {
  totalLeads: number;
  totalCampaigns: number;
  activeCampaigns: number;
  avgScore: number;
  priorityBreakdown: Record<string, number>;
  recentCampaigns: Array<{ id: string; name: string; query: string; status: string; leadCount: number }>;
  topLeads: Array<{ id: string; companyName: string; ownerName: string | null; contactEmail: string | null; score: number; priority: string; campaign: { name: string } }>;
}

const pCfg: Record<string, { color: string; bg: string; grad: string }> = {
  HOT: { color: "text-rose-600", bg: "bg-rose-50", grad: "gradient-hot" },
  HIGH: { color: "text-amber-600", bg: "bg-amber-50", grad: "gradient-high" },
  MEDIUM: { color: "text-indigo-600", bg: "bg-indigo-50", grad: "gradient-medium" },
  LOW: { color: "text-slate-500", bg: "bg-slate-50", grad: "gradient-low" },
};

export default function DashboardPage() {
  const { data: s, isLoading } = useQuery<Stats>({
    queryKey: ["stats"],
    queryFn: () => fetch("/api/stats").then(r => r.json()),
    refetchInterval: 5000,
  });

  const cards = [
    { title: "Total Leads", value: s?.totalLeads || 0, icon: Users, desc: "All campaigns", color: "text-indigo-600", bg: "bg-indigo-50/80" },
    { title: "Campaigns", value: s?.totalCampaigns || 0, icon: Crosshair, desc: `${s?.activeCampaigns || 0} active`, color: "text-violet-600", bg: "bg-violet-50/80" },
    { title: "Avg Score", value: s?.avgScore || 0, icon: TrendingUp, desc: "Quality index", color: "text-emerald-600", bg: "bg-emerald-50/80" },
    { title: "Hot Leads", value: s?.priorityBreakdown?.HOT || 0, icon: Flame, desc: "High priority", color: "text-rose-600", bg: "bg-rose-50/80" },
  ];

  if (isLoading) return <div className="space-y-6"><div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-[120px] rounded-2xl" />)}</div></div>;

  const empty = !s?.totalLeads && !s?.totalCampaigns;

  return (
    <div className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((c, i) => (
          <motion.div key={c.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <div className="group relative overflow-hidden rounded-2xl bg-card border border-border p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{c.title}</p>
                  <p className="mt-2 text-3xl font-extrabold tracking-tight">{c.value}</p>
                  <p className="mt-1 text-[11px] font-medium text-muted-foreground">{c.desc}</p>
                </div>
                <div className={cn("p-2.5 rounded-xl", c.bg)}><c.icon className={cn("h-5 w-5", c.color)} /></div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </motion.div>
        ))}
      </div>

      {empty ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-20">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-xl shadow-indigo-500/30 mb-6">
            <Sparkles className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-xl font-bold mb-2">Launch Your First Campaign</h2>
          <p className="text-sm text-muted-foreground max-w-md text-center mb-6">Use AI to discover and extract high-quality B2B leads.</p>
          <Link href="/campaigns/new" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:-translate-y-0.5 transition-all">
            <Zap className="h-4 w-4" />Create Campaign<ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-7">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="lg:col-span-3">
            <div className="rounded-2xl bg-card border border-border p-5 shadow-sm h-full">
              <div className="flex items-center justify-between mb-5">
                <div><h3 className="text-sm font-bold">Lead Priority Distribution</h3><p className="text-[11px] text-muted-foreground mt-0.5">Quality breakdown</p></div>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="space-y-3">
                {(["HOT","HIGH","MEDIUM","LOW"] as const).map(p => {
                  const count = s?.priorityBreakdown?.[p] || 0;
                  const pct = Math.round((count / (s?.totalLeads || 1)) * 100);
                  const cfg = pCfg[p];
                  return (
                    <div key={p} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2"><div className={cn("h-2.5 w-2.5 rounded-full", cfg.grad)} /><span className="text-xs font-bold">{p}</span></div>
                        <span className="text-xs font-bold text-muted-foreground">{count} ({pct}%)</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: 0.6, duration: 0.8 }} className={cn("h-full rounded-full", cfg.grad)} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="lg:col-span-4">
            <div className="rounded-2xl bg-card border border-border p-5 shadow-sm h-full">
              <div className="flex items-center justify-between mb-4">
                <div><h3 className="text-sm font-bold">Recent Campaigns</h3><p className="text-[11px] text-muted-foreground mt-0.5">Latest AI runs</p></div>
                <Link href="/campaigns" className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1">View All <ArrowUpRight className="h-3 w-3" /></Link>
              </div>
              <div className="space-y-2">
                {s?.recentCampaigns?.map(c => (
                  <Link key={c.id} href={`/campaigns/${c.id}`} className="flex items-center gap-4 p-3 rounded-xl hover:bg-accent/50 transition-all group">
                    <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white font-bold text-xs", c.status === "RUNNING" ? "bg-gradient-to-br from-amber-400 to-orange-500 pipeline-active" : c.status === "COMPLETED" ? "bg-gradient-to-br from-emerald-400 to-teal-500" : "bg-gradient-to-br from-slate-400 to-slate-500")}>{c.name.substring(0, 2).toUpperCase()}</div>
                    <div className="flex-1 min-w-0"><p className="text-xs font-bold truncate">{c.name}</p><p className="text-[11px] text-muted-foreground truncate">{c.query}</p></div>
                    <div className="text-right"><p className="text-xs font-extrabold">{c.leadCount}</p><p className="text-[10px] text-muted-foreground">leads</p></div>
                  </Link>
                ))}
                {!s?.recentCampaigns?.length && <p className="py-8 text-center text-xs text-muted-foreground">No campaigns yet</p>}
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="lg:col-span-full">
            <div className="rounded-2xl bg-card border border-border p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div><h3 className="text-sm font-bold">Top Scored Leads</h3><p className="text-[11px] text-muted-foreground mt-0.5">Highest quality across campaigns</p></div>
                <Link href="/leads" className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1">View All <ArrowUpRight className="h-3 w-3" /></Link>
              </div>
              {s?.topLeads?.length ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  {s.topLeads.map(l => {
                    const cfg = pCfg[l.priority] || pCfg.MEDIUM;
                    return (
                      <div key={l.id} className="rounded-xl border border-border p-4 hover:border-primary/20 hover:shadow-md transition-all">
                        <div className="flex items-start justify-between mb-3">
                          <div className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase", cfg.bg, cfg.color)}>
                            {l.priority === "HOT" && <Flame className="h-2.5 w-2.5" />}{l.priority}
                          </div>
                          <span className="text-sm font-extrabold">{l.score}</span>
                        </div>
                        <h4 className="text-xs font-bold truncate">{l.companyName}</h4>
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">{l.ownerName || "No contact"}</p>
                        {l.contactEmail && <p className="text-[10px] text-primary truncate mt-1">{l.contactEmail}</p>}
                      </div>
                    );
                  })}
                </div>
              ) : <p className="py-8 text-center text-xs text-muted-foreground">No leads yet. Create a campaign to get started.</p>}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
