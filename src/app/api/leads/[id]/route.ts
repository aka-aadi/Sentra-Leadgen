import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/leads/[id]
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: { campaign: { select: { name: true, query: true } } },
  });

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  return NextResponse.json(lead);
}

// PATCH /api/leads/[id]
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const lead = await prisma.lead.update({
    where: { id },
    data: body,
  });

  return NextResponse.json(lead);
}

// DELETE /api/leads/[id]
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.lead.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
