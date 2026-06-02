import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scrapeWebsite } from "@/lib/engine/scraper";
import { runIntelligencePipeline } from "@/lib/engine/intelligence";

// POST /api/leads/[id]/intelligence — run on-demand intelligence analysis for a lead
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const settings = await prisma.settings.findFirst();
  if (!settings?.googleSearchApiKey || !settings?.googleAiApiKey) {
    return NextResponse.json(
      { error: "Serper and Gemini API keys are required for intelligence analysis" },
      { status: 400 }
    );
  }

  try {
    // Scrape website for additional context
    let websiteText = "";
    if (lead.companyWebsite) {
      try {
        websiteText = await scrapeWebsite(lead.companyWebsite);
      } catch {
        // Website scraping may fail — continue without it
      }
    }

    const intelligence = await runIntelligencePipeline(
      lead.companyName,
      lead.companyDomain,
      websiteText,
      settings.googleSearchApiKey,
      settings.googleAiApiKey,
      settings.apolloApiKey
    );

    // Update the lead with intelligence data
    const updated = await prisma.lead.update({
      where: { id },
      data: {
        decisionMakerName: intelligence.decisionMakerName || lead.decisionMakerName,
        decisionMakerTitle: intelligence.decisionMakerTitle || lead.decisionMakerTitle,
        decisionMakerLinkedin: intelligence.decisionMakerLinkedin || lead.decisionMakerLinkedin,
        decisionMakerEmail: intelligence.decisionMakerEmail || lead.decisionMakerEmail,
        contactEmail: intelligence.decisionMakerEmail || lead.contactEmail,
        recentNews: intelligence.recentNews ? JSON.stringify(intelligence.recentNews) : lead.recentNews,
        fundingStage: intelligence.fundingStage || lead.fundingStage,
        hiringSignals: intelligence.hiringSignals || lead.hiringSignals,
        techStack: intelligence.techStack || lead.techStack,
        strategicInsights: intelligence.strategicInsights || lead.strategicInsights,
        buyingIntent: intelligence.buyingIntent !== "UNKNOWN" ? intelligence.buyingIntent : lead.buyingIntent,
        // Update owner name if decision maker found and owner was previously empty
        ownerName: intelligence.decisionMakerName || lead.ownerName,
        linkedinUrl: intelligence.decisionMakerLinkedin || lead.linkedinUrl,
      },
    });

    return NextResponse.json({ success: true, lead: updated });
  } catch (error: any) {
    console.error("Intelligence pipeline error:", error);
    return NextResponse.json(
      { error: error.message || "Intelligence analysis failed" },
      { status: 500 }
    );
  }
}
