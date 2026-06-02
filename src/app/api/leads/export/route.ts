import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/leads/export — export leads as CSV
export async function POST(request: Request) {
  const body = await request.json();
  const { campaignId, priority, status, ids } = body;

  const where: Record<string, unknown> = {};
  if (campaignId) where.campaignId = campaignId;
  if (priority) where.priority = priority;
  if (status) where.status = status;
  if (ids && Array.isArray(ids)) where.id = { in: ids };

  const leads = await prisma.lead.findMany({
    where,
    orderBy: { score: "desc" },
    include: { campaign: { select: { name: true } } },
  });

  // Build CSV
  const headers = [
    "Company Name",
    "Owner/Contact",
    "Email",
    "Phone",
    "Website",
    "LinkedIn",
    "Summary",
    "Employee Count",
    "Revenue",
    "Score",
    "Priority",
    "Status",
    "Campaign",
    "Score Reasoning",
  ];

  const rows = leads.map((l) => [
    escapeCsv(l.companyName),
    escapeCsv(l.ownerName || ""),
    escapeCsv(l.contactEmail || ""),
    escapeCsv(l.contactPhone || ""),
    escapeCsv(l.companyWebsite || ""),
    escapeCsv(l.linkedinUrl || ""),
    escapeCsv(l.summary || ""),
    escapeCsv(l.employeeCount || ""),
    escapeCsv(l.revenue || ""),
    String(l.score),
    l.priority,
    l.status,
    escapeCsv(l.campaign.name),
    escapeCsv(l.scoreReasoning || ""),
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="leads-export-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
