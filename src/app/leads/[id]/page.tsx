"use client";

import { Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, Mail, Phone, Globe, Link2, Brain, Users, Newspaper, Briefcase, Cpu, Flame, Sparkles, Loader2, Trash2, ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";

const pCfg: Record<string, { color: string; bg: string }> = {
  HOT: { color: "text-rose-600", bg: "bg-rose-50" },
  HIGH: { color: "text-amber-600", bg: "bg-amber-50" },
  MEDIUM: { color: "text-indigo-600", bg: "bg-indigo-50" },
  LOW: { color: "text-slate-500", bg: "bg-slate-100" },
};

const sCfg: Record<string, { color: string; bg: string }> = {
  NEW: { color: "text-blue-600", bg: "bg-blue-50" },
  VERIFIED: { color: "text-emerald-600", bg: "bg-emerald-50" },
  CONTACTED: { color: "text-violet-600", bg: "bg-violet-50" },
  CONVERTED: { color: "text-green-700", bg: "bg-green-50" },
  DISCARDED: { color: "text-slate-400", bg: "bg-slate-50" },
};

const intentCfg: Record<string, { color: string; bg: string; label: string }> = {
  HIGH: { color: "text-rose-600", bg: "bg-rose-50", label: "🔥 High Intent" },
  MEDIUM: { color: "text-amber-600", bg: "bg-amber-50", label: "⚡ Medium Intent" },
  LOW: { color: "text-slate-500", bg: "bg-slate-100", label: "💤 Low Intent" },
  UNKNOWN: { color: "text-slate-400", bg: "bg-slate-50", label: "❓ Unknown" },
};

function LeadDetailPageInner() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const rawSearchParams = useSearchParams();
  // `from` carries the full previous URL (page + search + filters)
  // Fall back to legacy `fromPage` param for compatibility
  const from = rawSearchParams.get("from");
  const fromPage = rawSearchParams.get("fromPage") || "1";
  const backHref = from ? decodeURIComponent(from) : `/leads?page=${fromPage}`;
  const qc = useQueryClient();

  const { data: lead, isLoading, error } = useQuery({
    queryKey: ["lead", id],
    queryFn: async () => {
      const res = await fetch(`/api/leads/${id}`);
      if (!res.ok) throw new Error("Failed to fetch lead");
      return res.json();
    },
  });

  const intelligenceMut = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/leads/${id}/intelligence`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Intelligence analysis failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Intelligence analysis complete!");
      qc.invalidateQueries({ queryKey: ["lead", id] });
    },
    onError: (err) => {
      toast.error("Intelligence failed: " + err.message);
    },
  });

  const deleteMut = useMutation({
    mutationFn: async () => {
      if (!confirm("Are you sure you want to delete this lead?")) return;
      const res = await fetch("/api/leads/bulk-delete", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] }) 
      });
      if (!res.ok) throw new Error("Delete failed");
      return res.json();
    },
    onSuccess: () => { 
      toast.success("Lead deleted"); 
      router.push(backHref);
    },
    onError: () => { toast.error("Failed to delete lead. Please check server logs."); },
  });

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="h-8 w-24 skeleton rounded-lg mb-6"></div>
        <div className="h-64 skeleton rounded-2xl"></div>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold mb-2">Lead not found</h2>
        <Link href="/leads" className="text-indigo-600 hover:underline">Back to all leads</Link>
      </div>
    );
  }

  const pc = pCfg[lead.priority] || pCfg.MEDIUM;
  const sc = sCfg[lead.status] || sCfg.NEW;
  const ic = intentCfg[lead.buyingIntent || "UNKNOWN"] || intentCfg.UNKNOWN;

  let newsItems: Array<{title: string; snippet: string; date: string; url: string}> = [];
  try { if (lead.recentNews) newsItems = JSON.parse(lead.recentNews); } catch {}

  return (
    <div className="space-y-6 pb-12">
      <Link href={backHref} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Leads
      </Link>

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="p-6 md:p-8 border-b border-border bg-muted/10">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="flex gap-4">
              <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 text-indigo-600 text-xl font-bold shadow-sm overflow-hidden z-0">
                <span className="absolute inset-0 flex items-center justify-center font-bold text-indigo-600">{lead.companyName.substring(0, 2).toUpperCase()}</span>
                {(lead.companyDomain || lead.companyWebsite) && (
                  <img
                    src={`https://www.google.com/s2/favicons?domain=${lead.companyDomain || lead.companyWebsite?.replace("http://", "").replace("https://", "").split("/")[0].replace("www.", "")}&sz=128`}
                    alt={lead.companyName}
                    className="absolute inset-0 h-full w-full object-cover bg-white z-10"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-1">{lead.companyName}</h1>
                <p className="text-muted-foreground">
                  {lead.decisionMakerName ? `${lead.decisionMakerName}${lead.decisionMakerTitle ? ` (${lead.decisionMakerTitle})` : ""}` : lead.ownerName || "No contact info available"}
                </p>
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-2">
              <div className="text-4xl font-extrabold text-foreground">{lead.score} <span className="text-sm font-medium text-muted-foreground">Score</span></div>
              <div className="flex flex-wrap gap-2 justify-end">
                {lead.buyingIntent && lead.buyingIntent !== "UNKNOWN" && (
                  <div className={cn("inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold", ic.bg, ic.color)}>
                    {ic.label}
                  </div>
                )}
                <div className={cn("inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold", pc.bg, pc.color)}>
                  {lead.priority === "HOT" && <Flame className="h-3 w-3" />}
                  {lead.priority}
                </div>
                <div className={cn("inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold", sc.bg, sc.color)}>
                  {lead.status}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-2">Contact Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {lead.contactEmail && (
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0"><Mail className="h-4 w-4" /></div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Email</p>
                    <a href={`mailto:${lead.contactEmail}`} className="text-sm font-medium text-foreground hover:text-primary truncate block">{lead.contactEmail}</a>
                  </div>
                </div>
              )}
              {lead.contactPhone && (
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center text-green-600 dark:text-green-400 shrink-0"><Phone className="h-4 w-4" /></div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <span className="text-sm font-medium text-foreground truncate block">{lead.contactPhone}</span>
                  </div>
                </div>
              )}
              {lead.companyWebsite && (
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0"><Globe className="h-4 w-4" /></div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Website</p>
                    <a href={lead.companyWebsite} target="_blank" className="text-sm font-medium text-foreground hover:text-primary truncate flex items-center gap-1">{lead.companyDomain || "Visit Site"} <ExternalLink className="h-3 w-3" /></a>
                  </div>
                </div>
              )}
              {(lead.decisionMakerLinkedin || lead.linkedinUrl) && (
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-cyan-100 dark:bg-cyan-900/40 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0"><Link2 className="h-4 w-4" /></div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">LinkedIn</p>
                    <a href={lead.decisionMakerLinkedin || lead.linkedinUrl!} target="_blank" className="text-sm font-medium text-foreground hover:text-primary truncate block">View Profile</a>
                  </div>
                </div>
              )}
            </div>

            {lead.summary && (
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-2 mb-3">Company Summary</h3>
                <p className="text-sm text-foreground leading-relaxed">{lead.summary}</p>
              </div>
            )}
            
            {lead.scoreReasoning && (
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-2 mb-3">Score Reasoning</h3>
                <p className="text-sm text-foreground leading-relaxed italic border-l-2 border-indigo-200 pl-3 py-1">{lead.scoreReasoning}</p>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-2">AI Intelligence</h3>
            
            {lead.decisionMakerName ? (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/40 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-amber-600" />
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide">Decision Maker Detected</span>
                </div>
                <p className="text-sm font-bold text-foreground">{lead.decisionMakerName}</p>
                {lead.decisionMakerTitle && <p className="text-xs text-muted-foreground mt-0.5">{lead.decisionMakerTitle}</p>}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-muted/30 border border-border">
                <p className="text-sm text-muted-foreground text-center">No decision maker identified yet.</p>
              </div>
            )}

            {lead.strategicInsights && (
              <div className="p-4 rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800/40 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="h-4 w-4 text-violet-600" />
                  <span className="text-xs font-bold text-violet-700 dark:text-violet-400 uppercase tracking-wide">Strategic Analysis</span>
                </div>
                <p className="text-sm text-foreground leading-relaxed">{lead.strategicInsights}</p>
              </div>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              {lead.fundingStage && <span className="text-xs font-bold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 border border-green-100 dark:border-green-800/40 rounded-lg px-3 py-1.5 shadow-sm">💰 {lead.fundingStage}</span>}
              {lead.techStack && <span className="text-xs font-bold text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/30 border border-cyan-100 dark:border-cyan-800/40 rounded-lg px-3 py-1.5 shadow-sm flex items-center gap-1.5"><Cpu className="h-3.5 w-3.5" />{lead.techStack}</span>}
              {lead.hiringSignals && <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800/40 rounded-lg px-3 py-1.5 shadow-sm flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5" />Hiring Spree</span>}
            </div>

            {newsItems.length > 0 && (
              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Newspaper className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wide">Recent News</span>
                </div>
                <div className="space-y-3">
                  {newsItems.map((news, ni) => (
                    <a key={ni} href={news.url} target="_blank" className="group block">
                      <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{news.title}</p>
                      {news.date && <span className="text-xs text-muted-foreground">{news.date}</span>}
                    </a>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
        
        <div className="p-6 border-t border-border bg-muted/5 flex flex-wrap justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground">Lead from campaign: <span className="font-bold text-foreground">{lead.campaign.name}</span></p>
          <div className="flex gap-3">
            <button
              onClick={() => intelligenceMut.mutate()}
              disabled={intelligenceMut.isPending}
              className="inline-flex items-center gap-2 text-sm font-bold text-violet-600 dark:text-violet-400 hover:text-violet-700 px-4 py-2 rounded-xl bg-violet-50 dark:bg-violet-900/30 hover:bg-violet-100 dark:hover:bg-violet-900/50 transition-all shadow-sm disabled:opacity-50"
            >
              {intelligenceMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {intelligenceMut.isPending ? "Analyzing..." : "Refresh Intelligence"}
            </button>
            <button 
              onClick={() => deleteMut.mutate()} 
              disabled={deleteMut.isPending} 
              className="inline-flex items-center gap-2 text-sm font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 px-4 py-2 rounded-xl bg-rose-50 dark:bg-rose-900/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-all shadow-sm disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" /> {deleteMut.isPending ? "Deleting..." : "Delete Lead"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LeadDetailPage() {
  return (
    <Suspense fallback={<div className="space-y-5"><div className="h-8 w-24 skeleton rounded-lg mb-6"></div><div className="h-64 skeleton rounded-2xl"></div></div>}>
      <LeadDetailPageInner />
    </Suspense>
  );
}
