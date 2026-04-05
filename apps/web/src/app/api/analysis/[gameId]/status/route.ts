import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface RouteParams {
  params: { gameId: string };
}

// Poll for analysis status — used by the frontend to check completion
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

  if (!game.analysis) {
    return NextResponse.json({ status: "not_started" });
  }

  return NextResponse.json({
    status: game.analysis.status,
    accuracyWhite: game.analysis.accuracyWhite,
    accuracyBlack: game.analysis.accuracyBlack,
    moveEvals: game.analysis.status === "complete" ? game.analysis.moveEvals : null,
  });
}
