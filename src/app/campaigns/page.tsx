"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Play, CheckCircle2, Loader2, XCircle, Clock, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import { useState } from "react";

interface Campaign {
  id: string; name: string; query: string; industry: string | null; location: string | null;
  type: string; status: string; totalFound: number; progress: number; createdAt: string; leadCount: number; avgScore: number;
  priorityBreakdown: Record<string, number>;
}

const typeCfg: Record<string, { label: string; color: string; bg: string }> = {
  LOCAL: { label: "Local", color: "text-emerald-700", bg: "bg-emerald-50" },
  COMPANY: { label: "Company", color: "text-indigo-700", bg: "bg-indigo-50" },
  PEOPLE: { label: "People", color: "text-amber-700", bg: "bg-amber-50" },
};

const statusCfg: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  IDLE: { icon: Clock, color: "text-slate-500", bg: "bg-slate-50", label: "Ready" },
  RUNNING: { icon: Loader2, color: "text-amber-600", bg: "bg-amber-50", label: "Running" },
  COMPLETED: { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", label: "Complete" },
  FAILED: { icon: XCircle, color: "text-rose-600", bg: "bg-rose-50", label: "Failed" },
};

export default function CampaignsPage() {
  const qc = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: campaigns, isLoading } = useQuery<Campaign[]>({
    queryKey: ["campaigns"],
    queryFn: () => fetch("/api/campaigns").then(r => r.json()),
    refetchInterval: 3000,
  });

  const runMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/campaigns/${id}/run`, { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => { toast.success("Pipeline started"); qc.invalidateQueries({ queryKey: ["campaigns"] }); },
    onError: (err) => { toast.error("Failed to start pipeline: " + err.message); },
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => { 
      toast.success("Campaign deleted"); 
      setDeletingId(null);
      qc.invalidateQueries({ queryKey: ["campaigns"] }); 
    },
    onError: (err) => { 
      toast.error("Failed to delete campaign: " + err.message); 
      setDeletingId(null);
    },
  });

  if (isLoading) return <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}</div>;

  return (
    <div className="space-y-5">
      {/* Custom Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border shadow-2xl rounded-2xl p-6 max-w-sm w-full"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Delete Campaign</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Are you sure? This will permanently delete the campaign and all its leads.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button 
                  onClick={() => setDeletingId(null)}
                  disabled={delMut.isPending}
                  className="px-4 py-2 rounded-xl text-sm font-bold text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => delMut.mutate(deletingId)}
                  disabled={delMut.isPending}
                  className="px-4 py-2 rounded-xl text-sm font-bold bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-lg shadow-rose-600/20 disabled:opacity-50 flex items-center gap-2"
                >
                  {delMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Yes, Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Your Campaigns</h2>
          <p className="text-xs text-muted-foreground">{campaigns?.length || 0} campaigns total</p>
        </div>
        <Link href="/campaigns/new" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-500/20 hover:shadow-xl transition-all">
          <Plus className="h-3.5 w-3.5" /> New Campaign
        </Link>
      </div>

      <div className="space-y-3">
        {campaigns?.map((c, i) => {
          const st = statusCfg[c.status] || statusCfg.IDLE;
          const Icon = st.icon;
          return (
            <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <div className="group rounded-2xl bg-card border border-border p-5 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-start gap-4">
                  <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white font-bold text-sm", c.status === "COMPLETED" ? "bg-gradient-to-br from-emerald-400 to-teal-500" : c.status === "RUNNING" ? "bg-gradient-to-br from-amber-400 to-orange-500 pipeline-active" : "bg-gradient-to-br from-indigo-400 to-violet-500")}>
                    {c.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Link href={`/campaigns/${c.id}`} className="text-sm font-bold text-foreground hover:text-primary transition-colors truncate">{c.name}</Link>
                      {(() => { const tc = typeCfg[c.type] || typeCfg.LOCAL; return <span className={cn("text-[9px] font-bold rounded px-1.5 py-0.5 uppercase tracking-wide", tc.bg, tc.color)}>{tc.label}</span>; })()}
                      <div className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold", st.bg, st.color)}>
                        <Icon className={cn("h-3 w-3", c.status === "RUNNING" ? "animate-spin" : "")} />{st.label}
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground font-medium truncate">{c.query}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-[11px] text-muted-foreground"><span className="font-bold text-foreground">{c.leadCount}</span> leads</span>
                      <span className="text-[11px] text-muted-foreground">Score avg: <span className="font-bold text-foreground">{c.avgScore}</span></span>
                      <span className="text-[11px] text-muted-foreground">{format(new Date(c.createdAt), "MMM d, yyyy")}</span>
                    </div>
                    {c.status === "RUNNING" && (
                      <div className="mt-3 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500" style={{ width: `${c.progress}%` }} />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {(c.status === "IDLE" || c.status === "COMPLETED" || c.status === "FAILED") && (
                      <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); runMut.mutate(c.id); }} className="p-2 rounded-lg text-muted-foreground hover:bg-emerald-50 hover:text-emerald-600 transition-colors" title="Run pipeline">
                        <Play className="h-4 w-4" />
                      </button>
                    )}
                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeletingId(c.id); }} className="p-2 rounded-lg text-muted-foreground hover:bg-rose-50 hover:text-rose-600 transition-colors" title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
        {!campaigns?.length && (
          <div className="py-16 text-center">
            <p className="text-sm text-muted-foreground mb-4">No campaigns created yet</p>
            <Link href="/campaigns/new" className="text-sm font-bold text-primary hover:underline">Create your first campaign →</Link>
          </div>
        )}
      </div>
    </div>
  );
}
