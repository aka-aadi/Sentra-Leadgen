import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/leads — list all leads with filtering
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const campaignId = searchParams.get("campaignId");
  const priority = searchParams.get("priority");
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const sortBy = searchParams.get("sortBy") || "score";
  const sortOrder = searchParams.get("sortOrder") || "desc";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");

  const where: Record<string, unknown> = {};

  if (campaignId) where.campaignId = campaignId;
  if (priority) where.priority = priority;
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { companyName: { contains: search } },
      { ownerName: { contains: search } },
      { contactEmail: { contains: search } },
      { summary: { contains: search } },
    ];
  }

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
      include: { campaign: { select: { name: true } } },
    }),
    prisma.lead.count({ where }),
  ]);

  return NextResponse.json({ leads, total, page, limit });
}

// PATCH /api/leads — bulk update
export async function PATCH(request: Request) {
  const body = await request.json();
  const { ids, status } = body;

  if (!ids || !Array.isArray(ids) || !status) {
    return NextResponse.json(
      { error: "ids (array) and status are required" },
      { status: 400 }
    );
  }

  await prisma.lead.updateMany({
    where: { id: { in: ids } },
    data: { status },
  });

  return NextResponse.json({ success: true, updated: ids.length });
}

// DELETE /api/leads — bulk delete
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const idsParam = searchParams.get("ids");

  if (!idsParam) {
    return NextResponse.json(
      { error: "ids parameter is required" },
      { status: 400 }
    );
  }

  const ids = idsParam.split(",");

  await prisma.lead.deleteMany({
    where: { id: { in: ids } },
  });

  return NextResponse.json({ success: true, deleted: ids.length });
}
