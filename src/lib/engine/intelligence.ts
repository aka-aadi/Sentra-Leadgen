// Intelligence Engine — Company news, strategic analysis, decision-maker discovery
// Uses Serper News API + Gemini AI for zero-cost intelligence layer

import { GoogleGenerativeAI } from "@google/generative-ai";

export interface NewsItem {
  title: string;
  snippet: string;
  date: string;
  url: string;
  source: string;
}

export interface IntelligenceReport {
  recentNews: NewsItem[];
  fundingStage: string | null;
  hiringSignals: string | null;
  techStack: string | null;
  strategicInsights: string | null;
  buyingIntent: "UNKNOWN" | "LOW" | "MEDIUM" | "HIGH";
  decisionMakerName: string | null;
  decisionMakerTitle: string | null;
  decisionMakerEmail: string | null;
  decisionMakerLinkedin: string | null;
}

// Fetch recent news about a company using Serper News endpoint
export async function fetchCompanyNews(
  companyName: string,
  domain: string | null,
  serperApiKey: string,
  limit: number = 5
): Promise<NewsItem[]> {
  try {
    const response = await fetch("https://google.serper.dev/news", {
      method: "POST",
      headers: {
        "X-API-KEY": serperApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: `"${companyName}" ${domain ? domain + " " : ""}company news`,
        num: limit,
      }),
    });

    if (!response.ok) {
      console.warn(`Serper News API error: ${response.status}`);
      return [];
    }

    const data = await response.json();

    if (!data.news || data.news.length === 0) return [];

    return data.news.map((item: any) => ({
      title: item.title || "",
      snippet: item.snippet || "",
      date: item.date || "",
      url: item.link || "",
      source: item.source || "",
    }));
  } catch (error) {
    console.warn("Failed to fetch company news:", error);
    return [];
  }
}

// Search for decision-maker info using Serper web search
export async function searchDecisionMakers(
  companyName: string,
  domain: string | null,
  serperApiKey: string
): Promise<{ results: string }> {
  try {
    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": serperApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: `"${companyName}" ${domain ? domain + " " : ""}CEO OR founder OR managing director OR CTO site:linkedin.com`,
        num: 5,
      }),
    });

    if (!response.ok) return { results: "" };

    const data = await response.json();
    if (!data.organic || data.organic.length === 0) return { results: "" };

    // Combine all snippets into a searchable text block
    const combined = data.organic
      .map((r: any) => `${r.title} — ${r.snippet || ""} (${r.link})`)
      .join("\n");

    return { results: combined };
  } catch {
    return { results: "" };
  }
}

// Search for hiring signals
export async function searchHiringSignals(
  companyName: string,
  domain: string | null,
  serperApiKey: string
): Promise<string> {
  try {
    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": serperApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: `"${companyName}" ${domain ? domain + " " : ""}hiring OR careers OR "we are hiring" OR job openings`,
        num: 5,
      }),
    });

    if (!response.ok) return "";

    const data = await response.json();
    if (!data.organic || data.organic.length === 0) return "";

    return data.organic
      .map((r: any) => `${r.title}: ${r.snippet || ""}`)
      .join("\n");
  } catch {
    return "";
  }
}

const INTELLIGENCE_PROMPT = `You are a B2B sales intelligence analyst. Analyze the following data about a company and produce a strategic intelligence report.

ANALYSIS FRAMEWORK:
1. **Decision Maker**: Identify the CEO/founder/CTO/Managing Director name, title, and LinkedIn URL from the search results.
2. **Funding Stage**: Determine if the company is bootstrapped, seed-funded, Series A/B/C, or public. Say null if unknown.
3. **Hiring Signals**: Summarize any hiring activity — are they growing? What roles? This indicates budget and expansion.
4. **Tech Stack**: Any technologies or platforms mentioned (e.g., AWS, Salesforce, React, etc.). Say null if unknown.
5. **Strategic Insights & Decision Making**: Analyze the company's current strategy, growth trajectory, and specifically track the decision-making patterns/priorities of company authorities (e.g., CEOs, founders) based on news and their profiles. What are they prioritizing?
6. **Buying Intent**: Rate as LOW, MEDIUM, or HIGH based on:
   - HIGH: Actively hiring, recently funded, expanding, new leadership
   - MEDIUM: Stable company with some growth signals
   - LOW: No signals, stagnant, or declining
7. **Relevant News Filter**: Critically evaluate the provided 'RECENT NEWS' against the company's website content. Filter out any news that is generic, unrelated, or about a different entity with a similar name (e.g. violent crimes or unrelated local news). Return an array of the exact news titles that are definitively about this specific company.

Return ONLY this JSON structure (no markdown, no explanation):
{
  "decisionMakerName": "string or null",
  "decisionMakerTitle": "string or null (e.g. CEO, CTO, Founder)",
  "decisionMakerLinkedin": "string URL or null",
  "fundingStage": "string or null",
  "hiringSignals": "string summary or null",
  "techStack": "string comma-separated or null",
  "strategicInsights": "string 2-3 sentences",
  "buyingIntent": "LOW|MEDIUM|HIGH",
  "relevantNewsTitles": ["exact news title 1", "exact news title 2"]
}

COMPANY DATA:
`;

export async function analyzeCompanyIntelligence(
  companyName: string,
  newsData: NewsItem[],
  decisionMakerData: string,
  hiringData: string,
  websiteText: string,
  geminiApiKey: string
): Promise<Omit<IntelligenceReport, "recentNews"> & { relevantNewsTitles?: string[] }> {
  const genAI = new GoogleGenerativeAI(geminiApiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const contextBlock = `
Company: ${companyName}

--- RECENT NEWS ---
${newsData.length > 0 ? newsData.map(n => `• ${n.title} (${n.date}): ${n.snippet}`).join("\n") : "No recent news found."}

--- DECISION MAKER SEARCH RESULTS ---
${decisionMakerData || "No decision maker data found."}

--- HIRING SIGNALS ---
${hiringData || "No hiring data found."}

--- WEBSITE CONTENT (excerpt) ---
${websiteText ? websiteText.substring(0, 3000) : "No website content available."}
`;

  const prompt = INTELLIGENCE_PROMPT + contextBlock;

  let result;
  let attempts = 0;
  while (attempts < 3) {
    try {
      result = await model.generateContent(prompt);
      break;
    } catch (error: any) {
      const is429 = error?.status === 429;
      // Daily / project-level quota exhaustion — retrying won't help, fail fast
      const isDailyQuota = error?.errorDetails?.some((d: any) =>
        d?.violations?.some((v: any) =>
          v?.quotaId?.includes("PerDay") || v?.quotaId?.includes("FreeTier")
        )
      );
      if (is429 && isDailyQuota) {
        console.warn("Gemini daily quota exhausted — not retrying.");
        throw new Error("GEMINI_QUOTA_EXHAUSTED");
      }
      if (is429 && attempts < 2) {
        attempts++;
        console.log(`Intelligence Gemini 429 Hit: Waiting 30s before retry ${attempts}/2...`);
        await new Promise((r) => setTimeout(r, 30000));
        continue;
      }
      throw error;
    }
  }

  try {
    const text = result!.response.text();
    let cleaned = text.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
    }

    const parsed = JSON.parse(cleaned);
    return {
      decisionMakerName: parsed.decisionMakerName || null,
      decisionMakerTitle: parsed.decisionMakerTitle || null,
      decisionMakerEmail: parsed.decisionMakerEmail || null,
      decisionMakerLinkedin: parsed.decisionMakerLinkedin || null,
      fundingStage: parsed.fundingStage || null,
      hiringSignals: parsed.hiringSignals || null,
      techStack: parsed.techStack || null,
      strategicInsights: parsed.strategicInsights || null,
      buyingIntent: (["LOW", "MEDIUM", "HIGH"].includes(parsed.buyingIntent) ? parsed.buyingIntent : "UNKNOWN") as IntelligenceReport["buyingIntent"],
      relevantNewsTitles: parsed.relevantNewsTitles || [],
    };
  } catch {
    return {
      decisionMakerName: null,
      decisionMakerTitle: null,
      decisionMakerEmail: null,
      decisionMakerLinkedin: null,
      fundingStage: null,
      hiringSignals: null,
      techStack: null,
      strategicInsights: "AI analysis failed — manual review recommended.",
      buyingIntent: "UNKNOWN",
      relevantNewsTitles: [],
    };
  }
}

// Full intelligence pipeline for a single company
export async function runIntelligencePipeline(
  companyName: string,
  domain: string | null,
  websiteText: string,
  serperApiKey: string,
  geminiApiKey: string,
  apolloApiKey?: string
): Promise<IntelligenceReport> {
  // Parallel fetch for speed
  const [newsData, dmData, hiringData] = await Promise.all([
    fetchCompanyNews(companyName, domain, serperApiKey, 5),
    searchDecisionMakers(companyName, domain, serperApiKey),
    searchHiringSignals(companyName, domain, serperApiKey),
  ]);

  // If Apollo key is provided and we have a domain, fetch actual decision makers
  let apolloContext = "";
  let apolloBestPerson = null;
  if (apolloApiKey && domain) {
    try {
      const { searchApolloDecisionMakers } = await import("./apollo");
      const people = await searchApolloDecisionMakers(domain, apolloApiKey);
      if (people.length > 0) {
        apolloBestPerson = people[0];
        apolloContext = "\n--- APOLLO.IO VERIFIED DECISION MAKERS ---\n" + 
          people.map(p => `${p.name} - ${p.title} (${p.email || "No email"} | ${p.linkedin || "No LinkedIn"})`).join("\n");
      }
    } catch (e) {
      console.warn("Apollo integration failed:", e);
    }
  }

  // Combine Serper DM data with Apollo DM data
  const combinedDmData = apolloContext ? `${apolloContext}\n\n${dmData.results}` : dmData.results;

  // AI analysis
  const analysis = await analyzeCompanyIntelligence(
    companyName,
    newsData,
    combinedDmData,
    hiringData,
    websiteText,
    geminiApiKey
  );

  // Hard-override AI results with Apollo if available
  if (apolloBestPerson) {
    if (!analysis.decisionMakerName) analysis.decisionMakerName = apolloBestPerson.name;
    if (!analysis.decisionMakerTitle) analysis.decisionMakerTitle = apolloBestPerson.title;
    if (!analysis.decisionMakerEmail) analysis.decisionMakerEmail = apolloBestPerson.email;
    if (!analysis.decisionMakerLinkedin) analysis.decisionMakerLinkedin = apolloBestPerson.linkedin;
  }

  const filteredNews = newsData.filter(n => analysis.relevantNewsTitles?.includes(n.title));

  return {
    recentNews: filteredNews,
    ...analysis,
  };
}
