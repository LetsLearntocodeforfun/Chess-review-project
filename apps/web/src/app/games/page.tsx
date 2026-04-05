import Link from "next/link";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  Crown,
  Clock,
  TrendingUp,
  Upload,
  Cpu,
  CheckCircle2,
} from "lucide-react";

export default async function GamesPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <Crown className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h1 className="mb-2 text-2xl font-bold">Your Game Library</h1>
        <p className="mb-6 text-muted-foreground">
          Sign in to view and analyze your chess games.
        </p>
        <Link
          href="/api/auth/signin"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Sign in to get started
        </Link>
      </div>
    );
  }

  const userId = (session.user as any).id;

  const games = await prisma.game.findMany({
    where: { userId },
    include: { analysis: { select: { status: true, accuracyWhite: true, accuracyBlack: true } } },
    orderBy: { playedAt: "desc" },
    take: 50,
  });

  const totalGames = await prisma.game.count({ where: { userId } });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Games</h1>
          <p className="text-muted-foreground">
            {totalGames} game{totalGames !== 1 ? "s" : ""} in your library
          </p>
        </div>
        <Link
          href="/import"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Upload className="h-4 w-4" />
          Import
        </Link>
      </div>

      {games.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <Crown className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
          <p className="mb-2 font-semibold">No games yet</p>
          <p className="mb-4 text-sm text-muted-foreground">
            Import games from PGN files or sync from Lichess/Chess.com.
          </p>
          <Link
            href="/import"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Upload className="h-4 w-4" />
            Import Games
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {games.map((game) => {
            const isWhite = game.white.toLowerCase().includes(
              session.user?.name?.toLowerCase() || ""
            );
            const playerColor = isWhite ? "white" : "black";
            const opponent = isWhite ? game.black : game.white;
            const playerElo = isWhite ? game.whiteElo : game.blackElo;
            const opponentElo = isWhite ? game.blackElo : game.whiteElo;
            const won =
              (isWhite && game.result === "1-0") ||
              (!isWhite && game.result === "0-1");
            const lost =
              (isWhite && game.result === "0-1") ||
              (!isWhite && game.result === "1-0");
            const draw = game.result === "1/2-1/2";

            return (
              <Link
                key={game.id}
                href={`/games/${game.id}`}
                className="flex items-center gap-4 rounded-md border border-border bg-card p-4 hover:border-primary/50 transition-colors"
              >
                {/* Result indicator */}
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-md text-sm font-bold ${
                    won
                      ? "bg-green-500/20 text-green-500"
                      : lost
                        ? "bg-red-500/20 text-red-500"
                        : "bg-yellow-500/20 text-yellow-500"
                  }`}
                >
                  {won ? "W" : lost ? "L" : "D"}
                </div>

                {/* Game info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">vs {opponent}</span>
                    {opponentElo && (
                      <span className="text-xs text-muted-foreground">
                        ({opponentElo})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {game.openingName && <span>{game.openingName}</span>}
                    {game.timeClass && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {game.timeClass}
                      </span>
                    )}
                    {game.source && (
                      <span className="capitalize">{game.source}</span>
                    )}
                  </div>
                </div>

                {/* Analysis status */}
                <div className="text-right">
                  {game.analysis?.status === "complete" ? (
                    <div className="flex items-center gap-1 text-xs text-green-500">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>
                        {playerColor === "white"
                          ? game.analysis.accuracyWhite?.toFixed(1)
                          : game.analysis.accuracyBlack?.toFixed(1)}
                        %
                      </span>
                    </div>
                  ) : game.analysis?.status === "analyzing" ? (
                    <span className="text-xs text-muted-foreground">Analyzing...</span>
                  ) : (
                    <Cpu className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>

                {/* Date */}
                <div className="text-xs text-muted-foreground whitespace-nowrap">
                  {game.playedAt
                    ? new Date(game.playedAt).toLocaleDateString()
                    : "Unknown date"}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
