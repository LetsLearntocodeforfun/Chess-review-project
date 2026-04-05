"use client";

import { useState, useEffect, useCallback } from "react";
import { ChessBoard } from "@/components/board/ChessBoard";
import { Chess } from "chess.js";
import {
  Zap,
  RotateCcw,
  Eye,
  ChevronRight,
  Trophy,
  Flame,
  Target,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface Puzzle {
  id: string;
  gameId: string;
  fen: string;
  solution: string[]; // Array of SAN moves (correct line)
  playerColor: "white" | "black";
  theme: string; // e.g., "blunder", "tactic", "endgame"
  difficulty: number; // 1-5
  cpLoss: number;
  description: string;
}

export default function PuzzlesPage() {
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [status, setStatus] = useState<"loading" | "solving" | "correct" | "wrong" | "empty">(
    "loading"
  );
  const [moveIndex, setMoveIndex] = useState(0);
  const [chess, setChess] = useState(new Chess());
  const [showHint, setShowHint] = useState(false);
  const [streak, setStreak] = useState(0);
  const [solved, setSolved] = useState(0);
  const [total, setTotal] = useState(0);

  // Load puzzles from analyzed games
  useEffect(() => {
    fetch("/api/puzzles")
      .then((r) => r.json())
      .then((data) => {
        if (data.puzzles && data.puzzles.length > 0) {
          setPuzzles(data.puzzles);
          loadPuzzle(data.puzzles[0]);
          setStatus("solving");
        } else {
          setStatus("empty");
        }
      })
      .catch(() => setStatus("empty"));
  }, []);

  const loadPuzzle = (puzzle: Puzzle) => {
    const c = new Chess(puzzle.fen);
    // If it's a "find the best move" puzzle and opponent moves first,
    // play the opponent's first move
    if (puzzle.solution.length > 0 && puzzle.playerColor !== (c.turn() === "w" ? "white" : "black")) {
      c.move(puzzle.solution[0]);
      setMoveIndex(1);
    } else {
      setMoveIndex(0);
    }
    setChess(c);
    setShowHint(false);
  };

  const handleMove = useCallback(
    (from: string, to: string, promotion?: string) => {
      const puzzle = puzzles[currentIndex];
      if (!puzzle || status !== "solving") return;

      const c = new Chess(chess.fen());
      const result = c.move({ from, to, promotion: promotion as any });
      if (!result) return;

      const expectedMove = puzzle.solution[moveIndex];

      if (result.san === expectedMove) {
        // Correct move
        const nextIdx = moveIndex + 1;

        if (nextIdx >= puzzle.solution.length) {
          // Puzzle complete
          setChess(c);
          setStatus("correct");
          setStreak((s) => s + 1);
          setSolved((s) => s + 1);
          setTotal((t) => t + 1);
          return;
        }

        // Play opponent's response
        if (nextIdx < puzzle.solution.length) {
          c.move(puzzle.solution[nextIdx]);
          setMoveIndex(nextIdx + 1);
        }

        setChess(c);
      } else {
        // Wrong move
        setChess(c);
        setStatus("wrong");
        setStreak(0);
        setTotal((t) => t + 1);
      }
    },
    [chess, puzzles, currentIndex, moveIndex, status]
  );

  const nextPuzzle = () => {
    const nextIdx = currentIndex + 1;
    if (nextIdx < puzzles.length) {
      setCurrentIndex(nextIdx);
      loadPuzzle(puzzles[nextIdx]);
      setStatus("solving");
    }
  };

  const retryPuzzle = () => {
    loadPuzzle(puzzles[currentIndex]);
    setStatus("solving");
  };

  const puzzle = puzzles[currentIndex];

  if (status === "loading") {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <div className="h-6 w-6 mx-auto animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="mt-4 text-muted-foreground">Loading puzzles from your games...</p>
      </div>
    );
  }

  if (status === "empty") {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <Target className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h1 className="mb-2 text-2xl font-bold">Puzzle Trainer</h1>
        <p className="mb-6 text-muted-foreground">
          No puzzles yet. Puzzles are generated from blunders and mistakes in your
          analyzed games. Import and analyze some games first!
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Puzzle Trainer</h1>
          <p className="text-muted-foreground">
            Puzzles generated from your own blunders — fix your weaknesses
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Flame className="h-4 w-4 text-orange-500" />
            <span className="font-bold">{streak}</span>
            <span className="text-muted-foreground">streak</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Trophy className="h-4 w-4 text-yellow-500" />
            <span className="font-bold">
              {total > 0 ? Math.round((solved / total) * 100) : 0}%
            </span>
            <span className="text-muted-foreground">
              ({solved}/{total})
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Board */}
        <div className="flex flex-col gap-3">
          {puzzle && (
            <ChessBoard
              fen={chess.fen()}
              orientation={puzzle.playerColor}
              interactive={status === "solving"}
              onMove={handleMove}
              viewOnly={status !== "solving"}
            />
          )}

          {/* Status bar */}
          <div className="flex items-center justify-center gap-3">
            {status === "solving" && (
              <div className="flex items-center gap-2 rounded-md bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
                <Zap className="h-4 w-4" />
                Your turn — find the best move!
              </div>
            )}
            {status === "correct" && (
              <div className="flex items-center gap-2 rounded-md bg-green-500/10 px-4 py-2 text-sm font-medium text-green-500">
                <CheckCircle2 className="h-4 w-4" />
                Correct! Well done.
              </div>
            )}
            {status === "wrong" && (
              <div className="flex items-center gap-2 rounded-md bg-red-500/10 px-4 py-2 text-sm font-medium text-red-500">
                <XCircle className="h-4 w-4" />
                Incorrect — the best move was{" "}
                <span className="font-mono">{puzzle?.solution[moveIndex]}</span>
              </div>
            )}
          </div>
        </div>

        {/* Puzzle info sidebar */}
        <div className="flex flex-1 flex-col gap-4 lg:max-w-sm">
          {puzzle && (
            <>
              <div className="rounded-lg border border-border bg-card p-4">
                <h3 className="mb-2 text-sm font-semibold">Puzzle Info</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Theme</span>
                    <span className="capitalize font-medium">{puzzle.theme}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Difficulty</span>
                    <span>{"★".repeat(puzzle.difficulty)}{"☆".repeat(5 - puzzle.difficulty)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">From game</span>
                    <a
                      href={`/games/${puzzle.gameId}`}
                      className="text-primary hover:underline"
                    >
                      View game
                    </a>
                  </div>
                  {puzzle.description && (
                    <p className="mt-2 text-xs text-muted-foreground border-t border-border pt-2">
                      {puzzle.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                {status === "solving" && (
                  <button
                    onClick={() => setShowHint(!showHint)}
                    className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-4 py-2 text-sm hover:bg-accent transition-colors"
                  >
                    <Eye className="h-4 w-4" />
                    {showHint ? `Hint: ${puzzle.solution[moveIndex]?.[0]}...` : "Show Hint"}
                  </button>
                )}
                {(status === "correct" || status === "wrong") && (
                  <>
                    <button
                      onClick={nextPuzzle}
                      disabled={currentIndex >= puzzles.length - 1}
                      className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      <ChevronRight className="h-4 w-4" />
                      Next Puzzle
                    </button>
                    {status === "wrong" && (
                      <button
                        onClick={retryPuzzle}
                        className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-4 py-2 text-sm hover:bg-accent"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Retry
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Progress */}
              <div className="rounded-lg border border-border bg-card p-4">
                <h3 className="mb-2 text-sm font-semibold">Progress</h3>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{
                        width: `${((currentIndex + 1) / puzzles.length) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {currentIndex + 1}/{puzzles.length}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
