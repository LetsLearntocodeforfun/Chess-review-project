import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db";
import type { MoveEval } from "@chesslens/shared";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;

  // Fetch analyzed games with blunders/mistakes
  const analyses = await prisma.gameAnalysis.findMany({
    where: {
      status: "complete",
      game: { userId },
      OR: [
        { whiteBlunder: { gt: 0 } },
        { whiteMistake: { gt: 0 } },
        { blackBlunder: { gt: 0 } },
        { blackMistake: { gt: 0 } },
      ],
    },
    include: { game: { select: { id: true } } },
    orderBy: { analyzedAt: "desc" },
    take: 20,
  });

  const puzzles: any[] = [];

  for (const analysis of analyses) {
    const moveEvals = analysis.moveEvals as unknown as MoveEval[];
    if (!Array.isArray(moveEvals)) continue;

    // Determine which color the user played
    const userName = session.user?.name?.toLowerCase() || "";

    for (const ev of moveEvals) {
      if (ev.classification !== "blunder" && ev.classification !== "mistake") continue;
      if (ev.cpLoss < 80) continue; // Only significant mistakes
      if (!ev.bestMove || !ev.fen) continue;

      // Build puzzle: position is the FEN BEFORE the bad move.
      // Solution is the engine's best line.
      const solution = ev.bestLine && ev.bestLine.length > 0 ? ev.bestLine : [ev.bestMove];

      const difficulty = ev.cpLoss > 300 ? 2 : ev.cpLoss > 150 ? 3 : 4;

      puzzles.push({
        id: `${analysis.gameId}-${ev.moveNumber}-${ev.color}`,
        gameId: analysis.gameId,
        fen: ev.fen, // Position after the bad move — we'll need the position before
        solution,
        playerColor: ev.color,
        theme: ev.classification,
        difficulty,
        cpLoss: ev.cpLoss,
        description: `You played ${ev.move} (${ev.classification}, -${Math.round(ev.cpLoss)}cp). The best move was ${ev.bestMove}.`,
      });
    }
  }

  // Shuffle and limit
  const shuffled = puzzles.sort(() => Math.random() - 0.5).slice(0, 30);

  return NextResponse.json({ puzzles: shuffled });
}
