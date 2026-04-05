import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db";

const ANALYSIS_SERVICE_URL = process.env.ANALYSIS_SERVICE_URL || "http://localhost:8000";

interface RouteParams {
  params: { gameId: string };
}

// Request AI coaching review for a game
export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const { gameId } = params;

  // Verify game belongs to user and has analysis
  const game = await prisma.game.findFirst({
    where: { id: gameId, userId },
    include: { analysis: true },
  });

  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  if (!game.analysis || game.analysis.status !== "complete") {
    return NextResponse.json(
      { error: "Game must be analyzed with Stockfish first" },
      { status: 400 }
    );
  }

  // Check for cached AI review
  if (game.analysis.aiReview) {
    return NextResponse.json({
      review: JSON.parse(game.analysis.aiReview),
      cached: true,
    });
  }

  try {
    // Send coaching request to Python service
    const res = await fetch(`${ANALYSIS_SERVICE_URL}/coaching/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gameId,
        pgn: game.pgn,
        moveEvals: game.analysis.moveEvals,
      }),
    });

    if (!res.ok) {
      throw new Error("Coaching service returned error");
    }

    const data = await res.json();

    // Cache the review
    await prisma.gameAnalysis.update({
      where: { gameId },
      data: { aiReview: JSON.stringify(data.review) },
    });

    return NextResponse.json({ review: data.review, cached: false });
  } catch {
    return NextResponse.json(
      { error: "AI coaching service unavailable" },
      { status: 503 }
    );
  }
}
