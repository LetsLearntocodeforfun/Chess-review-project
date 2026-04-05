"use client";

import { Brain, Loader2 } from "lucide-react";
import type { AIReview as AIReviewType, KeyMistake } from "@chesslens/shared";

interface AIReviewProps {
  review: AIReviewType | null;
  isLoading?: boolean;
  onRequestReview?: () => void;
  onMoveClick?: (moveNumber: number) => void;
}

export function AIReview({
  review,
  isLoading = false,
  onRequestReview,
  onMoveClick,
}: AIReviewProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm">AI is reviewing your game...</p>
      </div>
    );
  }

  if (!review) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <Brain className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground text-center">
          Get AI-powered coaching advice for this game.
          <br />
          Powered by Azure OpenAI o3-mini.
        </p>
        {onRequestReview && (
          <button
            onClick={onRequestReview}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Brain className="h-4 w-4" />
            Generate AI Review
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 p-1">
      {/* Overall Rating */}
      <div className="rounded-md bg-primary/10 p-3">
        <p className="text-sm font-semibold text-primary">{review.overallRating}</p>
        <p className="mt-1 text-sm text-muted-foreground">{review.summary}</p>
      </div>

      {/* Opening */}
      <Section title="Opening" content={review.openingAssessment} />

      {/* Middlegame */}
      <Section title="Middlegame" content={review.middlegameThemes} />

      {/* Endgame */}
      <Section title="Endgame" content={review.endgameTechnique} />

      {/* Key Mistakes */}
      {review.keyMistakes.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold">Key Mistakes</h4>
          <div className="space-y-2">
            {review.keyMistakes.map((mistake, i) => (
              <MistakeCard
                key={i}
                mistake={mistake}
                onClick={() => onMoveClick?.(mistake.moveNumber)}
              />
            ))}
          </div>
        </div>
      )}

      {/* What to Study */}
      {review.whatToStudy.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold">What to Study</h4>
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            {review.whatToStudy.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Section({ title, content }: { title: string; content: string }) {
  if (!content) return null;
  return (
    <div>
      <h4 className="mb-1 text-sm font-semibold">{title}</h4>
      <p className="text-sm text-muted-foreground">{content}</p>
    </div>
  );
}

function MistakeCard({
  mistake,
  onClick,
}: {
  mistake: KeyMistake;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-md border border-border p-3 text-left hover:border-eval-mistake/50 transition-colors"
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="inline-block h-2 w-2 rounded-full bg-eval-mistake" />
        <span className="text-sm font-mono font-semibold">
          {mistake.moveNumber}. {mistake.move}
        </span>
        <span className="text-xs text-muted-foreground">({mistake.concept})</span>
      </div>
      <p className="text-xs text-muted-foreground">{mistake.explanation}</p>
      <p className="mt-1 text-xs">
        Better: <span className="font-mono text-primary">{mistake.betterMove}</span>
      </p>
    </button>
  );
}
