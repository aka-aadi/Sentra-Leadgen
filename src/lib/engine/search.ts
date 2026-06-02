// Google Custom Search API integration
export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  displayLink: string;
  // Local/Places fields
  phoneNumber?: string;
  address?: string;
  rating?: number;
  ratingCount?: number;
  category?: string;
}

export async function localSearch(
  query: string,
  apiKey: string,
  location?: string,
  num: number = 10,
  startIndex: number = 0
): Promise<SearchResult[]> {
  const url = "https://google.serper.dev/places";
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      q: location ? `${query} in ${location}` : query,
      location: location || undefined,
      num: num,
      page: Math.floor((startIndex || 0) / 10) + 1
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Serper Places error: ${response.status} — ${error}`);
  }

  const data = await response.json();

  if (!data.places || data.places.length === 0) {
    return [];
  }

  return data.places.map((item: any) => ({
    title: item.title || "",
    link: item.website || "",
    snippet: item.address || "",
    displayLink: item.website ? new URL(item.website).hostname.replace('www.', '') : "no-website.com",
    phoneNumber: item.phoneNumber,
    address: item.address,
    rating: item.rating,
    ratingCount: item.ratingCount,
    category: item.category
  }));
}

export async function googleSearch(
  query: string,
  apiKey: string,
  searchEngineId: string, // Kept for backwards compatibility with DB schema
  startIndex: number = 1
): Promise<SearchResult[]> {
  const url = "https://google.serper.dev/search";
  
  // Force clean official websites by excluding generic directory listings
  const cleanQuery = `${query} -site:tripadvisor.com -site:yelp.com -site:justdial.com -site:indiamart.com -site:facebook.com -site:instagram.com -site:linkedin.com -site:sulekha.com -site:magicpin.in -site:zomato.com`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      q: cleanQuery,
      num: 10,
      page: Math.floor(startIndex / 10) + 1
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Serper API error: ${response.status} — ${error}`);
  }

  const data = await response.json();

  if (!data.organic || data.organic.length === 0) {
    return [];
  }

  return data.organic.map((item: any) => ({
    title: item.title || "",
    link: item.link || "",
    snippet: item.snippet || "",
    displayLink: new URL(item.link || "https://example.com").hostname.replace('www.', ''),
  }));
}

// Company/Enterprise web search — finds company websites (not directory listings)
export async function companyWebSearch(
  query: string,
  apiKey: string,
  location?: string,
  num: number = 10,
  startIndex: number = 0
): Promise<SearchResult[]> {
  const url = "https://google.serper.dev/search";

  // Build a clean query that targets actual company websites
  const cleanQuery = location
    ? `${query} in ${location} company official website -site:tripadvisor.com -site:yelp.com -site:justdial.com -site:indiamart.com -site:facebook.com -site:instagram.com -site:linkedin.com -site:sulekha.com -site:magicpin.in -site:zomato.com -site:wikipedia.org`
    : `${query} company official website -site:tripadvisor.com -site:yelp.com -site:justdial.com -site:indiamart.com -site:facebook.com -site:instagram.com -site:linkedin.com -site:sulekha.com -site:magicpin.in -site:zomato.com -site:wikipedia.org`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ q: cleanQuery, location: location || undefined, num, page: Math.floor((startIndex || 0) / 10) + 1 }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Serper Web Search error: ${response.status} — ${error}`);
  }

  const data = await response.json();
  if (!data.organic || data.organic.length === 0) return [];

  return data.organic.map((item: any) => ({
    title: item.title || "",
    link: item.link || "",
    snippet: item.snippet || "",
    displayLink: new URL(item.link || "https://example.com").hostname.replace("www.", ""),
  }));
}

// People/Decision-maker search — finds CEO, CTO, founder info
export async function peopleSearch(
  query: string,
  apiKey: string,
  location?: string,
  num: number = 10,
  startIndex: number = 0
): Promise<SearchResult[]> {
  const url = "https://google.serper.dev/search";

  const exclusions = "-site:wikipedia.org -site:youtube.com -site:instagram.com -site:facebook.com -site:twitter.com -site:tiktok.com -site:pinterest.com -site:reddit.com -site:quora.com -site:medium.com -site:forbes.com -site:bloomberg.com -site:techcrunch.com -site:wsj.com -site:nytimes.com -site:cnbc.com -site:hbr.org";
  const searchQuery = location
    ? `${query} in ${location} CEO OR founder OR director OR owner company ${exclusions}`
    : `${query} CEO OR founder OR director OR owner company ${exclusions}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ q: searchQuery, location: location || undefined, num, page: Math.floor((startIndex || 0) / 10) + 1 }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Serper People Search error: ${response.status} — ${error}`);
  }

  const data = await response.json();
  if (!data.organic || data.organic.length === 0) return [];

  return data.organic.map((item: any) => ({
    title: item.title || "",
    link: item.link || "",
    snippet: item.snippet || "",
    displayLink: new URL(item.link || "https://example.com").hostname.replace("www.", ""),
  }));
}

// Fallback: mock search for testing without API keys
export function mockSearch(query: string): SearchResult[] {
  const mockResults: SearchResult[] = [
    {
      title: `${query} - Premium Business Directory`,
      link: "https://example.com/business-1",
      snippet: `Leading ${query} provider offering premium services. Contact: info@example.com. Founded by John Smith.`,
      displayLink: "example.com",
    },
    {
      title: `Top ${query} Services | Professional Solutions`,
      link: "https://example.com/business-2",
      snippet: `Award-winning ${query} company. 50+ employees. Revenue $2M+. CEO: Sarah Johnson. Email: contact@topservices.com`,
      displayLink: "topservices.com",
    },
    {
      title: `${query} - Industry Leader Since 2010`,
      link: "https://example.com/business-3",
      snippet: `Specializing in ${query} with offices in 5 cities. Phone: +91-9876543210. Founder: Raj Patel.`,
      displayLink: "industryleader.com",
    },
    {
      title: `${query} Solutions | Enterprise Grade`,
      link: "https://example.com/business-4",
      snippet: `Enterprise ${query} solutions for Fortune 500 companies. CTO: Maria Garcia. info@enterprise-solutions.io`,
      displayLink: "enterprise-solutions.io",
    },
    {
      title: `Best ${query} Near You | Reviews & Ratings`,
      link: "https://example.com/business-5",
      snippet: `Find the best ${query} businesses. Top rated: Sunrise Studios (4.9★). Owner: Alex Chen. hello@sunrise-studios.com`,
      displayLink: "sunrise-studios.com",
    },
  ];
  return mockResults;
}
