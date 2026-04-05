"use client";

import { useEffect, useState } from "react";
import { GameViewer } from "@/components/game/GameViewer";
import { AIReview } from "@/components/analysis/AIReview";
import { useGameStore } from "@/stores/gameStore";
import type { AIReview as AIReviewType, MoveEval } from "@chesslens/shared";

interface GameViewerWrapperProps {
  gameId: string;
  pgn: string;
  analysis: {
    moveEvals: MoveEval[];
    aiReview: AIReviewType | null;
    status: string;
    accuracyWhite: number | null;
    accuracyBlack: number | null;
  } | null;
}

export function GameViewerWrapper({
  gameId,
  pgn,
  analysis,
}: GameViewerWrapperProps) {
  const setMoveEvals = useGameStore((s) => s.setMoveEvals);
  const [aiReview, setAiReview] = useState<AIReviewType | null>(
    analysis?.aiReview || null
  );
  const [isLoadingReview, setIsLoadingReview] = useState(false);

  // Load analysis data into the store
  useEffect(() => {
    if (analysis?.moveEvals && Array.isArray(analysis.moveEvals)) {
      setMoveEvals(analysis.moveEvals);
    }
  }, [analysis, setMoveEvals]);

  const handleRequestAIReview = async () => {
    setIsLoadingReview(true);
    try {
      const res = await fetch(`/api/coaching/${gameId}`, { method: "POST" });
      if (!res.ok) throw new Error("Review request failed");
      const data = await res.json();
      setAiReview(data.review);
    } catch (error) {
      console.error("Failed to request AI review:", error);
    } finally {
      setIsLoadingReview(false);
    }
  };

  const goToMove = useGameStore((s) => s.goToMove);

  return (
    <div className="flex flex-col gap-6 xl:flex-row">
      <div className="flex-1">
        <GameViewer pgn={pgn} />
      </div>
      <div className="w-full xl:max-w-sm">
        <div className="rounded-lg border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold">AI Coaching</h3>
          </div>
          <div className="p-4">
            <AIReview
              review={aiReview}
              isLoading={isLoadingReview}
              onRequestReview={handleRequestAIReview}
              onMoveClick={(moveNum) => goToMove(moveNum * 2)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
