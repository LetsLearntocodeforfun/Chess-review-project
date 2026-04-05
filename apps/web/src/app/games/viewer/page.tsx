"use client";

import { useSearchParams } from "next/navigation";
import { GameViewer } from "@/components/game/GameViewer";

export default function ViewerPage() {
  const searchParams = useSearchParams();
  const fen = searchParams.get("fen") || undefined;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Position Viewer</h1>
      <GameViewer fen={fen} />
    </div>
  );
}
