import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { GameViewerWrapper } from "@/app/games/[id]/GameViewerWrapper";

interface SharePageProps {
  params: { token: string };
}

export default async function SharePage({ params }: SharePageProps) {
  // Find game by share token
  const game = await prisma.game.findFirst({
    where: { sourceId: `share:${params.token}` },
    include: { analysis: true },
  });

  if (!game) {
    return notFound();
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-4 rounded-md bg-primary/10 px-4 py-2 text-sm text-primary">
        Shared analysis — view only
      </div>
      <GameViewerWrapper
        gameId={game.id}
        pgn={game.pgn}
        analysis={
          game.analysis
            ? {
                moveEvals: game.analysis.moveEvals as any,
                aiReview: game.analysis.aiReview
                  ? JSON.parse(game.analysis.aiReview)
                  : null,
                status: game.analysis.status,
                accuracyWhite: game.analysis.accuracyWhite,
                accuracyBlack: game.analysis.accuracyBlack,
              }
            : null
        }
      />
    </div>
  );
}
