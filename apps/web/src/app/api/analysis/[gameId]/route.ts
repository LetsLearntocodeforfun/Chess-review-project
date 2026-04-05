import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db";

const ANALYSIS_SERVICE_URL = process.env.ANALYSIS_SERVICE_URL || "http://localhost:8000";

interface RouteParams {
  params: { gameId: string };
}

// Request Stockfish analysis for a game
export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const { gameId } = params;

  // Verify game belongs to user
  const game = await prisma.game.findFirst({
    where: { id: gameId, userId },
  });

  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  // Check if analysis already exists
  const existing = await prisma.gameAnalysis.findUnique({
    where: { gameId },
  });

  if (existing && existing.status === "complete") {
    return NextResponse.json({ status: "already_analyzed" });
  }

  // Create or update analysis record as pending
  await prisma.gameAnalysis.upsert({
    where: { gameId },
    create: { gameId, status: "pending", moveEvals: [] },
    update: { status: "pending" },
  });

  try {
    // Send analysis request to Python service
    const res = await fetch(`${ANALYSIS_SERVICE_URL}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId, pgn: game.pgn }),
    });

    if (!res.ok) {
      throw new Error("Analysis service returned error");
    }

    return NextResponse.json({ status: "analyzing", gameId });
  } catch {
    return NextResponse.json(
      { error: "Analysis service unavailable" },
      { status: 503 }
    );
  }
}

// Get analysis status and results
export async function GET(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const { gameId } = params;

  const game = await prisma.game.findFirst({
    where: { id: gameId, userId },
    include: { analysis: true },
  });

  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  return NextResponse.json({
    analysis: game.analysis || null,
  });
}
