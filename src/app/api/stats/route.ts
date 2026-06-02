import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/stats — global dashboard stats
export async function GET() {
  const [totalLeads, totalCampaigns, activeCampaigns] = await Promise.all([
    prisma.lead.count(),
    prisma.campaign.count(),
    prisma.campaign.count({ where: { status: "RUNNING" } }),
  ]);

  const avgScore = await prisma.lead.aggregate({
    _avg: { score: true },
  });

  const priorityBreakdown = await prisma.lead.groupBy({
    by: ["priority"],
    _count: true,
  });

  const statusBreakdown = await prisma.lead.groupBy({
    by: ["status"],
    _count: true,
  });

  const recentCampaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { _count: { select: { leads: true } } },
  });

  const topLeads = await prisma.lead.findMany({
    orderBy: { score: "desc" },
    take: 5,
    include: { campaign: { select: { name: true } } },
  });

  return NextResponse.json({
    totalLeads,
    totalCampaigns,
    activeCampaigns,
    avgScore: Math.round(avgScore._avg.score || 0),
    priorityBreakdown: Object.fromEntries(
      priorityBreakdown.map((p) => [p.priority, p._count])
    ),
    statusBreakdown: Object.fromEntries(
      statusBreakdown.map((s) => [s.status, s._count])
    ),
    recentCampaigns: recentCampaigns.map((c) => ({
      ...c,
      leadCount: c._count.leads,
    })),
    topLeads,
  });
}
