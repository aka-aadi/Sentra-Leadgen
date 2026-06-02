"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Zap, Sparkles, Building2, MapPin, Search, ArrowLeft, AlertCircle, Users, Globe2, Store } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const campaignTypes = [
  {
    value: "LOCAL",
    label: "Local Business",
    icon: Store,
    desc: "Find local businesses with phone, address, ratings",
    color: "from-emerald-500 to-teal-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    textColor: "text-emerald-700",
  },
  {
    value: "COMPANY",
    label: "Company Intel",
    icon: Building2,
    desc: "Find companies with CEO, news, strategy & AI insights",
    color: "from-indigo-500 to-violet-600",
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    textColor: "text-indigo-700",
  },
  {
    value: "PEOPLE",
    label: "Decision Makers",
    icon: Users,
    desc: "Find CEOs, CTOs, founders & decision-makers",
    color: "from-amber-500 to-orange-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    textColor: "text-amber-700",
  },
];

const templatesByType: Record<string, Array<{ label: string; query: string; industry: string; location: string }>> = {
  LOCAL: [
    { label: "Luxury Hair Salons", query: "Premium luxury hair salons and spas", industry: "Beauty & Wellness", location: "Melbourne" },
    { label: "High-End MedSpas", query: "Luxury medical spa and aesthetic clinics", industry: "Beauty & Wellness", location: "Sydney" },
    { label: "Private Dental Clinics", query: "Independent private dental and orthodontic clinics", industry: "Healthcare", location: "Brisbane" },
    { label: "Boutique Fitness Studios", query: "Boutique pilates and yoga fitness studios", industry: "Health & Fitness", location: "Perth" },
    { label: "Nail & Beauty Bars", query: "Premium nail bars and beauty studios", industry: "Beauty & Wellness", location: "Toronto" },
    { label: "Chiropractic Centers", query: "Private chiropractic and physiotherapy centers", industry: "Healthcare", location: "Denver" },
    { label: "Independent Pharmacies", query: "Independent local retail pharmacies", industry: "Healthcare", location: "Seattle" },
    { label: "Boutique Cafes", query: "Boutique artisan coffee roasters and cafes", industry: "Food & Beverage", location: "Miami" },
  ],
  COMPANY: [
    { label: "Shopify Plus Brands", query: "D2C Shopify Plus e-commerce brands", industry: "E-commerce", location: "New York" },
    { label: "HealthTech Startups", query: "B2B healthcare technology and telemedicine startups", industry: "Healthcare", location: "San Francisco" },
    { label: "Sustainable Apparel", query: "Sustainable D2C e-commerce clothing apparel brands", industry: "E-commerce", location: "London" },
    { label: "Cosmetic Manufacturers", query: "Private label beauty and cosmetic manufacturers", industry: "Beauty & Wellness", location: "Texas" },
    { label: "Online Pharmacies", query: "D2C online pharmacy and telehealth e-commerce", industry: "Healthcare", location: "Chicago" },
    { label: "Salon Software", query: "B2B SaaS booking software for salons and spas", industry: "Technology", location: "Virginia" },
    { label: "Luxury Jewelry D2C", query: "Luxury jewelry D2C e-commerce brands", industry: "E-commerce", location: "Las Vegas" },
    { label: "B2B SaaS Series A", query: "B2B SaaS software startups recently funded Series A", industry: "Technology", location: "San Francisco" },
  ],
  PEOPLE: [
    { label: "D2C Beauty Founders", query: "Boutique organic skincare beauty brand founder owner", industry: "E-commerce", location: "Los Angeles" },
    { label: "Hospital Directors", query: "Private healthcare hospital medical director managing partner", industry: "Healthcare", location: "Toronto" },
    { label: "E-commerce CMOs", query: "Chief marketing officer D2C e-commerce brand", industry: "E-commerce", location: "Austin" },
    { label: "Salon Franchise Owners", query: "Multi-location hair salon franchise owner director", industry: "Beauty & Wellness", location: "Chicago" },
    { label: "Health Clinic Partners", query: "Private medical health clinic managing partner", industry: "Healthcare", location: "Boston" },
    { label: "Supply Chain VPs", query: "VP of supply chain operations e-commerce", industry: "E-commerce", location: "Dallas" },
    { label: "Biotech Research Heads", query: "Biotech research and development head director", industry: "Healthcare", location: "San Diego" },
    { label: "Cybersecurity Founders", query: "B2B cybersecurity startup founder or owner", industry: "Technology", location: "Atlanta" },
  ],
};

export default function NewCampaignPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [industry, setIndustry] = useState("");
  const [location, setLocation] = useState("");
  const [leadLimit, setLeadLimit] = useState(10);
  const [autoRun, setAutoRun] = useState(true);
  const [campaignType, setCampaignType] = useState("LOCAL");

  const createMut = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, query, industry, location, type: campaignType }),
      });
      if (!res.ok) throw new Error("Failed to create campaign");
      return res.json();
    },
    onSuccess: async (data) => {
      toast.success("Campaign created!");
      if (autoRun) {
        await fetch(`/api/campaigns/${data.id}/run`, { method: "POST" });
        toast.info("AI pipeline started...");
      }
      router.push(`/campaigns/${data.id}`);
    },
    onError: () => toast.error("Failed to create campaign"),
  });

  const suggestions = templatesByType[campaignType] || templatesByType.LOCAL;
  const activeType = campaignTypes.find(t => t.value === campaignType) || campaignTypes[0];

  return (
    <div className="w-full">
      <Link href="/campaigns" className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Campaigns
      </Link>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
        <div className={cn("bg-gradient-to-r px-6 py-5", activeType.color)}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">New AI Campaign</h2>
              <p className="text-xs text-white/80 font-medium">Configure your target search and let AI find leads</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Campaign Type Selector */}
          <div>
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2.5 block">Campaign Type</label>
            <div className="grid grid-cols-3 gap-2.5">
              {campaignTypes.map(type => {
                const Icon = type.icon;
                const isActive = campaignType === type.value;
                return (
                  <button
                    key={type.value}
                    onClick={() => { setCampaignType(type.value); setName(""); setQuery(""); setIndustry(""); setLocation(""); }}
                    className={cn(
                      "relative text-left p-3.5 rounded-xl border-2 transition-all duration-200",
                      isActive
                        ? `${type.border} ${type.bg} shadow-sm`
                        : "border-border hover:border-muted-foreground/20 hover:bg-muted/30"
                    )}
                  >
                    <div className={cn("flex items-center gap-2 mb-1.5", isActive ? type.textColor : "text-muted-foreground")}>
                      <Icon className="h-4 w-4" />
                      <span className="text-xs font-bold">{type.label}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">{type.desc}</p>
                    {isActive && (
                      <motion.div
                        layoutId="typeIndicator"
                        className={cn("absolute top-2 right-2 h-2 w-2 rounded-full bg-gradient-to-r", type.color)}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Intelligence Badge for COMPANY/PEOPLE */}
          <AnimatePresence>
            {(campaignType === "COMPANY" || campaignType === "PEOPLE") && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-3 rounded-xl bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-100 flex items-start gap-2.5">
                  <Globe2 className="h-4 w-4 text-violet-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[11px] font-bold text-violet-700">AI Intelligence Enabled</p>
                    <p className="text-[10px] text-violet-600/80 leading-relaxed mt-0.5">
                      This campaign will auto-analyze company news, identify decision-makers, detect hiring signals, and generate strategic insights using AI.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick Suggestions */}
          <div>
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Quick Start Templates</label>
            <div className="grid grid-cols-2 gap-2">
              {suggestions.map(s => (
                <button key={s.label} onClick={() => { setName(s.label); setQuery(s.query); setIndustry(s.industry); setLocation(s.location); }}
                  className="text-left p-3 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/5 transition-all">
                  <p className="text-xs font-bold text-foreground">{s.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{s.industry}{s.location ? ` • ${s.location}` : ""}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="h-px bg-border" />

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Campaign Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Premium Salons Kochi" className="w-full h-10 rounded-xl bg-muted/40 border border-border px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all" />
            </div>

            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5 block">
                <Search className="h-3 w-3" /> Search Query
              </label>
              <textarea value={query} onChange={e => setQuery(e.target.value)} placeholder={
                campaignType === "LOCAL" ? "e.g. Luxury hair salons and spas" :
                campaignType === "COMPANY" ? "e.g. AI SaaS startups in fintech" :
                "e.g. Marketing director digital agency"
              } rows={3} className="w-full rounded-xl bg-muted/40 border border-border px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all resize-none" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5 block">
                  <Building2 className="h-3 w-3" /> Industry
                </label>
                <input value={industry} onChange={e => setIndustry(e.target.value)} placeholder="e.g. Technology" className="w-full h-10 rounded-xl bg-muted/40 border border-border px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5 block">
                  <MapPin className="h-3 w-3" /> City / Location
                </label>
                <input value={location} onChange={e => setLocation(e.target.value)} placeholder={campaignType === "LOCAL" ? "e.g. Kochi" : "e.g. Bangalore (optional)"} className="w-full h-10 rounded-xl bg-muted/40 border border-border px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Lead Limit</label>
                <select value={leadLimit} onChange={e => setLeadLimit(Number(e.target.value))} className="w-full h-10 rounded-xl bg-muted/40 border border-border px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all">
                  <option value={5}>5 Leads (Quick)</option>
                  <option value={10}>10 Leads (Fast)</option>
                  <option value={20}>20 Leads</option>
                  <option value={50}>50 Leads</option>
                  <option value={100}>100 Leads (Slow)</option>
                </select>
              </div>
            </div>

            {(campaignType !== "LOCAL" && leadLimit > 10) && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                <p className="text-[10px] text-amber-700 leading-relaxed font-medium">
                  <strong>Note:</strong> Company/People campaigns with intelligence analysis take longer (~15s per lead) due to multiple API calls and AI processing.
                </p>
              </div>
            )}

            {(campaignType === "LOCAL" && leadLimit > 20) && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                <p className="text-[10px] text-amber-700 leading-relaxed font-medium">
                  <strong>Note:</strong> Higher limits take longer (approx 4s per lead) due to Gemini free-tier rate limits.
                </p>
              </div>
            )}

            <div className="flex items-center gap-2">
              <input type="checkbox" id="autoRun" checked={autoRun} onChange={e => setAutoRun(e.target.checked)} className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20" />
              <label htmlFor="autoRun" className="text-xs font-medium text-muted-foreground">Automatically run AI pipeline after creation</label>
            </div>
          </div>

          <button onClick={() => createMut.mutate()} disabled={!name || !query || createMut.isPending}
            className={cn(
              "w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r px-6 py-3 text-sm font-bold text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed",
              activeType.color,
              campaignType === "LOCAL" ? "shadow-emerald-500/20" :
              campaignType === "COMPANY" ? "shadow-indigo-500/20" :
              "shadow-amber-500/20"
            )}>
            {createMut.isPending ? <><Zap className="h-4 w-4 animate-pulse" /> Creating...</> : <><Zap className="h-4 w-4" /> Launch {activeType.label} Campaign</>}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
