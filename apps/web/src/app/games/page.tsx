"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Crown,
  Clock,
  Upload,
  Trash2,
} from "lucide-react";
import { useImportedGames } from "@/stores/importedGamesStore";
import { useGameStore } from "@/stores/gameStore";

export default function GamesPage() {
  const { games, clearGames } = useImportedGames();
  const loadPgn = useGameStore((s) => s.loadPgn);
  const router = useRouter();

  const handleGameClick = (pgn: string) => {
    loadPgn(pgn);
    router.push("/games/viewer");
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Games</h1>
          <p className="text-muted-foreground">
            {games.length} game{games.length !== 1 ? "s" : ""} in your library
          </p>
        </div>
        <div className="flex gap-2">
          {games.length > 0 && (
            <button
              onClick={clearGames}
              className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Clear All
            </button>
          )}
          <Link
            href="/import"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Upload className="h-4 w-4" />
            Import
          </Link>
        </div>
      </div>

      {games.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <Crown className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
          <p className="mb-2 font-semibold">No games yet</p>
          <p className="mb-4 text-sm text-muted-foreground">
            Import games from PGN files or sync from Lichess / Chess.com.
            No account needed!
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
            const won = game.result === "1-0" || game.result === "0-1";
            const draw = game.result === "1/2-1/2";
            const resultLabel =
              game.result === "1-0" ? "1-0" : game.result === "0-1" ? "0-1" : draw ? "Draw" : "*";

            return (
              <button
                key={game.id}
                onClick={() => handleGameClick(game.pgn)}
                className="flex w-full items-center gap-4 rounded-md border border-border bg-card p-4 hover:border-primary/50 transition-colors text-left"
              >
                {/* Result */}
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-xs font-bold ${
                    game.result === "1-0"
                      ? "bg-white/10 text-foreground"
                      : game.result === "0-1"
                        ? "bg-white/10 text-foreground"
                        : "bg-yellow-500/20 text-yellow-500"
                  }`}
                >
                  {resultLabel}
                </div>

                {/* Game info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">
                      {game.white} vs {game.black}
                    </span>
                    {(game.whiteElo || game.blackElo) && (
                      <span className="text-xs text-muted-foreground">
                        ({game.whiteElo || "?"} / {game.blackElo || "?"})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    {game.openingName && <span>{game.openingName}</span>}
                    {game.timeClass && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {game.timeClass}
                      </span>
                    )}
                    <span className="capitalize">{game.source}</span>
                  </div>
                </div>

                {/* Date */}
                <div className="text-xs text-muted-foreground whitespace-nowrap">
                  {game.playedAt
                    ? new Date(game.playedAt).toLocaleDateString()
                    : ""}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}