import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/settings/credits
// Called by the pipeline after each API call to track consumption
// Body: { service: "serper" | "apollo" | "gemini", amount?: number }
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { service, amount = 1 } = body;

    if (!["serper", "apollo", "gemini"].includes(service)) {
      return NextResponse.json({ error: "Invalid service" }, { status: 400 });
    }

    const fieldMap: Record<string, string> = {
      serper: "serperCreditsUsed",
      apollo: "apolloCreditsUsed",
      gemini: "geminiCallsToday",
    };

    const field = fieldMap[service];

    // Ensure settings row exists
    await prisma.settings.upsert({
      where: { id: "default" },
      update: { [field]: { increment: amount } },
      create: { id: "default", [field]: amount },
    });

    return NextResponse.json({ success: true, service, amount });
  } catch (error) {
    console.error("Credits tracking error:", error);
    return NextResponse.json({ error: "Failed to track credits" }, { status: 500 });
  }
}
