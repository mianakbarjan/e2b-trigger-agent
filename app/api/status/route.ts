import { NextRequest, NextResponse } from "next/server";
import { runs } from "@trigger.dev/sdk/v3";

export async function GET(request: NextRequest) {
  try {
    const jobId = request.nextUrl.searchParams.get("jobId");

    if (!jobId) {
      return NextResponse.json(
        { error: "jobId is required" },
        { status: 400 }
      );
    }

    // Retrieve the job status
    const run = await runs.retrieve(jobId);

    if (!run) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    // Extract metadata - this is where files and terminal output are stored
    const metadata = run.metadata || {};
    const progress = metadata.progress || null;
    const files = metadata.files || [];
    const terminalOutput = metadata.terminalOutput || [];

    return NextResponse.json({
      status: run.status,
      output: {
        appUrl: run.output?.appUrl,
        message: run.output?.message,
        sandboxId: run.output?.sandboxId,
        progress: progress,
        files: files,
        terminalOutput: terminalOutput,
      },
      error: run.error,
      metadata: metadata, // Include full metadata for debugging
    });
  } catch (error) {
    console.error("Error fetching job status:", error);
    return NextResponse.json(
      { error: "Failed to fetch job status" },
      { status: 500 }
    );
  }
}