import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids)) {
      return NextResponse.json(
        { error: "ids (array) is required" },
        { status: 400 }
      );
    }

    console.log("BULK DELETE REQUEST FOR IDS:", ids);

    const result = await prisma.lead.deleteMany({
      where: { id: { in: ids } },
    });

    console.log("PRISMA DELETE RESULT:", result);

    return NextResponse.json({ success: true, deleted: result.count });
  } catch (error) {
    console.error("Bulk delete error:", error);
    return NextResponse.json({ error: "Failed to delete leads" }, { status: 500 });
  }
}
