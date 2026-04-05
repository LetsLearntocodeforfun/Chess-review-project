"use client";

import { useState, useEffect } from "react";
import { ChessBoard } from "@/components/board/ChessBoard";
import { Chess } from "chess.js";
import { BookOpen, BarChart3, ArrowLeft, RotateCcw } from "lucide-react";

interface ExplorerMove {
  san: string;
  uci: string;
  games: number;
  whiteWins: number;
  draws: number;
  blackWins: number;
  averageRating: number;
}

export default function ExplorerPage() {
  const [chess] = useState(new Chess());
  const [fen, setFen] = useState(chess.fen());
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [explorerData, setExplorerData] = useState<ExplorerMove[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [database, setDatabase] = useState<"lichess" | "masters">("lichess");
  const [ratingRange, setRatingRange] = useState("1600,2000");

  // Fetch explorer data from Lichess API
  useEffect(() => {
    const fetchExplorer = async () => {
      setIsLoading(true);
      try {
        const play = moveHistory.join(",");
        const baseUrl =
          database === "masters"
            ? "https://explorer.lichess.ovh/masters"
            : "https://explorer.lichess.ovh/lichess";

        const params = new URLSearchParams({
          fen,
          ...(database === "lichess" && {
            ratings: ratingRange,
            speeds: "rapid,classical,correspondence",
          }),
        });

        const res = await fetch(`${baseUrl}?${params}`, {
          headers: { Accept: "application/json" },
        });

        if (res.ok) {
          const data = await res.json();
          const moves: ExplorerMove[] = (data.moves || []).map((m: any) => ({
            san: m.san,
            uci: m.uci,
            games: (m.white || 0) + (m.draws || 0) + (m.black || 0),
            whiteWins: m.white || 0,
            draws: m.draws || 0,
            blackWins: m.black || 0,
            averageRating: m.averageRating || 0,
          }));
          setExplorerData(moves);
        }
      } catch {
        setExplorerData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchExplorer();
  }, [fen, database, ratingRange, moveHistory]);

  const handleMove = (from: string, to: string, promotion?: string) => {
    const result = chess.move({ from, to, promotion: promotion as any });
    if (result) {
      setFen(chess.fen());
      setMoveHistory((prev) => [...prev, result.san]);
    }
  };

  const handleExplorerMoveClick = (san: string) => {
    const result = chess.move(san);
    if (result) {
      setFen(chess.fen());
      setMoveHistory((prev) => [...prev, result.san]);
    }
  };

  const handleGoBack = () => {
    chess.undo();
    setFen(chess.fen());
    setMoveHistory((prev) => prev.slice(0, -1));
  };

  const handleReset = () => {
    chess.reset();
    setFen(chess.fen());
    setMoveHistory([]);
  };

  const totalGames = explorerData.reduce((sum, m) => sum + m.games, 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Opening Explorer</h1>
        <p className="text-muted-foreground">
          Explore opening theory with millions of games from Lichess and master databases
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Board */}
        <div className="flex flex-col gap-2">
          <ChessBoard
            fen={fen}
            orientation="white"
            interactive={true}
            onMove={handleMove}
            viewOnly={false}
          />

          <div className="flex items-center gap-2">
            <button
              onClick={handleGoBack}
              disabled={moveHistory.length === 0}
              className="rounded-md border border-border p-2 hover:bg-accent transition-colors disabled:opacity-50"
              title="Take back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              onClick={handleReset}
              className="rounded-md border border-border p-2 hover:bg-accent transition-colors"
              title="Reset board"
            >
              <RotateCcw className="h-4 w-4" />
            </button>

            {/* Move breadcrumbs */}
            {moveHistory.length > 0 && (
              <div className="flex flex-wrap gap-1 text-sm font-mono ml-2">
                {moveHistory.map((m, i) => (
                  <span key={i}>
                    {i % 2 === 0 && (
                      <span className="text-muted-foreground">
                        {Math.floor(i / 2) + 1}.{" "}
                      </span>
                    )}
                    {m}{" "}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Explorer sidebar */}
        <div className="flex flex-1 flex-col gap-4 lg:max-w-md">
          {/* Database selector */}
          <div className="flex gap-2">
            <button
              onClick={() => setDatabase("lichess")}
              className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                database === "lichess"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:bg-accent"
              }`}
            >
              Lichess Database
            </button>
            <button
              onClick={() => setDatabase("masters")}
              className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                database === "masters"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:bg-accent"
              }`}
            >
              Masters Database
            </button>
          </div>

          {/* Rating filter (Lichess only) */}
          {database === "lichess" && (
            <div className="flex gap-2">
              {["1000,1400", "1400,1800", "1600,2000", "1800,2200", "2200,2500"].map(
                (range) => {
                  const [low, high] = range.split(",");
                  return (
                    <button
                      key={range}
                      onClick={() => setRatingRange(range)}
                      className={`rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
                        ratingRange === range
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:bg-accent"
                      }`}
                    >
                      {low}-{high}
                    </button>
                  );
                }
              )}
            </div>
          )}

          {/* Move table */}
          <div className="rounded-lg border border-border bg-card">
            <div className="border-b border-border px-4 py-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Moves
              </h3>
              <span className="text-xs text-muted-foreground">
                {totalGames.toLocaleString()} games
              </span>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : explorerData.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No games found in this position
              </div>
            ) : (
              <div className="divide-y divide-border">
                {/* Header */}
                <div className="grid grid-cols-12 gap-1 px-4 py-2 text-xs text-muted-foreground font-medium">
                  <div className="col-span-2">Move</div>
                  <div className="col-span-3 text-right">Games</div>
                  <div className="col-span-7">Result Distribution</div>
                </div>

                {explorerData.map((move) => {
                  const total = move.games;
                  const wPct = total > 0 ? (move.whiteWins / total) * 100 : 0;
                  const dPct = total > 0 ? (move.draws / total) * 100 : 0;
                  const bPct = total > 0 ? (move.blackWins / total) * 100 : 0;

                  return (
                    <button
                      key={move.san}
                      onClick={() => handleExplorerMoveClick(move.san)}
                      className="grid grid-cols-12 gap-1 px-4 py-2 text-sm hover:bg-accent transition-colors w-full text-left"
                    >
                      <div className="col-span-2 font-mono font-semibold">
                        {move.san}
                      </div>
                      <div className="col-span-3 text-right text-xs text-muted-foreground">
                        {move.games.toLocaleString()}
                      </div>
                      <div className="col-span-7 flex items-center gap-1">
                        <div className="flex h-3 flex-1 overflow-hidden rounded-full">
                          <div
                            className="bg-white"
                            style={{ width: `${wPct}%` }}
                            title={`White: ${wPct.toFixed(1)}%`}
                          />
                          <div
                            className="bg-gray-400"
                            style={{ width: `${dPct}%` }}
                            title={`Draw: ${dPct.toFixed(1)}%`}
                          />
                          <div
                            className="bg-gray-800"
                            style={{ width: `${bPct}%` }}
                            title={`Black: ${bPct.toFixed(1)}%`}
                          />
                        </div>
                        <span className="w-10 text-right text-[10px] text-muted-foreground">
                          {wPct.toFixed(0)}%
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Position summary */}
          {explorerData.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-4">
              <h4 className="mb-2 text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Position Summary
              </h4>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-lg font-bold">
                    {(
                      (explorerData.reduce((s, m) => s + m.whiteWins, 0) /
                        totalGames) *
                      100
                    ).toFixed(1)}
                    %
                  </p>
                  <p className="text-xs text-muted-foreground">White wins</p>
                </div>
                <div>
                  <p className="text-lg font-bold">
                    {(
                      (explorerData.reduce((s, m) => s + m.draws, 0) /
                        totalGames) *
                      100
                    ).toFixed(1)}
                    %
                  </p>
                  <p className="text-xs text-muted-foreground">Draws</p>
                </div>
                <div>
                  <p className="text-lg font-bold">
                    {(
                      (explorerData.reduce((s, m) => s + m.blackWins, 0) /
                        totalGames) *
                      100
                    ).toFixed(1)}
                    %
                  </p>
                  <p className="text-xs text-muted-foreground">Black wins</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
