import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const ANALYSIS_SERVICE_URL = process.env.ANALYSIS_SERVICE_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const lichessId = (session.user as any).lichessId;

  if (!lichessId) {
    return NextResponse.json(
      { error: "No Lichess account linked. Please sign in with Lichess." },
      { status: 400 }
    );
  }

  try {
    // Call the Python analysis service to import from Lichess
    const res = await fetch(`${ANALYSIS_SERVICE_URL}/import/lichess`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, lichessUsername: lichessId }),
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
