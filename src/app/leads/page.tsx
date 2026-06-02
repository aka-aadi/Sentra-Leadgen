"use client";

import { Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Download, Flame, Mail, Phone, Globe, Link2, Search, ExternalLink,
  Filter, Trash2, Brain, Users, Newspaper, Briefcase, Cpu, Sparkles, Loader2,
  LayoutGrid, List, ChevronLeft, ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface Lead {
  id: string; companyName: string; companyDomain: string | null; companyWebsite: string | null;
  ownerName: string | null; contactEmail: string | null; contactPhone: string | null; summary: string | null;
  linkedinUrl: string | null; score: number; priority: string; scoreReasoning: string | null; status: string;
  campaign: { name: string };
  decisionMakerName: string | null; decisionMakerTitle: string | null;
  decisionMakerEmail: string | null; decisionMakerLinkedin: string | null;
  recentNews: string | null; fundingStage: string | null; hiringSignals: string | null;
  techStack: string | null; strategicInsights: string | null; buyingIntent: string | null;
}

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

const badgeColors = [
  "text-blue-600 bg-blue-50/50 border-blue-100/50",
  "text-violet-600 bg-violet-50/50 border-violet-100/50",
  "text-fuchsia-600 bg-fuchsia-50/50 border-fuchsia-100/50",
  "text-pink-600 bg-pink-50/50 border-pink-100/50",
  "text-rose-600 bg-rose-50/50 border-rose-100/50",
  "text-orange-600 bg-orange-50/50 border-orange-100/50",
  "text-emerald-600 bg-emerald-50/50 border-emerald-100/50",
  "text-cyan-600 bg-cyan-50/50 border-cyan-100/50"
];

function getBadgeColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return badgeColors[Math.abs(hash) % badgeColors.length];
}

function LeadsPageInner() {
  const qc = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  // All filter state lives in the URL — this is the single source of truth.
  // This means navigating back with the correct URL always restores the exact state.
  const search = searchParams.get("search") || "";
  const filterPriority = searchParams.get("priority") || "";
  const filterStatus = searchParams.get("status") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 12;

  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [expandedLead, setExpandedLead] = useState<string | null>(null);
  const [analyzingLead, setAnalyzingLead] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  // Local input value for search so typing feels instant
  const [searchInput, setSearchInput] = useState(search);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep local search input in sync if URL changes (e.g. from global header search)
  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  // Helper: update URL params while preserving existing ones
  const updateParams = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (v) params.set(k, v);
      else params.delete(k);
    });
    // Always reset to page 1 when a filter changes
    params.set("page", updates.page ?? "1");
    router.replace(`/leads?${params.toString()}`, { scroll: false });
  };

  const setPage = (updater: number | ((p: number) => number)) => {
    const next = typeof updater === "function" ? updater(page) : updater;
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(next));
    router.push(`/leads?${params.toString()}`, { scroll: false });
  };

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      updateParams({ search: value, page: "1" });
    }, 350);
  };

  const handlePriorityChange = (value: string) => updateParams({ priority: value, page: "1" });
  const handleStatusChange = (value: string) => updateParams({ status: value, page: "1" });

  const { data, isLoading } = useQuery<{ leads: Lead[]; total: number }>({
    queryKey: ["leads", search, filterPriority, filterStatus, page],
    queryFn: () => {
      const params = new URLSearchParams({ limit: limit.toString(), page: page.toString(), sortBy: "createdAt", sortOrder: "desc" });
      if (search) params.set("search", search);
      if (filterPriority) params.set("priority", filterPriority);
      if (filterStatus) params.set("status", filterStatus);
      return fetch(`/api/leads?${params}`).then(r => r.json());
    },
    refetchInterval: 5000,
  });

  const totalPages = Math.ceil((data?.total || 0) / limit);

  // Mutations
  const updateMut = useMutation({
    mutationFn: async (args: { ids: string[]; status: string }) => {
      await fetch("/api/leads", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(args) });
    },
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["leads"] }); setSelectedLeads(new Set()); },
  });

  const deleteMut = useMutation({
    mutationFn: async (ids: string[]) => {
      if (!confirm(`Are you sure you want to delete ${ids.length} leads?`)) return;
      const res = await fetch("/api/leads/bulk-delete", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }) 
      });
      if (!res.ok) throw new Error("Delete failed");
      return res.json();
    },
    onSuccess: () => { toast.success("Leads deleted"); qc.invalidateQueries({ queryKey: ["leads"] }); setSelectedLeads(new Set()); },
    onError: () => { toast.error("Failed to delete leads. Please check server logs."); },
  });

  const exportMut = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {};
      if (filterPriority) body.priority = filterPriority;
      if (filterStatus) body.status = filterStatus;
      if (selectedLeads.size > 0) body.ids = Array.from(selectedLeads);
      const res = await fetch("/api/leads/export", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "leads-export.csv"; a.click();
      URL.revokeObjectURL(url);
    },
    onSuccess: () => toast.success("CSV exported!"),
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
      qc.invalidateQueries({ queryKey: ["leads"] });
      setAnalyzingLead(null);
    },
    onError: (err) => {
      toast.error("Intelligence failed: " + err.message);
      setAnalyzingLead(null);
    },
  });

  const toggleSelect = (id: string) => setSelectedLeads(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleSelectAll = () => {
    if (selectedLeads.size === (data?.leads.length || 0)) setSelectedLeads(new Set());
    else setSelectedLeads(new Set(data?.leads?.map(l => l.id) || []));
  };

  const renderLeadDetails = (lead: Lead) => {
    const isAnalyzing = analyzingLead === lead.id;
    let newsItems: Array<{title: string; snippet: string; date: string; url: string}> = [];
    try { if (lead.recentNews) newsItems = JSON.parse(lead.recentNews); } catch {}

    return (
      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className={cn("overflow-hidden", viewMode === "list" ? "px-5 pb-4 bg-accent/10 border-t border-border" : "px-4 pb-4")}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
          {lead.contactEmail && <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-muted-foreground" /><a href={`mailto:${lead.contactEmail}`} className="text-xs text-primary truncate hover:underline">{lead.contactEmail}</a></div>}
          {lead.contactPhone && <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-xs truncate">{lead.contactPhone}</span></div>}
          {lead.companyWebsite && <div className="flex items-center gap-2"><Globe className="h-3.5 w-3.5 text-muted-foreground" /><a href={lead.companyWebsite} target="_blank" className="text-xs text-primary truncate hover:underline flex items-center gap-1">{lead.companyDomain}<ExternalLink className="h-2.5 w-2.5" /></a></div>}
          {(lead.decisionMakerLinkedin || lead.linkedinUrl) && <div className="flex items-center gap-2"><Link2 className="h-3.5 w-3.5 text-muted-foreground" /><a href={lead.decisionMakerLinkedin || lead.linkedinUrl!} target="_blank" className="text-xs text-primary truncate hover:underline">LinkedIn</a></div>}
        </div>
        {lead.summary && <p className="text-[11px] text-muted-foreground mt-3">{lead.summary}</p>}
        {lead.scoreReasoning && <p className="text-[11px] text-muted-foreground mt-2 italic border-l-2 border-indigo-200 pl-2">{lead.scoreReasoning}</p>}

        {/* Decision Maker Card */}
        {lead.decisionMakerName && (
          <div className="mt-3 p-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-3.5 w-3.5 text-amber-600" />
              <span className="text-[11px] font-bold text-amber-700">Decision Maker</span>
            </div>
            <p className="text-xs font-bold text-foreground">{lead.decisionMakerName}</p>
            {lead.decisionMakerTitle && <p className="text-[10px] text-muted-foreground">{lead.decisionMakerTitle}</p>}
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
          {lead.fundingStage && <span className="text-[10px] font-bold text-green-700 bg-green-50 rounded-md px-2 py-0.5">💰 {lead.fundingStage}</span>}
          {lead.techStack && <span className="text-[10px] font-bold text-cyan-700 bg-cyan-50 rounded-md px-2 py-0.5 flex items-center gap-1"><Cpu className="h-2.5 w-2.5" />{lead.techStack}</span>}
          {lead.hiringSignals && <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 rounded-md px-2 py-0.5 flex items-center gap-1"><Briefcase className="h-2.5 w-2.5" />Hiring</span>}
        </div>

        {/* Recent News */}
        {newsItems.length > 0 && (
          <div className="mt-3 p-3 rounded-xl bg-blue-50 border border-blue-100">
            <div className="flex items-center gap-2 mb-2">
              <Newspaper className="h-3.5 w-3.5 text-blue-600" />
              <span className="text-[11px] font-bold text-blue-700">Recent News</span>
            </div>
            <div className="space-y-1.5">
              {newsItems.slice(0, 3).map((news, ni) => (
                <a key={ni} href={news.url} target="_blank" className="text-[10px] text-foreground hover:text-primary transition-colors block truncate">
                  • {news.title} {news.date && <span className="text-muted-foreground">({news.date})</span>}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 pt-4 border-t border-border flex justify-between">
          <button
            onClick={(e) => { e.stopPropagation(); intelligenceMut.mutate(lead.id); }}
            disabled={isAnalyzing || intelligenceMut.isPending}
            className="inline-flex items-center gap-1.5 text-[10px] font-bold text-violet-600 hover:text-violet-700 px-2.5 py-1.5 rounded-lg hover:bg-violet-50 transition-all disabled:opacity-50"
          >
            {isAnalyzing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            {isAnalyzing ? "Analyzing..." : "Run AI Intelligence"}
          </button>
          <button onClick={() => deleteMut.mutate([lead.id])} disabled={deleteMut.isPending} className="text-[10px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-rose-50 transition-all disabled:opacity-50">
            <Trash2 className="h-3 w-3" /> {deleteMut.isPending ? "Deleting..." : "Delete Lead"}
          </button>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div><h2 className="text-lg font-bold">All Leads</h2><p className="text-xs text-muted-foreground">{data?.total || 0} leads across all campaigns</p></div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-muted/50 p-1 rounded-xl border border-border">
            <button onClick={() => setViewMode("card")} className={cn("p-1.5 rounded-lg transition-colors", viewMode === "card" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}><LayoutGrid className="h-4 w-4" /></button>
            <button onClick={() => setViewMode("list")} className={cn("p-1.5 rounded-lg transition-colors", viewMode === "list" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}><List className="h-4 w-4" /></button>
          </div>
          <button onClick={() => exportMut.mutate()} className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 text-indigo-700 px-3 py-2 text-xs font-bold hover:bg-indigo-100 transition-colors"><Download className="h-3.5 w-3.5" />Export</button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input value={searchInput} onChange={e => handleSearchChange(e.target.value)} placeholder="Search companies, contacts..." className="w-full h-9 rounded-xl bg-card border border-border pl-9 pr-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          {["","HOT","HIGH","MEDIUM","LOW"].map(p => (
            <button key={p} onClick={() => handlePriorityChange(p)} className={cn("text-[10px] font-bold px-2.5 py-1 rounded-lg transition-colors", filterPriority === p ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground")}>{p || "All"}</button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          {["","NEW","VERIFIED","CONTACTED","CONVERTED","DISCARDED"].map(s => (
            <button key={s} onClick={() => handleStatusChange(s)} className={cn("text-[10px] font-bold px-2.5 py-1 rounded-lg transition-colors", filterStatus === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground")}>{s || "All"}</button>
          ))}
        </div>
      </div>

      {/* Bulk actions */}
      {selectedLeads.size > 0 && (
        <div className="rounded-xl bg-indigo-50 border border-indigo-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <input type="checkbox" checked={selectedLeads.size > 0 && selectedLeads.size === (data?.leads.length || 0)} onChange={toggleSelectAll} className="h-3.5 w-3.5 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500" />
            <span className="text-xs font-bold text-indigo-700">{selectedLeads.size} selected</span>
          </div>
          <div className="flex gap-2">
            {["VERIFIED","CONTACTED","CONVERTED","DISCARDED"].map(s => (
              <button key={s} onClick={() => updateMut.mutate({ ids: Array.from(selectedLeads), status: s })} className={cn("text-[10px] font-bold px-2.5 py-1 rounded-lg", sCfg[s]?.bg, sCfg[s]?.color)}>{s}</button>
            ))}
            <div className="w-px h-6 bg-indigo-200 mx-1" />
            <button onClick={() => deleteMut.mutate(Array.from(selectedLeads))} disabled={deleteMut.isPending} className="flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors disabled:opacity-50">
              <Trash2 className="h-3 w-3" /> {deleteMut.isPending ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      )}

      {/* Select All (List View only) */}
      {viewMode === "list" && (
        <div className="flex items-center gap-3 px-5 py-2.5 bg-muted/20 border border-border rounded-xl mb-1">
          <input type="checkbox" checked={selectedLeads.size > 0 && selectedLeads.size === (data?.leads.length || 0)} onChange={toggleSelectAll} className="h-3.5 w-3.5 rounded border-border" />
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Select All</span>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className={viewMode === "card" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" : "space-y-2"}>
          {[...Array(viewMode === "card" ? 8 : 5)].map((_, i) => (
            <div key={i} className={cn("skeleton rounded-xl", viewMode === "card" ? "h-48" : "h-14")} />
          ))}
        </div>
      ) : (
        <>
          {/* List/Card View */}
          <div className={cn(
            viewMode === "list" 
              ? "rounded-2xl bg-card border border-border shadow-sm overflow-hidden divide-y divide-border" 
              : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          )}>
            {data?.leads?.map((lead, i) => {
              const pc = pCfg[lead.priority] || pCfg.MEDIUM;
              const sc = sCfg[lead.status] || sCfg.NEW;
              const ic = intentCfg[lead.buyingIntent || "UNKNOWN"] || intentCfg.UNKNOWN;
              const isExp = expandedLead === lead.id;

              if (viewMode === "card") {
                return (
                  <motion.div key={lead.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }} 
                    className="flex flex-col bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer"
                    onClick={() => router.push(`/leads/${lead.id}?from=${encodeURIComponent(`/leads?${searchParams.toString()}`)}`)}
                  >
                    <div className="p-5 flex flex-col flex-1">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex gap-3">
                          <input type="checkbox" checked={selectedLeads.has(lead.id)} onChange={() => toggleSelect(lead.id)} onClick={e => e.stopPropagation()} className="h-4 w-4 rounded border-border mt-1.5 shrink-0" />
                          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 text-indigo-600 text-sm font-bold shadow-sm overflow-hidden z-0">
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
                        </div>
                        <div className="text-right flex flex-col items-end">
                          <span className="text-2xl font-extrabold text-foreground leading-none">{lead.score}</span>
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <h3 className="font-bold text-base mb-1 truncate text-foreground">{lead.companyName}</h3>
                        {(lead.decisionMakerName || lead.ownerName) && (
                          <p className="text-xs text-muted-foreground truncate flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5 shrink-0" />
                            {lead.decisionMakerName ? `${lead.decisionMakerName}${lead.decisionMakerTitle ? ` (${lead.decisionMakerTitle})` : ""}` : lead.ownerName}
                          </p>
                        )}
                      </div>

                      {/* Extra info section */}
                      <div className="space-y-2.5 mb-5">
                        {(lead.contactEmail || lead.contactPhone) && (
                          <div className="flex flex-col gap-1.5">
                            {lead.contactEmail && (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
                                <Mail className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{lead.contactEmail}</span>
                              </div>
                            )}
                            {lead.contactPhone && (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
                                <Phone className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{lead.contactPhone}</span>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {lead.summary && (
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {lead.summary}
                          </p>
                        )}
                        
                        
                      </div>

                      <div className="mt-auto pt-4 border-t border-border/50 space-y-3">
                        {lead.campaign && (
                          <div>
                            <span className={cn("text-[10px] font-bold uppercase tracking-wider inline-flex px-2 py-1 rounded-md border", getBadgeColor(lead.campaign.name))}>
                              {lead.campaign.name}
                            </span>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2">
                          {lead.buyingIntent && lead.buyingIntent !== "UNKNOWN" && (
                            <div className={cn("rounded-md px-2.5 py-1 text-[10px] font-bold", ic.bg, ic.color)}>
                              {ic.label}
                            </div>
                          )}
                          <div className={cn("rounded-md px-2.5 py-1 text-[10px] font-bold", pc.bg, pc.color)}>
                            {lead.priority === "HOT" && <Flame className="h-3 w-3 inline mr-1 mb-0.5" />}
                            {lead.priority}
                          </div>
                          <div className={cn("rounded-md px-2.5 py-1 text-[10px] font-bold", sc.bg, sc.color)}>
                            {lead.status}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              }

              return (
                <motion.div key={lead.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
                  <div className={cn("px-5 py-3 hover:bg-accent/30 transition-all cursor-pointer", isExp && "bg-accent/20")} onClick={() => setExpandedLead(isExp ? null : lead.id)}>
                    <div className="flex items-center gap-3">
                      <input type="checkbox" checked={selectedLeads.has(lead.id)} onChange={() => toggleSelect(lead.id)} onClick={e => e.stopPropagation()} className="h-3.5 w-3.5 rounded border-border shrink-0" />
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
                          {lead.decisionMakerName ? `${lead.decisionMakerName}${lead.decisionMakerTitle ? ` (${lead.decisionMakerTitle})` : ""}` : lead.ownerName || "—"}
                          {lead.contactEmail ? ` • ${lead.contactEmail}` : ""}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold text-muted-foreground shrink-0 hidden md:block">{lead.campaign.name}</span>
                      {lead.buyingIntent && lead.buyingIntent !== "UNKNOWN" && (
                        <div className={cn("hidden lg:inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold shrink-0", ic.bg, ic.color)}>
                          {ic.label}
                        </div>
                      )}
                      <div className={cn("items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold shrink-0 hidden sm:inline-flex", pc.bg, pc.color)}>{lead.priority === "HOT" && <Flame className="h-2.5 w-2.5" />}{lead.priority}</div>
                      <span className="text-sm font-extrabold w-10 text-right shrink-0">{lead.score}</span>
                      <div className={cn("rounded-md px-2 py-0.5 text-[10px] font-bold shrink-0", sc.bg, sc.color)}>{lead.status}</div>
                    </div>
                  </div>
                  <AnimatePresence>
                    {isExp && renderLeadDetails(lead)}
                  </AnimatePresence>
                </motion.div>
              );
            })}
            {!data?.leads?.length && (
              <div className={cn("py-16 text-center text-sm text-muted-foreground", viewMode === "card" && "col-span-full")}>
                No leads found
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-xs text-muted-foreground">
                Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, data?.total || 0)} of {data?.total || 0} leads
              </p>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))} 
                  disabled={page === 1}
                  className="p-1.5 rounded-lg border border-border bg-card text-foreground disabled:opacity-50 hover:bg-accent transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="text-xs font-medium px-2">Page {page} of {totalPages}</div>
                <button 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                  disabled={page === totalPages}
                  className="p-1.5 rounded-lg border border-border bg-card text-foreground disabled:opacity-50 hover:bg-accent transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function LeadsPage() {
  return (
    <Suspense fallback={<div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="skeleton h-48 rounded-xl" />)}</div>}>
      <LeadsPageInner />
    </Suspense>
  );
}
