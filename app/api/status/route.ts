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

    // Get the latest progress from the logs
    const logs = run.output?.logs || [];
    interface Log {
      metadata?: { step?: number; total?: number; detail?: string };
      message: string;
      timestamp: string;
    }
    
    const progressLogs = logs
      .filter((log: Log) => log.metadata?.step !== undefined)
      .map((log: Log) => ({
        step: log.metadata!.step,
        total: log.metadata!.total,
        status: log.message,
        detail: log.metadata!.detail,
        timestamp: log.timestamp
      }))
      .sort((a: { step: number }, b: { step: number }) => b.step - a.step);

    const latestProgress = progressLogs[0];

    return NextResponse.json({
      status: run.status,
      output: run.output,
      error: run.error,
      appUrl: run.output?.appUrl,
      message: run.output?.message,
      progress: latestProgress || run.output?.progress,
      logs: progressLogs
    });
  } catch (error) {
    console.error("Error fetching job status:", error);
    return NextResponse.json(
      { error: "Failed to fetch job status" },
      { status: 500 }
    );
  }
}