"use client";

import { useEffect, useCallback } from "react";
import { useGameStore } from "@/stores/gameStore";
import { ChessBoard } from "@/components/board/ChessBoard";
import { EvalBar } from "@/components/board/EvalBar";
import { MoveList } from "@/components/board/MoveList";
import { AIReview } from "@/components/analysis/AIReview";
import type { MoveClassification, MoveEval } from "@chesslens/shared";
import {
  SkipBack,
  ChevronLeft,
  ChevronRight,
  SkipForward,
  RotateCcw,
  Cpu,
  Brain,
  Download,
} from "lucide-react";

interface GameViewerProps {
  pgn?: string;
  fen?: string;
  gameId?: string;
}

export function GameViewer({ pgn, fen, gameId }: GameViewerProps) {
  const {
    fens,
    sans,
    headers,
    currentMoveIndex,
    moveEvals,
    isAnalyzed,
    orientation,
    loadPgn,
    loadFen,
    goToMove,
    goForward,
    goBack,
    goToStart,
    goToEnd,
    flipBoard,
  } = useGameStore();

  // Load game on mount
  useEffect(() => {
    if (pgn) {
      loadPgn(pgn);
    } else if (fen) {
      loadFen(fen);
    }
  }, [pgn, fen, loadPgn, loadFen]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          goForward();
          break;
        case "ArrowLeft":
          e.preventDefault();
          goBack();
          break;
        case "Home":
          e.preventDefault();
          goToStart();
          break;
        case "End":
          e.preventDefault();
          goToEnd();
          break;
        case "f":
          e.preventDefault();
          flipBoard();
          break;
      }
    },
    [goForward, goBack, goToStart, goToEnd, flipBoard]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Build move list data
  const moveListData = [];
  for (let i = 0; i < sans.length; i += 2) {
    const moveNumber = Math.floor(i / 2) + 1;
    const whiteEval = moveEvals.find(
      (e) => e.moveNumber === moveNumber && e.color === "white"
    );
    const blackEval = moveEvals.find(
      (e) => e.moveNumber === moveNumber && e.color === "black"
    );

    moveListData.push({
      moveNumber,
      white: sans[i]
        ? { san: sans[i], classification: whiteEval?.classification }
        : undefined,
      black: sans[i + 1]
        ? { san: sans[i + 1], classification: blackEval?.classification }
        : undefined,
    });
  }

  // Current eval for eval bar
  const currentEval = currentMoveIndex > 0
    ? moveEvals[currentMoveIndex - 1]
    : undefined;

  // Last move highlight
  const lastMove =
    currentMoveIndex > 0 && moveEvals[currentMoveIndex - 1]
      ? undefined // Will be enhanced with actual move squares later
      : undefined;

  // Best move arrow shapes
  const shapes =
    isAnalyzed && currentEval?.bestMove
      ? [] // Will be enhanced with arrow shapes later
      : [];

  const handleRequestAnalysis = async () => {
    if (!gameId) return;
    try {
      const res = await fetch(`/api/analysis/${gameId}`, { method: "POST" });
      if (!res.ok) throw new Error("Analysis request failed");
    } catch (error) {
      console.error("Failed to request analysis:", error);
    }
  };

  const handleRequestAIReview = async () => {
    if (!gameId) return;
    try {
      const res = await fetch(`/api/coaching/${gameId}`, { method: "POST" });
      if (!res.ok) throw new Error("AI review request failed");
    } catch (error) {
      console.error("Failed to request AI review:", error);
    }
  };

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      {/* Left: Board + Eval Bar */}
      <div className="flex gap-2">
        {isAnalyzed && (
          <EvalBar
            eval_cp={currentEval?.evalAfter ?? null}
            mate={currentEval?.mateAfter ?? null}
          />
        )}
        <div className="flex flex-col gap-2">
          {/* Player info (top - opponent) */}
          <PlayerBar
            name={orientation === "white" ? headers.Black : headers.White}
            elo={orientation === "white" ? headers.BlackElo : headers.WhiteElo}
            isTop
          />

          <ChessBoard
            fen={fens[currentMoveIndex]}
            orientation={orientation}
            viewOnly={true}
          />

          {/* Player info (bottom - player) */}
          <PlayerBar
            name={orientation === "white" ? headers.White : headers.Black}
            elo={orientation === "white" ? headers.WhiteElo : headers.BlackElo}
            isTop={false}
          />

          {/* Navigation controls */}
          <div className="flex items-center justify-center gap-1">
            <NavButton onClick={goToStart} title="Go to start (Home)">
              <SkipBack className="h-4 w-4" />
            </NavButton>
            <NavButton onClick={goBack} title="Previous move (←)">
              <ChevronLeft className="h-4 w-4" />
            </NavButton>
            <NavButton onClick={goForward} title="Next move (→)">
              <ChevronRight className="h-4 w-4" />
            </NavButton>
            <NavButton onClick={goToEnd} title="Go to end (End)">
              <SkipForward className="h-4 w-4" />
            </NavButton>
            <div className="mx-2 h-5 w-px bg-border" />
            <NavButton onClick={flipBoard} title="Flip board (F)">
              <RotateCcw className="h-4 w-4" />
            </NavButton>
          </div>
        </div>
      </div>

      {/* Right: Move list + Analysis */}
      <div className="flex flex-1 flex-col gap-4 lg:max-w-sm">
        {/* Game info header */}
        {headers.Event && (
          <div className="rounded-md border border-border bg-card p-3">
            <p className="text-sm font-semibold">{headers.Event}</p>
            <p className="text-xs text-muted-foreground">
              {headers.Date} • {headers.Result}
              {headers.TimeControl && ` • ${headers.TimeControl}`}
            </p>
          </div>
        )}

        {/* Move list */}
        <MoveList
          moves={moveListData}
          currentMoveIndex={currentMoveIndex}
          onMoveClick={goToMove}
        />

        {/* Action buttons */}
        <div className="flex gap-2">
          {!isAnalyzed && gameId && (
            <button
              onClick={handleRequestAnalysis}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-accent transition-colors"
            >
              <Cpu className="h-4 w-4" />
              Analyze with Stockfish
            </button>
          )}
          {isAnalyzed && (
            <button
              onClick={handleRequestAIReview}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Brain className="h-4 w-4" />
              AI Review
            </button>
          )}
        </div>

        {/* Accuracy stats */}
        {isAnalyzed && moveEvals.length > 0 && (
          <AccuracyStats moveEvals={moveEvals} />
        )}
      </div>
    </div>
  );
}

function PlayerBar({
  name,
  elo,
  isTop,
}: {
  name?: string;
  elo?: string;
  isTop: boolean;
}) {
  if (!name) return null;
  return (
    <div className="flex items-center gap-2 px-1">
      <div
        className={`h-3 w-3 rounded-sm ${isTop ? "bg-gray-800" : "bg-white border border-gray-300"}`}
      />
      <span className="text-sm font-medium">{name}</span>
      {elo && (
        <span className="text-xs text-muted-foreground">({elo})</span>
      )}
    </div>
  );
}

function NavButton({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="rounded-md border border-border p-2 hover:bg-accent transition-colors"
    >
      {children}
    </button>
  );
}

function AccuracyStats({ moveEvals }: { moveEvals: MoveEval[] }) {
  const whiteEvals = moveEvals.filter((e) => e.color === "white");
  const blackEvals = moveEvals.filter((e) => e.color === "black");

  const avgCpLoss = (evals: MoveEval[]) => {
    if (evals.length === 0) return 0;
    return evals.reduce((sum, e) => sum + e.cpLoss, 0) / evals.length;
  };

  // Simple accuracy formula: max(0, 100 - avgCpLoss / 2)
  const whiteAccuracy = Math.max(0, 100 - avgCpLoss(whiteEvals) / 2);
  const blackAccuracy = Math.max(0, 100 - avgCpLoss(blackEvals) / 2);

  const countByClass = (evals: MoveEval[], cls: MoveClassification) =>
    evals.filter((e) => e.classification === cls).length;

  return (
    <div className="rounded-md border border-border bg-card p-3">
      <h4 className="mb-2 text-sm font-semibold">Accuracy</h4>
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center">
          <p className="text-2xl font-bold">{whiteAccuracy.toFixed(1)}%</p>
          <p className="text-xs text-muted-foreground">White</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold">{blackAccuracy.toFixed(1)}%</p>
          <p className="text-xs text-muted-foreground">Black</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        {(
          ["blunder", "mistake", "inaccuracy"] as MoveClassification[]
        ).map((cls) => (
          <div key={cls} className="flex justify-between col-span-2">
            <span className={`move-${cls} capitalize`}>{cls}s</span>
            <span>
              {countByClass(whiteEvals, cls)} / {countByClass(blackEvals, cls)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
