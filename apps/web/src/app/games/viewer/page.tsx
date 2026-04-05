"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { GameViewer } from "@/components/game/GameViewer";

function ViewerContent() {
  const searchParams = useSearchParams();
  const fen = searchParams.get("fen") || undefined;

  return <GameViewer fen={fen} />;
}

export default function ViewerPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Position Viewer</h1>
      <Suspense fallback={<div className="text-muted-foreground">Loading...</div>}>
        <ViewerContent />
      </Suspense>
    </div>
  );
}
