export interface ApolloPerson {
  name: string;
  title: string;
  email: string | null;
  linkedin: string | null;
}

/**
 * Searches for decision makers (CEO, Founder, etc.) at a given company domain using Apollo.io API.
 * Uses the mixed_people/api_search endpoint which is credit-efficient for discovery.
 */
export async function searchApolloDecisionMakers(
  domain: string,
  apiKey: string
): Promise<ApolloPerson[]> {
  if (!apiKey || !domain) return [];

  try {
    const response = await fetch("https://api.apollo.io/v1/mixed_people/api_search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "X-Api-Key": apiKey, // Apollo requires the key in the header, NOT the body
      },
      body: JSON.stringify({
        organization_domains: [domain],
        person_titles: [
          "CEO", "Founder", "Managing Director", "President", "Owner", "CTO", "CIO", "CFO", "COO", 
          "Vice President", "VP", "Head of", 
          "Director", "Marketing Director", "Sales Director", "IT Director", 
          "Manager", "General Manager", "Operations Manager"
        ],
        page: 1,
        per_page: 5,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`Apollo API Error (${response.status}):`, errorText);
      return [];
    }

    const data = await response.json();

    if (!data.people || !Array.isArray(data.people)) {
      return [];
    }

    const peopleToEnrich = data.people.slice(0, 3); // Only enrich top 3 to save credits/time

    const enrichedPeople = await Promise.all(peopleToEnrich.map(async (p: any) => {
      let email = p.email || null;
      let title = p.title || "Executive";
      let linkedin = p.linkedin_url || null;
      let name = p.name || `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Unknown";

      // If we don't have an email, try to enrich using the People Match API
      if (!email && p.first_name && p.last_name) {
        try {
          const enrichRes = await fetch("https://api.apollo.io/v1/people/match", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-cache",
              "X-Api-Key": apiKey,
            },
            body: JSON.stringify({
              first_name: p.first_name,
              last_name: p.last_name,
              organization_name: p.organization?.name || domain,
              domain: domain
            })
          });

          if (enrichRes.ok) {
            const enrichData = await enrichRes.json();
            if (enrichData?.person?.email) {
              email = enrichData.person.email;
            }
          } else {
            console.warn(`Apollo Enrichment skipped for ${name} (Free plan restriction or not found)`);
          }
        } catch (enrichError) {
          console.warn(`Apollo Enrichment error for ${name}:`, enrichError);
        }
      }

      return { name, title, email, linkedin };
    }));

    return enrichedPeople;
  } catch (error) {
    console.error("Failed to fetch from Apollo:", error);
    return [];
  }
}