"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import {
  ArrowLeft, Play, Download, CheckCircle2, Loader2, XCircle, Clock, Flame,
  Mail, Phone, Globe, Link2, Trash2, ExternalLink, Brain, TrendingUp,
  Newspaper, Briefcase, Cpu, Users, Sparkles
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import { useState } from "react";

interface Lead {
  id: string; companyName: string; companyDomain: string | null; companyWebsite: string | null;
  ownerName: string | null; contactEmail: string | null; contactPhone: string | null; summary: string | null;
  linkedinUrl: string | null; employeeCount: string | null; revenue: string | null;
  score: number; priority: string; scoreReasoning: string | null; status: string; source: string | null;
  enrichmentSource: string | null; createdAt: string;
  // Intelligence fields
  decisionMakerName: string | null; decisionMakerTitle: string | null;
  decisionMakerEmail: string | null; decisionMakerLinkedin: string | null;
  recentNews: string | null; fundingStage: string | null; hiringSignals: string | null;
  techStack: string | null; strategicInsights: string | null; buyingIntent: string | null;
}

interface CampaignDetail {
  id: string; name: string; query: string; industry: string | null; location: string | null;
  type: string; status: string; totalFound: number; progress: number; createdAt: string; leads: Lead[];
}

const pCfg: Record<string, { color: string; bg: string; border: string }> = {
  HOT: { color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-200" },
  HIGH: { color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
  MEDIUM: { color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-200" },
  LOW: { color: "text-slate-500", bg: "bg-slate-100", border: "border-slate-200" },
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

const typeCfg: Record<string, { label: string; color: string; bg: string }> = {
  LOCAL: { label: "Local Business", color: "text-emerald-700", bg: "bg-emerald-50" },
  COMPANY: { label: "Company Intel", color: "text-indigo-700", bg: "bg-indigo-50" },
  PEOPLE: { label: "Decision Makers", color: "text-amber-700", bg: "bg-amber-50" },
};

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [expandedLead, setExpandedLead] = useState<string | null>(null);
  const [analyzingLead, setAnalyzingLead] = useState<string | null>(null);

  const { data: campaign, isLoading } = useQuery<CampaignDetail>({
    queryKey: ["campaign", id],
    queryFn: () => fetch(`/api/campaigns/${id}`).then(r => r.json()),
    refetchInterval: 3000,
  });

  const runMut = useMutation({
    mutationFn: () => fetch(`/api/campaigns/${id}/run`, { method: "POST" }),
    onSuccess: () => { toast.success("Pipeline started"); qc.invalidateQueries({ queryKey: ["campaign", id] }); },
  });

  const exportMut = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = { campaignId: id };
      if (selectedLeads.size > 0) body.ids = Array.from(selectedLeads);
      const res = await fetch("/api/leads/export", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `leads-${campaign?.name || "export"}.csv`; a.click();
      URL.revokeObjectURL(url);
    },
    onSuccess: () => toast.success("CSV exported!"),
  });

  const updateStatusMut = useMutation({
    mutationFn: async (args: { ids: string[]; status: string }) => {
      await fetch("/api/leads", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(args) });
    },
    onSuccess: () => { toast.success("Status updated"); qc.invalidateQueries({ queryKey: ["campaign", id] }); setSelectedLeads(new Set()); },
  });

  const intelligenceMut = useMutation({
    mutationFn: async (leadId: string) => {
      setAnalyzingLead(leadId);
      const res = await fetch(`/api/leads/${leadId}/intelligence`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Intelligence analysis failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Intelligence analysis complete!");
      qc.invalidateQueries({ queryKey: ["campaign", id] });
      setAnalyzingLead(null);
    },
    onError: (err) => {
      toast.error("Intelligence failed: " + err.message);
      setAnalyzingLead(null);
    },
  });

  const toggleSelect = (leadId: string) => {
    setSelectedLeads(prev => { const n = new Set(prev); n.has(leadId) ? n.delete(leadId) : n.add(leadId); return n; });
  };
  const toggleAll = () => {
    if (!campaign?.leads) return;
    setSelectedLeads(prev => prev.size === campaign.leads.length ? new Set() : new Set(campaign.leads.map(l => l.id)));
  };

  if (isLoading) return <div className="space-y-4"><div className="skeleton h-20 rounded-2xl" /><div className="skeleton h-96 rounded-2xl" /></div>;
  if (!campaign) return <p className="text-center text-muted-foreground py-20">Campaign not found</p>;

  const isRunning = campaign.status === "RUNNING";
  const campaignTypeInfo = typeCfg[campaign.type] || typeCfg.LOCAL;
  const hasIntelligence = campaign.type === "COMPANY" || campaign.type === "PEOPLE";

  return (
    <div className="space-y-5">
      <Link href="/campaigns" className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" /> Campaigns
      </Link>

      {/* Campaign Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-card border border-border p-5 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-bold">{campaign.name}</h2>
              <span className={cn("text-[10px] font-bold rounded-md px-2 py-0.5", campaignTypeInfo.bg, campaignTypeInfo.color)}>
                {campaignTypeInfo.label}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{campaign.query}</p>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-[11px] text-muted-foreground">{format(new Date(campaign.createdAt), "MMM d, yyyy 'at' h:mm a")}</span>
              {campaign.industry && <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 rounded-md px-2 py-0.5">{campaign.industry}</span>}
              {campaign.location && <span className="text-[10px] font-bold text-violet-600 bg-violet-50 rounded-md px-2 py-0.5">{campaign.location}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isRunning && <button onClick={() => runMut.mutate()} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 text-emerald-700 px-3 py-2 text-xs font-bold hover:bg-emerald-100 transition-colors"><Play className="h-3.5 w-3.5" />{campaign.status === "COMPLETED" ? "Re-run" : "Run"}</button>}
            <button onClick={() => exportMut.mutate()} className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 text-indigo-700 px-3 py-2 text-xs font-bold hover:bg-indigo-100 transition-colors"><Download className="h-3.5 w-3.5" />Export CSV</button>
          </div>
        </div>
        {isRunning && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-amber-600 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Pipeline running...</span>
              <span className="text-[11px] font-bold text-muted-foreground">{campaign.progress}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500" style={{ width: `${campaign.progress}%` }} />
            </div>
          </div>
        )}
      </motion.div>

      {/* Bulk Actions */}
      {selectedLeads.size > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl bg-indigo-50 border border-indigo-200 px-4 py-3 flex items-center justify-between">
          <span className="text-xs font-bold text-indigo-700">{selectedLeads.size} selected</span>
          <div className="flex items-center gap-2">
            {["VERIFIED","CONTACTED","CONVERTED","DISCARDED"].map(s => (
              <button key={s} onClick={() => updateStatusMut.mutate({ ids: Array.from(selectedLeads), status: s })} className={cn("text-[10px] font-bold px-2.5 py-1 rounded-lg transition-colors", sCfg[s]?.bg, sCfg[s]?.color, "hover:opacity-80")}>{s}</button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Lead Table */}
      <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <input type="checkbox" checked={selectedLeads.size === campaign.leads.length && campaign.leads.length > 0} onChange={toggleAll} className="h-3.5 w-3.5 rounded border-border" />
            <span className="text-xs font-bold text-foreground">{campaign.leads.length} Leads</span>
            {hasIntelligence && <span className="text-[10px] font-bold text-violet-600 bg-violet-50 rounded-md px-2 py-0.5 flex items-center gap-1"><Brain className="h-2.5 w-2.5" />AI Intel</span>}
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground">
            <span>Sorted by score</span>
          </div>
        </div>

        {campaign.leads.length === 0 ? (
          <div className="py-16 text-center"><p className="text-sm text-muted-foreground">{isRunning ? "Pipeline is running... leads will appear here" : "No leads found. Run the pipeline to generate leads."}</p></div>
        ) : (
          <div className="divide-y divide-border">
            {campaign.leads.map((lead, i) => {
              const pc = pCfg[lead.priority] || pCfg.MEDIUM;
              const sc = sCfg[lead.status] || sCfg.NEW;
              const ic = intentCfg[lead.buyingIntent || "UNKNOWN"] || intentCfg.UNKNOWN;
              const isExpanded = expandedLead === lead.id;
              const isAnalyzing = analyzingLead === lead.id;
              let newsItems: Array<{title: string; snippet: string; date: string; url: string}> = [];
              try { if (lead.recentNews) newsItems = JSON.parse(lead.recentNews); } catch {}

              return (
                <motion.div key={lead.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
                  <div className={cn("px-5 py-3 hover:bg-accent/30 transition-all cursor-pointer", isExpanded && "bg-accent/20")} onClick={() => setExpandedLead(isExpanded ? null : lead.id)}>
                    <div className="flex items-center gap-3">
                      <input type="checkbox" checked={selectedLeads.has(lead.id)} onChange={(e) => { e.stopPropagation(); toggleSelect(lead.id); }} onClick={e => e.stopPropagation()} className="h-3.5 w-3.5 rounded border-border shrink-0" />
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-100 to-violet-100 text-indigo-600 text-[10px] font-bold overflow-hidden z-0">
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
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold truncate">{lead.companyName}</p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {lead.decisionMakerName ? `${lead.decisionMakerName}${lead.decisionMakerTitle ? ` (${lead.decisionMakerTitle})` : ""}` : lead.ownerName || "No contact"}
                            {lead.contactEmail ? ` • ${lead.contactEmail}` : ""}
                          </p>
                        </div>
                      </div>
                      {lead.buyingIntent && lead.buyingIntent !== "UNKNOWN" && (
                        <div className={cn("hidden sm:inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold shrink-0", ic.bg, ic.color)}>
                          {ic.label}
                        </div>
                      )}
                      <div className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold shrink-0", pc.bg, pc.color)}>
                        {lead.priority === "HOT" && <Flame className="h-2.5 w-2.5" />}{lead.priority}
                      </div>
                      <div className="w-12 text-right shrink-0"><span className="text-sm font-extrabold">{lead.score}</span></div>
                      <div className={cn("rounded-md px-2 py-0.5 text-[10px] font-bold shrink-0", sc.bg, sc.color)}>{lead.status}</div>
                    </div>
                  </div>
                  {/* Expanded Detail */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-5 pb-4 bg-accent/10 border-t border-border overflow-hidden">
                        {/* Contact Info */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
                          {lead.contactEmail && <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" /><a href={`mailto:${lead.contactEmail}`} className="text-xs font-medium text-primary truncate hover:underline">{lead.contactEmail}</a></div>}
                          {lead.contactPhone && <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" /><span className="text-xs font-medium truncate">{lead.contactPhone}</span></div>}
                          {lead.companyWebsite && <div className="flex items-center gap-2"><Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" /><a href={lead.companyWebsite} target="_blank" className="text-xs font-medium text-primary truncate hover:underline flex items-center gap-1">{lead.companyDomain}<ExternalLink className="h-2.5 w-2.5" /></a></div>}
                          {(lead.decisionMakerLinkedin || lead.linkedinUrl) && <div className="flex items-center gap-2"><Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" /><a href={lead.decisionMakerLinkedin || lead.linkedinUrl!} target="_blank" className="text-xs font-medium text-primary truncate hover:underline">LinkedIn</a></div>}
                        </div>

                        {lead.summary && <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">{lead.summary}</p>}
                        {lead.scoreReasoning && <p className="text-[11px] text-muted-foreground mt-2 italic border-l-2 border-indigo-200 pl-2">{lead.scoreReasoning}</p>}

                        {/* Decision Maker Card */}
                        {lead.decisionMakerName && (
                          <div className="mt-4 p-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100">
                            <div className="flex items-center gap-2 mb-1">
                              <Users className="h-3.5 w-3.5 text-amber-600" />
                              <span className="text-[11px] font-bold text-amber-700">Decision Maker</span>
                            </div>
                            <p className="text-xs font-bold text-foreground">{lead.decisionMakerName}</p>
                            {lead.decisionMakerTitle && <p className="text-[10px] text-muted-foreground">{lead.decisionMakerTitle}</p>}
                            {lead.decisionMakerEmail && <p className="text-[10px] text-primary mt-0.5">{lead.decisionMakerEmail}</p>}
                          </div>
                        )}

                        {/* Strategic Insights */}
                        {lead.strategicInsights && (
                          <div className="mt-3 p-3 rounded-xl bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-100">
                            <div className="flex items-center gap-2 mb-1">
                              <Brain className="h-3.5 w-3.5 text-violet-600" />
                              <span className="text-[11px] font-bold text-violet-700">AI Strategic Analysis</span>
                            </div>
                            <p className="text-[11px] text-foreground leading-relaxed">{lead.strategicInsights}</p>
                          </div>
                        )}

                        {/* Intelligence Tags */}
                        <div className="flex items-center gap-2 mt-3 flex-wrap">
                          {lead.employeeCount && <span className="text-[10px] font-bold text-foreground bg-muted rounded-md px-2 py-0.5">{lead.employeeCount} employees</span>}
                          {lead.revenue && <span className="text-[10px] font-bold text-foreground bg-muted rounded-md px-2 py-0.5">{lead.revenue}</span>}
                          {lead.fundingStage && <span className="text-[10px] font-bold text-green-700 bg-green-50 rounded-md px-2 py-0.5">💰 {lead.fundingStage}</span>}
                          {lead.techStack && <span className="text-[10px] font-bold text-cyan-700 bg-cyan-50 rounded-md px-2 py-0.5 flex items-center gap-1"><Cpu className="h-2.5 w-2.5" />{lead.techStack}</span>}
                          {lead.buyingIntent && lead.buyingIntent !== "UNKNOWN" && (
                            <span className={cn("text-[10px] font-bold rounded-md px-2 py-0.5", ic.bg, ic.color)}>{ic.label}</span>
                          )}
                          {lead.enrichmentSource && <span className="text-[10px] font-bold text-violet-600 bg-violet-50 rounded-md px-2 py-0.5">via {lead.enrichmentSource}</span>}
                        </div>

                        {/* Hiring Signals */}
                        {lead.hiringSignals && (
                          <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                            <div className="flex items-center gap-2 mb-1">
                              <Briefcase className="h-3.5 w-3.5 text-emerald-600" />
                              <span className="text-[11px] font-bold text-emerald-700">Hiring Signals</span>
                            </div>
                            <p className="text-[11px] text-foreground leading-relaxed">{lead.hiringSignals}</p>
                          </div>
                        )}

                        {/* Recent News */}
                        {newsItems.length > 0 && (
                          <div className="mt-3 p-3 rounded-xl bg-blue-50 border border-blue-100">
                            <div className="flex items-center gap-2 mb-2">
                              <Newspaper className="h-3.5 w-3.5 text-blue-600" />
                              <span className="text-[11px] font-bold text-blue-700">Recent News</span>
                            </div>
                            <div className="space-y-2">
                              {newsItems.slice(0, 3).map((news, ni) => (
                                <div key={ni} className="flex items-start gap-2">
                                  <div className="h-1.5 w-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                                  <div className="min-w-0">
                                    <a href={news.url} target="_blank" className="text-[11px] font-medium text-foreground hover:text-primary transition-colors line-clamp-1">{news.title}</a>
                                    {news.date && <span className="text-[10px] text-muted-foreground ml-2">{news.date}</span>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                          <button
                            onClick={(e) => { e.stopPropagation(); intelligenceMut.mutate(lead.id); }}
                            disabled={isAnalyzing || intelligenceMut.isPending}
                            className="inline-flex items-center gap-1.5 text-[10px] font-bold text-violet-600 hover:text-violet-700 px-2.5 py-1.5 rounded-lg hover:bg-violet-50 transition-all disabled:opacity-50"
                          >
                            {isAnalyzing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                            {isAnalyzing ? "Analyzing..." : "Run AI Intelligence"}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
