import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/campaigns/[id]
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      leads: { orderBy: { createdAt: "desc" } },
      _count: { select: { leads: true } },
    },
  });

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  return NextResponse.json(campaign);
}

// DELETE /api/campaigns/[id]
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Explicitly delete leads first to avoid SQLite foreign key constraint errors
    await prisma.lead.deleteMany({ where: { campaignId: id } });
    
    // Then delete the campaign
    await prisma.campaign.delete({ where: { id } });
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete" }, { status: 500 });
  }
}
