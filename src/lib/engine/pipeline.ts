// Pipeline orchestrator — coordinates the full lead generation flow
// Supports 3 campaign types: LOCAL, COMPANY, PEOPLE
import { prisma } from "@/lib/prisma";
import { localSearch, companyWebSearch, peopleSearch, mockSearch, type SearchResult } from "./search";
import { scrapeWebsite } from "./scraper";
import { extractLeadData, extractFromSnippet } from "./extractor";
import { scoreLead, scoreLeadOffline } from "./scorer";
import { runIntelligencePipeline, type IntelligenceReport } from "./intelligence";

// Helper: track credit consumption for a service
async function trackCredit(service: "serper" | "apollo" | "gemini", amount = 1) {
  try {
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/settings/credits`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service, amount }),
    });
  } catch (e) {
    // Non-fatal — credit tracking should never break the pipeline
    console.warn("Credit tracking failed:", e);
  }
}

export async function runPipeline(campaignId: string) {
  try {
    // --- Initial Setup ---
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new Error("Campaign not found");

    const settings = await prisma.settings.findFirst();
    const campaignType = campaign.type || "LOCAL";

    // Read tool toggles
    const serperEnabled = settings?.serperEnabled ?? true;
    const apolloEnabled = settings?.apolloEnabled ?? true;
    const geminiEnabled = settings?.geminiEnabled ?? true;

    const hasSerperKey = serperEnabled && !!settings?.googleSearchApiKey;
    const hasGoogleAi = geminiEnabled && !!settings?.googleAiApiKey;
    const hasApolloKey = apolloEnabled && !!settings?.apolloApiKey;

    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "RUNNING", progress: 5, totalFound: 0 },
    });

    // --- Stage 1: Search (based on campaign type) ---
    let searchResults: SearchResult[] = [];

    if (hasSerperKey) {
      switch (campaignType) {
        case "COMPANY":
          searchResults = await companyWebSearch(
            campaign.query,
            settings!.googleSearchApiKey,
            campaign.location || undefined,
            campaign.leadLimit || 10,
            campaign.totalFound
          );
          break;
        case "PEOPLE":
          searchResults = await peopleSearch(
            campaign.query,
            settings!.googleSearchApiKey,
            campaign.location || undefined,
            campaign.leadLimit || 10,
            campaign.totalFound
          );
          break;
        case "LOCAL":
        default:
          searchResults = await localSearch(
            campaign.query,
            settings!.googleSearchApiKey,
            campaign.location || undefined,
            campaign.leadLimit || 10,
            campaign.totalFound
          );
          break;
      }
      // Track Serper credit for the search call
      await trackCredit("serper", 1);
    } else {
      searchResults = await mockSearch(campaign.query);
    }

    const totalResults = searchResults.length;
    if (totalResults === 0) {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: "FINISHED", progress: 100 },
      });
      return;
    }

    // --- Stage 2 & 3: Process each result ---
    for (let i = 0; i < searchResults.length; i++) {
      const result = searchResults[i];

      // Update progress bar immediately
      const progressPct = Math.round(((i + 1) / totalResults) * 100);
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { progress: progressPct },
      });

      try {
        // RATE LIMIT PREVENTION: 6s delay respects Gemini 15 RPM free tier
        await new Promise((resolve) => setTimeout(resolve, 6000));

        let extracted;
        let scoreResult;
        let websiteText = "";

        // ── Priority: capture contact fields from Serper Places directly ──
        // These are the most reliable data points — get them before any AI
        const directPhone = (result as any).phoneNumber || null;
        const directAddress = (result as any).address || null;
        const resultUrl = result.link || (result as any).website || "";

        try {
          if (!hasGoogleAi) throw new Error("Gemini disabled or no key");

          websiteText = await scrapeWebsite(resultUrl);
          extracted = await extractLeadData(websiteText, settings!.googleAiApiKey);
          await trackCredit("gemini", 1);

          scoreResult = await scoreLead(extracted, settings!.idealCustomerProfile || "", settings!.googleAiApiKey);
          await trackCredit("gemini", 1);
        } catch (aiError) {
          console.warn(`AI processing failed for ${resultUrl}, falling back to snippet:`, aiError);
          extracted = extractFromSnippet(result.title, result.snippet, resultUrl, directPhone, resultUrl);
          scoreResult = scoreLeadOffline(extracted);
        }

        // ── Intelligence Layer (COMPANY and PEOPLE types) ──
        let intelligence: IntelligenceReport | null = null;
        if (extracted.companyName !== "Unknown Company" && hasSerperKey && hasGoogleAi) {
          try {
            await new Promise((resolve) => setTimeout(resolve, 4000));
            intelligence = await runIntelligencePipeline(
              extracted.companyName,
              (() => {
                try {
                  if (!extracted.companyWebsite) return null;
                  const url = extracted.companyWebsite.startsWith("http") ? extracted.companyWebsite : `https://${extracted.companyWebsite}`;
                  return new URL(url).hostname;
                } catch { return null; }
              })(),
              websiteText,
              settings!.googleSearchApiKey,
              settings!.googleAiApiKey,
              hasApolloKey ? settings!.apolloApiKey : undefined
            );
            // Track: 1 Serper (news) + 1 Serper (DM search) + 1 Serper (hiring) + 1 Gemini (analysis)
            await trackCredit("serper", 3);
            await trackCredit("gemini", 1);
            if (hasApolloKey && intelligence?.decisionMakerName) {
              await trackCredit("apollo", 1);
            }
          } catch (intError) {
            console.warn(`Intelligence pipeline failed for ${extracted.companyName}:`, intError);
          }
        }

        // ── Deduplicate by name ──
        const existingLead = await prisma.lead.findFirst({
          where: { companyName: extracted.companyName },
          select: { id: true },
        });
        if (existingLead) {
          console.log(`Skipping duplicate lead: "${extracted.companyName}" already exists.`);
          continue;
        }

        // ── Deduplicate by domain ──
        const extractedDomain = (() => {
          try {
            if (!extracted.companyWebsite) return null;
            const url = extracted.companyWebsite.startsWith("http") ? extracted.companyWebsite : `https://${extracted.companyWebsite}`;
            return new URL(url).hostname.replace(/^www\./, "");
          } catch { return null; }
        })();

        if (extractedDomain) {
          const domainDuplicate = await prisma.lead.findFirst({
            where: { companyDomain: { contains: extractedDomain } },
            select: { id: true },
          });
          if (domainDuplicate) {
            console.log(`Skipping duplicate lead by domain: "${extractedDomain}" already exists.`);
            continue;
          }
        }

        // ── Save lead — contact fields are highest priority ──
        await prisma.lead.create({
          data: {
            campaignId,
            companyName: extracted.companyName,
            companyWebsite: resultUrl.includes("linkedin.com") ? extracted.companyWebsite : (extracted.companyWebsite || resultUrl || null),
            companyDomain: (() => {
              try {
                if (!extracted.companyWebsite) return null;
                const url = extracted.companyWebsite.startsWith("http") ? extracted.companyWebsite : `https://${extracted.companyWebsite}`;
                return new URL(url).hostname;
              } catch { return null; }
            })(),

            // ── Contact fields — PRIORITY ORDER ──
            // 1. Direct from Serper Places (most reliable), 2. from AI extraction, 3. from intelligence
            contactPhone: directPhone || extracted.contactPhone || null,
            companyAddress: directAddress || extracted.companyAddress || null,
            contactEmail: intelligence?.decisionMakerEmail || extracted.contactEmail || null,
            ownerName: intelligence?.decisionMakerName || extracted.ownerName || null,

            // LinkedIn
            linkedinUrl: resultUrl.includes("linkedin.com") ? resultUrl : (intelligence?.decisionMakerLinkedin || extracted.linkedinUrl || null),

            // Company info
            summary: extracted.summary,
            employeeCount: extracted.employeeCount,
            revenue: extracted.revenue,

            // Scoring
            score: scoreResult.score,
            priority: scoreResult.priority,
            scoreReasoning: scoreResult.reasoning,
            status: "NEW",

            // Decision-maker
            decisionMakerName: intelligence?.decisionMakerName || null,
            decisionMakerTitle: intelligence?.decisionMakerTitle || null,
            decisionMakerEmail: intelligence?.decisionMakerEmail || null,
            decisionMakerLinkedin: intelligence?.decisionMakerLinkedin || null,

            // Intelligence
            recentNews: intelligence?.recentNews ? JSON.stringify(intelligence.recentNews) : null,
            fundingStage: intelligence?.fundingStage || null,
            hiringSignals: intelligence?.hiringSignals || null,
            techStack: intelligence?.techStack || null,
            strategicInsights: intelligence?.strategicInsights || null,
            buyingIntent: intelligence?.buyingIntent || "UNKNOWN",
          },
        });

        // Update campaign stats
        await prisma.campaign.update({
          where: { id: campaignId },
          data: { totalFound: { increment: 1 } },
        });

      } catch (error) {
        console.error(`Error processing ${result.link}:`, error);
      }
    }

    // --- Complete ---
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "FINISHED", progress: 100 },
    });

  } catch (error) {
    console.error("Pipeline error:", error);
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "FAILED" },
    });
  }
}
