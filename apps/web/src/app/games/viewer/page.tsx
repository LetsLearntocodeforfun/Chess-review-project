"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { GameViewer } from "@/components/game/GameViewer";
import { useGameStore } from "@/stores/gameStore";

function ViewerContent() {
  const searchParams = useSearchParams();
  const fenParam = searchParams.get("fen") || undefined;
  const storePgn = useGameStore((s) => s.pgn);

  // Use the PGN from the store (set by games list click) or FEN from URL
  return <GameViewer pgn={storePgn || undefined} fen={fenParam} />;
}

export default function ViewerPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Suspense fallback={<div className="text-muted-foreground">Loading...</div>}>
        <ViewerContent />
      </Suspense>
    </div>
  );
}