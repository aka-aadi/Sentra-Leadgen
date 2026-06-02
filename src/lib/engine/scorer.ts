// AI Lead Scoring using Gemini
import { GoogleGenerativeAI } from "@google/generative-ai";

export interface ScoreResult {
  score: number; // 0-100
  priority: "LOW" | "MEDIUM" | "HIGH" | "HOT";
  reasoning: string;
}

const SCORING_PROMPT = `You are a B2B lead scoring engine. Score the following lead based on the Ideal Customer Profile (ICP).

SCORING CRITERIA:
- 0-25: LOW priority — Poor fit, missing critical info, small/irrelevant company
- 26-50: MEDIUM priority — Partial fit, some info missing
- 51-75: HIGH priority — Good fit, most criteria met
- 76-100: HOT priority — Perfect fit, all criteria met, high-value target

Return ONLY this exact JSON (no markdown, no explanation):
{
  "score": <number 0-100>,
  "priority": "<LOW|MEDIUM|HIGH|HOT>",
  "reasoning": "<1 sentence explanation>"
}

IDEAL CUSTOMER PROFILE:
`;

export async function scoreLead(
  lead: {
    companyName: string;
    ownerName: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    summary: string | null;
    employeeCount: string | null;
    revenue: string | null;
  },
  icp: string,
  apiKey: string
): Promise<ScoreResult> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const leadInfo = `
LEAD DATA:
- Company: ${lead.companyName}
- Owner/Contact: ${lead.ownerName || "Unknown"}
- Email: ${lead.contactEmail || "Not found"}
- Phone: ${lead.contactPhone || "Not found"}
- Description: ${lead.summary || "No description"}
- Employee Count: ${lead.employeeCount || "Unknown"}
- Revenue: ${lead.revenue || "Unknown"}
`;

  const prompt = SCORING_PROMPT + (icp || "Any B2B company with contact information available") + leadInfo;

  let result;
  let attempts = 0;
  while (attempts < 3) {
    try {
      result = await model.generateContent(prompt);
      break;
    } catch (error: any) {
      if (error?.status === 429 && attempts < 2) {
        attempts++;
        console.log(`Scoring Gemini 429 Hit: Waiting 30s before retry ${attempts}/2...`);
        await new Promise(r => setTimeout(r, 30000));
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
      score: Math.min(100, Math.max(0, Number(parsed.score) || 0)),
      priority: (["LOW", "MEDIUM", "HIGH", "HOT"].includes(parsed.priority)
        ? parsed.priority
        : "MEDIUM") as ScoreResult["priority"],
      reasoning: parsed.reasoning || "No reasoning provided",
    };
  } catch {
    // Fallback: score based on data completeness
    let score = 20;
    if (lead.contactEmail) score += 25;
    if (lead.ownerName) score += 15;
    if (lead.contactPhone) score += 15;
    if (lead.summary) score += 10;
    if (lead.employeeCount) score += 5;
    if (lead.revenue) score += 10;

    const priority: ScoreResult["priority"] =
      score >= 76 ? "HOT" : score >= 51 ? "HIGH" : score >= 26 ? "MEDIUM" : "LOW";

    return {
      score,
      priority,
      reasoning: "Scored by data completeness (AI scoring unavailable)",
    };
  }
}

// Score without API (data-completeness based)
export function scoreLeadOffline(lead: {
  companyName: string;
  ownerName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  summary: string | null;
  employeeCount: string | null;
  revenue: string | null;
}): ScoreResult {
  let score = 20;
  if (lead.companyName && lead.companyName !== "Unknown Company") score += 15;
  if (lead.contactEmail) score += 35;
  if (lead.contactPhone) score += 30; // High priority for phone
  if (lead.ownerName) score += 10;
  if (lead.summary && lead.summary.length > 20) score += 5;

  const priority: ScoreResult["priority"] =
    score >= 80 ? "HOT" : score >= 60 ? "HIGH" : score >= 35 ? "MEDIUM" : "LOW";

  return {
    score,
    priority,
    reasoning: "Scored based on data completeness (Serper verified) — AI scoring bypassed for speed",
  };
}
