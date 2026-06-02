import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/campaigns — list all campaigns
export async function GET() {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { leads: true } },
    },
  });

  // Add lead stats per campaign
  const enriched = await Promise.all(
    campaigns.map(async (c) => {
      const stats = await prisma.lead.groupBy({
        by: ["priority"],
        where: { campaignId: c.id },
        _count: true,
      });

      const avgScore = await prisma.lead.aggregate({
        where: { campaignId: c.id },
        _avg: { score: true },
      });

      return {
        ...c,
        leadCount: c._count.leads,
        avgScore: Math.round(avgScore._avg.score || 0),
        priorityBreakdown: Object.fromEntries(
          stats.map((s) => [s.priority, s._count])
        ),
      };
    })
  );

  return NextResponse.json(enriched);
}

// POST /api/campaigns — create new campaign
export async function POST(request: Request) {
  const body = await request.json();

  const { name, query, industry, location, leadLimit, type } = body;

  if (!name || !query) {
    return NextResponse.json(
      { error: "Name and query are required" },
      { status: 400 }
    );
  }

  const campaignType = (["LOCAL", "COMPANY", "PEOPLE"].includes(type) ? type : "LOCAL");

  const campaign = await prisma.campaign.create({
    data: {
      name,
      query: location ? `${query} in ${location}` : query,
      industry: industry || null,
      location: location || null,
      type: campaignType,
      leadLimit: leadLimit ? Number(leadLimit) : 10,
    },
  });

  return NextResponse.json(campaign, { status: 201 });
}

