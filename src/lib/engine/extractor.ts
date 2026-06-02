// Gemini-powered structured data extraction from raw website text
import { GoogleGenerativeAI } from "@google/generative-ai";

export interface ExtractedLead {
  companyName: string;
  companyWebsite: string | null;
  companyAddress: string | null;
  ownerName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  summary: string | null;
  employeeCount: string | null;
  revenue: string | null;
  linkedinUrl: string | null;
}

const EXTRACTION_PROMPT = `You are a B2B lead data extraction engine. Analyze the following company website text and extract structured business information.

IMPORTANT RULES:
- Extract ONLY factual information present in the text
- If a field is not found, set it to null
- For contactEmail, look for email patterns (xxx@xxx.xxx)
- For contactPhone, look for phone number patterns
- Return ONLY valid JSON, no markdown, no explanation
- CRITICAL: For 'companyName', extract ONLY the actual professional brand name. Strip out all SEO taglines, slogans, geographical descriptions, and special characters (e.g., if you see "Botnic Salon: Kerala's Largest Luxury Salon", return ONLY "Botnic Salon").

Return this exact JSON structure:
{
  "companyName": "string",
  "ownerName": "string or null",
  "contactEmail": "string or null",
  "contactPhone": "string or null",
  "companyAddress": "full street address or null",
  "summary": "One sentence describing what the company does, or null",
  "employeeCount": "string like '50+' or '10-20' or null",
  "revenue": "string like '$2M+' or null"
}

WEBSITE TEXT:
`;

export async function extractLeadData(
  websiteText: string,
  apiKey: string
): Promise<ExtractedLead> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = EXTRACTION_PROMPT + websiteText;

  let result;
  let attempts = 0;
  while (attempts < 3) {
    try {
      result = await model.generateContent(prompt);
      break;
    } catch (error: any) {
      const is429 = error?.status === 429;
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
        console.log(`Gemini 429 Hit: Waiting 30s before retry ${attempts}/2...`);
        await new Promise(r => setTimeout(r, 30000));
        continue;
      }
      throw error;
    }
  }
  
  const response = result!.response;
  const text = response.text();

  // Clean the response — remove markdown code fences if present
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }

  try {
    const parsed = JSON.parse(cleaned);
    return {
      companyName: parsed.companyName || "Unknown Company",
      companyWebsite: parsed.companyWebsite || null,
      companyAddress: parsed.companyAddress || null,
      ownerName: parsed.ownerName || null,
      contactEmail: parsed.contactEmail || null,
      contactPhone: parsed.contactPhone || null,
      summary: parsed.summary || null,
      employeeCount: parsed.employeeCount || null,
      revenue: parsed.revenue || null,
      linkedinUrl: parsed.linkedinUrl || null,
    };
  } catch {
    // If JSON parsing fails, try to extract what we can
    return {
      companyName: "Parse Error — Manual Review Needed",
      companyWebsite: null,
      companyAddress: null,
      ownerName: null,
      contactEmail: null,
      contactPhone: null,
      summary: `AI extraction returned non-JSON: ${cleaned.substring(0, 200)}`,
      employeeCount: null,
      revenue: null,
      linkedinUrl: null,
    };
  }
}

// Fallback extraction from search snippet (no API key needed)
export function extractFromSnippet(
  title: string = "",
  snippet: string = "",
  domain: string = "",
  phone?: string,
  website?: string
): ExtractedLead {
  // Try to extract email from snippet
  const emailMatch = snippet.match(/[\w.-]+@[\w.-]+\.\w{2,}/);
  const phoneMatch = snippet.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/);

  // Try to extract name patterns like "CEO: Name" or "Founder: Name"
  const nameMatch = snippet.match(
    /(?:CEO|CTO|Founder|Owner|Director|Manager|President)[:\s]+([A-Z][a-z]+ [A-Z][a-z]+)/i
  );

  // Clean company name from title
  let cleanName = title ? title.split(/[|–\-\:]/)[0].trim() : "Unknown Company";
  // Remove common SEO fluff
  cleanName = cleanName.replace(/(Best|Top|Premium|Largest).*/i, '').trim() || title || "Unknown Company";
  
  // Try to extract address from snippet
  const addressMatch = snippet.match(/\d+[^,]+,[^,]+,\s*[A-Z]{2,}/);

  return {
    companyName: cleanName || "Unknown Company",
    companyWebsite: website || domain || null,
    companyAddress: addressMatch ? addressMatch[0] : null,
    ownerName: nameMatch ? nameMatch[1] : null,
    contactEmail: emailMatch ? emailMatch[0] : null,
    contactPhone: phone || (phoneMatch ? phoneMatch[0] : null),
    summary: snippet.substring(0, 200),
    employeeCount: null,
    revenue: null,
    linkedinUrl: null,
  };
}
