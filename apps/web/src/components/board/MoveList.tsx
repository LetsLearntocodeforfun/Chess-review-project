"use client";

import type { MoveClassification } from "@chesslens/shared";

interface MoveData {
  moveNumber: number;
  white?: {
    san: string;
    classification?: MoveClassification;
  };
  black?: {
    san: string;
    classification?: MoveClassification;
  };
}

interface MoveListProps {
  moves: MoveData[];
  currentMoveIndex: number;
  onMoveClick: (index: number) => void;
}

const classificationDot: Record<MoveClassification, string> = {
  brilliant: "bg-eval-brilliant",
  great: "bg-eval-great",
  good: "bg-eval-good",
  book: "bg-amber-700",
  inaccuracy: "bg-eval-inaccuracy",
  mistake: "bg-eval-mistake",
  blunder: "bg-eval-blunder",
};

export function MoveList({
  moves,
  currentMoveIndex,
  onMoveClick,
}: MoveListProps) {
  return (
    <div className="flex-1 overflow-y-auto rounded-md border border-border bg-card">
      <div className="sticky top-0 border-b border-border bg-card px-3 py-2">
        <h3 className="text-sm font-semibold text-muted-foreground">Moves</h3>
      </div>
      <div className="p-1">
        {moves.map((move, rowIndex) => {
          const whiteIdx = rowIndex * 2 + 1;
          const blackIdx = rowIndex * 2 + 2;

          return (
            <div
              key={move.moveNumber}
              className="flex items-center text-sm hover:bg-accent/50 rounded"
            >
              {/* Move number */}
              <span className="w-8 shrink-0 text-right text-xs text-muted-foreground pr-1">
                {move.moveNumber}.
              </span>

              {/* White's move */}
              {move.white ? (
                <button
                  onClick={() => onMoveClick(whiteIdx)}
                  className={`flex items-center gap-1 flex-1 px-1.5 py-0.5 rounded text-left font-mono ${
                    currentMoveIndex === whiteIdx
                      ? "bg-primary/20 text-primary font-bold"
                      : "hover:bg-accent"
                  }`}
                >
                  {move.white.classification && (
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${
                        classificationDot[move.white.classification]
                      }`}
                    />
                  )}
                  {move.white.san}
                </button>
              ) : (
                <span className="flex-1" />
              )}

              {/* Black's move */}
              {move.black ? (
                <button
                  onClick={() => onMoveClick(blackIdx)}
                  className={`flex items-center gap-1 flex-1 px-1.5 py-0.5 rounded text-left font-mono ${
                    currentMoveIndex === blackIdx
                      ? "bg-primary/20 text-primary font-bold"
                      : "hover:bg-accent"
                  }`}
                >
                  {move.black.classification && (
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${
                        classificationDot[move.black.classification]
                      }`}
                    />
                  )}
                  {move.black.san}
                </button>
              ) : (
                <span className="flex-1" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
