"use client";

import { useEffect, useRef, useState } from "react";
import { Chessground } from "@lichess-org/chessground";
import type { Api } from "@lichess-org/chessground/api";
import type { Config } from "@lichess-org/chessground/config";
import type { Key } from "@lichess-org/chessground/types";
import { Chess, type Square } from "chess.js";

interface ChessBoardProps {
  fen?: string;
  orientation?: "white" | "black";
  onMove?: (from: string, to: string, promotion?: string) => void;
  interactive?: boolean;
  lastMove?: [Key, Key];
  shapes?: any[];
  width?: number;
  height?: number;
  viewOnly?: boolean;
}

export function ChessBoard({
  fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  orientation = "white",
  onMove,
  interactive = false,
  lastMove,
  shapes,
  width = 560,
  height = 560,
  viewOnly = true,
}: ChessBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<Api | null>(null);
  const chessRef = useRef(new Chess(fen));

  useEffect(() => {
    if (!boardRef.current) return;

    const chess = chessRef.current;
    try {
      chess.load(fen);
    } catch {
      // Invalid FEN, keep current position
    }

    const config: Config = {
      fen,
      orientation,
      viewOnly,
      lastMove: lastMove || undefined,
      coordinates: true,
      autoCastle: true,
      animation: { enabled: true, duration: 200 },
      highlight: {
        lastMove: true,
        check: true,
      },
      drawable: {
        enabled: true,
        visible: true,
        autoShapes: shapes || [],
      },
      movable: interactive
        ? {
            free: false,
            color: chess.turn() === "w" ? "white" : "black",
            dests: getLegalMoves(chess),
            showDests: true,
            events: {
              after: (orig: Key, dest: Key) => {
                // Check for promotion
                const piece = chess.get(orig as Square);
                const isPromotion =
                  piece?.type === "p" &&
                  ((piece.color === "w" && dest[1] === "8") ||
                    (piece.color === "b" && dest[1] === "1"));

                const promotion = isPromotion ? "q" : undefined;
                onMove?.(orig, dest, promotion);
              },
            },
          }
        : { free: false, color: undefined },
    };

    if (apiRef.current) {
      apiRef.current.set(config);
    } else {
      apiRef.current = Chessground(boardRef.current, config);
    }

    return () => {
      // Cleanup is handled by Chessground internally
    };
  }, [fen, orientation, interactive, lastMove, shapes, viewOnly, onMove]);

  return (
    <div
      ref={boardRef}
      style={{ width: `${width}px`, height: `${height}px` }}
      className="rounded-md overflow-hidden"
    />
  );
}

function getLegalMoves(chess: Chess): Map<Key, Key[]> {
  const dests = new Map<Key, Key[]>();
  const moves = chess.moves({ verbose: true });

  for (const move of moves) {
    const from = move.from as Key;
    const to = move.to as Key;
    if (!dests.has(from)) {
      dests.set(from, []);
    }
    dests.get(from)!.push(to);
  }

  return dests;
}
