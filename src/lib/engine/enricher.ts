// Waterfall enrichment — pluggable provider architecture
// Tries each provider in sequence until missing data is found

export interface EnrichmentResult {
  contactEmail: string | null;
  linkedinUrl: string | null;
  employeeCount: string | null;
  revenue: string | null;
  source: string;
}

export interface EnrichmentProvider {
  name: string;
  enrich(params: {
    companyName: string;
    domain: string | null;
    ownerName: string | null;
  }): Promise<Partial<EnrichmentResult>>;
}

// Hunter.io provider (requires API key)
class HunterProvider implements EnrichmentProvider {
  name = "hunter.io";
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async enrich(params: {
    companyName: string;
    domain: string | null;
    ownerName: string | null;
  }): Promise<Partial<EnrichmentResult>> {
    if (!this.apiKey || !params.domain) return {};

    try {
      const url = new URL("https://api.hunter.io/v2/domain-search");
      url.searchParams.set("domain", params.domain);
      url.searchParams.set("api_key", this.apiKey);

      const res = await fetch(url.toString());
      if (!res.ok) return {};

      const data = await res.json();
      const emails = data?.data?.emails;
      if (emails && emails.length > 0) {
        // Find the most relevant email (matching owner name if possible)
        let bestEmail = emails[0].value;
        if (params.ownerName) {
          const firstName = params.ownerName.split(" ")[0].toLowerCase();
          const match = emails.find(
            (e: Record<string, string>) =>
              e.first_name?.toLowerCase() === firstName
          );
          if (match) bestEmail = match.value;
        }
        return { contactEmail: bestEmail, source: "hunter.io" };
      }
    } catch {
      // Hunter.io unavailable
    }

    return {};
  }
}

// Mock enrichment provider for testing without API keys
class MockEnrichmentProvider implements EnrichmentProvider {
  name = "mock";

  async enrich(params: {
    companyName: string;
    domain: string | null;
    ownerName: string | null;
  }): Promise<Partial<EnrichmentResult>> {
    // Simulate enrichment with constructed data
    const domain = params.domain || "example.com";
    const firstName = params.ownerName?.split(" ")[0]?.toLowerCase() || "info";

    return {
      contactEmail: params.ownerName ? `${firstName}@${domain}` : null,
      linkedinUrl: params.ownerName
        ? `https://linkedin.com/in/${params.ownerName.toLowerCase().replace(/\s+/g, "-")}`
        : null,
      source: "mock",
    };
  }
}

// LinkedIn URL constructor
class LinkedInProvider implements EnrichmentProvider {
  name = "linkedin-guess";

  async enrich(params: {
    companyName: string;
    domain: string | null;
    ownerName: string | null;
  }): Promise<Partial<EnrichmentResult>> {
    if (!params.ownerName) return {};

    return {
      linkedinUrl: `https://linkedin.com/in/${params.ownerName
        .toLowerCase()
        .replace(/\s+/g, "-")}`,
      source: "linkedin-guess",
    };
  }
}

export async function enrichLead(
  companyName: string,
  domain: string | null,
  ownerName: string | null,
  existingEmail: string | null,
  hunterApiKey?: string
): Promise<EnrichmentResult> {
  const result: EnrichmentResult = {
    contactEmail: existingEmail,
    linkedinUrl: null,
    employeeCount: null,
    revenue: null,
    source: "original",
  };

  // Build provider waterfall
  const providers: EnrichmentProvider[] = [];

  if (hunterApiKey) {
    providers.push(new HunterProvider(hunterApiKey));
  }
  providers.push(new LinkedInProvider());

  // If no API keys configured, use mock for demo
  if (providers.length <= 1 && !hunterApiKey) {
    providers.unshift(new MockEnrichmentProvider());
  }

  // Run waterfall
  for (const provider of providers) {
    try {
      const enriched = await provider.enrich({ companyName, domain, ownerName });

      if (!result.contactEmail && enriched.contactEmail) {
        result.contactEmail = enriched.contactEmail;
        result.source = provider.name;
      }
      if (!result.linkedinUrl && enriched.linkedinUrl) {
        result.linkedinUrl = enriched.linkedinUrl;
      }
      if (!result.employeeCount && enriched.employeeCount) {
        result.employeeCount = enriched.employeeCount;
      }
      if (!result.revenue && enriched.revenue) {
        result.revenue = enriched.revenue;
      }
    } catch {
      // Continue to next provider
    }
  }

  return result;
}
