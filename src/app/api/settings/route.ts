import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Reset Gemini daily calls if it's a new day
async function maybeResetGeminiDaily(settings: { id: string; lastCreditReset: Date; geminiCallsToday: number }) {
  const now = new Date();
  const last = new Date(settings.lastCreditReset);
  const isNewDay = now.toDateString() !== last.toDateString();
  if (isNewDay && settings.geminiCallsToday > 0) {
    await prisma.settings.update({
      where: { id: "default" },
      data: { geminiCallsToday: 0, lastCreditReset: now },
    });
    return 0;
  }
  return settings.geminiCallsToday;
}

// GET /api/settings
export async function GET() {
  let settings = await prisma.settings.findUnique({ where: { id: "default" } });

  if (!settings) {
    settings = await prisma.settings.create({ data: { id: "default" } });
  }

  // Reset Gemini daily counter if new day
  const geminiCallsToday = await maybeResetGeminiDaily(settings);

  // Compute low-credit warning flags
  const serperPct = settings.serperCreditsTotal > 0 ? (settings.serperCreditsUsed / settings.serperCreditsTotal) : 0;
  const apolloPct = settings.apolloCreditsTotal > 0 ? (settings.apolloCreditsUsed / settings.apolloCreditsTotal) : 0;
  const geminiPct = settings.geminiCallsLimit > 0 ? (geminiCallsToday / settings.geminiCallsLimit) : 0;

  return NextResponse.json({
    ...settings,
    geminiCallsToday,
    // Mask API keys
    geminiApiKey: settings.geminiApiKey ? "••••" + settings.geminiApiKey.slice(-4) : "",
    googleSearchApiKey: settings.googleSearchApiKey ? "••••" + settings.googleSearchApiKey.slice(-4) : "",
    googleAiApiKey: settings.googleAiApiKey ? "••••" + settings.googleAiApiKey.slice(-4) : "",
    hunterApiKey: settings.hunterApiKey ? "••••" + settings.hunterApiKey.slice(-4) : "",
    clearbitApiKey: settings.clearbitApiKey ? "••••" + settings.clearbitApiKey.slice(-4) : "",
    apolloApiKey: settings.apolloApiKey ? "••••" + settings.apolloApiKey.slice(-4) : "",
    // Don't mask these
    googleSearchEngineId: settings.googleSearchEngineId,
    idealCustomerProfile: settings.idealCustomerProfile,
    // Has-key booleans
    _hasGeminiKey: !!settings.geminiApiKey,
    _hasSearchKey: !!settings.googleSearchApiKey,
    _hasAiKey: !!settings.googleAiApiKey,
    _hasHunterKey: !!settings.hunterApiKey,
    _hasApolloKey: !!settings.apolloApiKey,
    // Low-credit warning flags (<15% remaining = warning, <5% = critical)
    _serperLow: serperPct >= 0.85,
    _serperCritical: serperPct >= 0.95,
    _apolloLow: apolloPct >= 0.85,
    _apolloCritical: apolloPct >= 0.95,
    _geminiLow: geminiPct >= 0.85,
    _geminiCritical: geminiPct >= 0.95,
    // Remaining counts
    _serperRemaining: Math.max(0, settings.serperCreditsTotal - settings.serperCreditsUsed),
    _apolloRemaining: Math.max(0, settings.apolloCreditsTotal - settings.apolloCreditsUsed),
    _geminiRemaining: Math.max(0, settings.geminiCallsLimit - geminiCallsToday),
  });
}

// PUT /api/settings
export async function PUT(request: Request) {
  const body = await request.json();
  const updateData: Record<string, any> = {};

  // API Keys — only update if not masked
  if (body.geminiApiKey && !body.geminiApiKey.startsWith("••••")) updateData.geminiApiKey = body.geminiApiKey;
  if (body.googleSearchApiKey && !body.googleSearchApiKey.startsWith("••••")) updateData.googleSearchApiKey = body.googleSearchApiKey;
  if (body.googleAiApiKey && !body.googleAiApiKey.startsWith("••••")) updateData.googleAiApiKey = body.googleAiApiKey;
  if (body.googleSearchEngineId !== undefined) updateData.googleSearchEngineId = body.googleSearchEngineId;
  if (body.hunterApiKey && !body.hunterApiKey.startsWith("••••")) updateData.hunterApiKey = body.hunterApiKey;
  if (body.clearbitApiKey && !body.clearbitApiKey.startsWith("••••")) updateData.clearbitApiKey = body.clearbitApiKey;
  if (body.apolloApiKey && !body.apolloApiKey.startsWith("••••")) updateData.apolloApiKey = body.apolloApiKey;
  if (body.idealCustomerProfile !== undefined) updateData.idealCustomerProfile = body.idealCustomerProfile;

  // Toggles
  if (body.serperEnabled !== undefined) updateData.serperEnabled = Boolean(body.serperEnabled);
  if (body.apolloEnabled !== undefined) updateData.apolloEnabled = Boolean(body.apolloEnabled);
  if (body.geminiEnabled !== undefined) updateData.geminiEnabled = Boolean(body.geminiEnabled);

  // Credit totals (user can update when they upgrade a plan)
  if (body.serperCreditsTotal !== undefined) updateData.serperCreditsTotal = Number(body.serperCreditsTotal);
  if (body.apolloCreditsTotal !== undefined) updateData.apolloCreditsTotal = Number(body.apolloCreditsTotal);
  if (body.geminiCallsLimit !== undefined) updateData.geminiCallsLimit = Number(body.geminiCallsLimit);

  // Manual credit overrides (for correction)
  if (body.serperCreditsUsed !== undefined) updateData.serperCreditsUsed = Number(body.serperCreditsUsed);
  if (body.apolloCreditsUsed !== undefined) updateData.apolloCreditsUsed = Number(body.apolloCreditsUsed);
  if (body.geminiCallsToday !== undefined) updateData.geminiCallsToday = Number(body.geminiCallsToday);

  // Legacy
  if (body.creditsUsed !== undefined) updateData.creditsUsed = Number(body.creditsUsed);

  const settings = await prisma.settings.upsert({
    where: { id: "default" },
    update: updateData,
    create: { id: "default", ...updateData },
  });

  return NextResponse.json({
    success: true,
    _hasGeminiKey: !!settings.geminiApiKey,
    _hasSearchKey: !!settings.googleSearchApiKey,
    _hasAiKey: !!settings.googleAiApiKey,
    _hasHunterKey: !!settings.hunterApiKey,
    _hasApolloKey: !!settings.apolloApiKey,
    serperEnabled: settings.serperEnabled,
    apolloEnabled: settings.apolloEnabled,
    geminiEnabled: settings.geminiEnabled,
  });
}
