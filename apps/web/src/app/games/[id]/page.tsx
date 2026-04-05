import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { notFound } from "next/navigation";
import { GameViewerWrapper } from "./GameViewerWrapper";

interface GamePageProps {
  params: { id: string };
}

export default async function GamePage({ params }: GamePageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return notFound();
  }

  const game = await prisma.game.findFirst({
    where: {
      id: params.id,
      userId: (session.user as any).id,
    },
    include: {
      analysis: true,
    },
  });

  if (!game) {
    return notFound();
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <GameViewerWrapper
        gameId={game.id}
        pgn={game.pgn}
        analysis={game.analysis ? {
          moveEvals: game.analysis.moveEvals as any,
          aiReview: game.analysis.aiReview ? JSON.parse(game.analysis.aiReview) : null,
          status: game.analysis.status,
          accuracyWhite: game.analysis.accuracyWhite,
          accuracyBlack: game.analysis.accuracyBlack,
        } : null}
      />
    </div>
  );
}
