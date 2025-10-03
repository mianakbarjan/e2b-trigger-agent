// app/api/cleanup/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Sandbox } from "@e2b/code-interpreter";

export async function POST(request: NextRequest) {
  try {
    const { sandboxId } = await request.json();

    if (!sandboxId) {
      return NextResponse.json(
        { error: "sandboxId is required" },
        { status: 400 }
      );
    }

    // Connect to the sandbox and kill it
    const sandbox = await Sandbox.connect(sandboxId, {
      apiKey: process.env.E2B_API_KEY!,
    });

    await sandbox.kill();

    return NextResponse.json({
      success: true,
      message: `Sandbox ${sandboxId} has been terminated`,
    });
  } catch (error) {
    console.error("Error cleaning up sandbox:", error);
    return NextResponse.json(
      { 
        error: "Failed to cleanup sandbox",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// Get list of running sandboxes (if needed)
export async function GET() {
  try {
    // Note: E2B doesn't have a direct API to list all sandboxes
    // You'd need to track them yourself in a database
    return NextResponse.json({
      message: "Track sandbox IDs in your database to manage them"
    });
  } catch (error) {
    console.error("Error listing sandboxes:", error);
    return NextResponse.json(
      { error: "Failed to list sandboxes" },
      { status: 500 }
    );
  }
}