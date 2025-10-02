import { NextRequest, NextResponse } from "next/server";
import { tasks } from "@trigger.dev/sdk/v3";

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // Trigger the workflow
    const handle = await tasks.trigger("fullstack-in-sandbox", {
      prompt,
    });

    return NextResponse.json({
      jobId: handle.id,
      status: "QUEUED",
      message: "Workflow started. Poll /api/status to check progress.",
    });
  } catch (error) {
    console.error("Error triggering workflow:", error);
    return NextResponse.json(
      { error: "Failed to start workflow" },
      { status: 500 }
    );
  }
}