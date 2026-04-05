import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const ANALYSIS_SERVICE_URL = process.env.ANALYSIS_SERVICE_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;

  try {
    const body = await req.json();
    const username = body.username;

    if (!username || typeof username !== "string" || username.length > 50) {
      return NextResponse.json(
        { error: "Valid Chess.com username required" },
        { status: 400 }
      );
    }

    // Sanitize username: alphanumeric, hyphens, underscores only
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return NextResponse.json(
        { error: "Invalid username format" },
        { status: 400 }
      );
    }

    // Update user's chesscom username
    const { prisma } = await import("@/lib/db");
    await prisma.user.update({
      where: { id: userId },
      data: { chesscomUser: username },
    });

    // Call the Python analysis service to import from Chess.com
    const res = await fetch(`${ANALYSIS_SERVICE_URL}/import/chesscom`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, chesscomUsername: username }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: "Import failed" }));
      return NextResponse.json(
        { error: error.detail || "Import failed" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to connect to analysis service" },
      { status: 503 }
    );
  }
}
