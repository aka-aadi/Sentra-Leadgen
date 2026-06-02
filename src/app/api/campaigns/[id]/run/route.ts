import { NextResponse } from "next/server";
import { runPipeline } from "@/lib/engine/pipeline";

// POST /api/campaigns/[id]/run — trigger AI pipeline
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Run pipeline in background (don't await)
  runPipeline(id).catch((err) => {
    console.error("Pipeline background error:", err);
  });

  return NextResponse.json({
    success: true,
    message: "Pipeline started. Poll /api/campaigns/[id] for status.",
  });
}
