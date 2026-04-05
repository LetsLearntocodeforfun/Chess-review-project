"use client";

import { useEffect, useCallback, useState } from "react";
import { useGameStore } from "@/stores/gameStore";
import { ChessBoard } from "@/components/board/ChessBoard";
import { EvalBar } from "@/components/board/EvalBar";
import { MoveList } from "@/components/board/MoveList";
import { useStockfish } from "@/hooks/useStockfish";
import type { MoveClassification, MoveEval } from "@chesslens/shared";
import {
  SkipBack,
  ChevronLeft,
  ChevronRight,
  SkipForward,
  RotateCcw,
  Cpu,
  Brain,
  Loader2,
} from "lucide-react";

interface GameViewerProps {
  pgn?: string;
  fen?: string;
}

export function GameViewer({ pgn, fen }: GameViewerProps) {
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
    setMoveEvals,
  } = useGameStore();

  const { isReady, isAnalyzing, currentEval, analyzeFen, analyzeGame, stop } =
    useStockfish();

  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [aiReview, setAiReview] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [liveEval, setLiveEval] = useState<{ cp?: number; mate?: number } | null>(null);

  // Load game on mount
  useEffect(() => {
    if (pgn) {
      loadPgn(pgn);
    } else if (fen) {
      loadFen(fen);
    }
  }, [pgn, fen, loadPgn, loadFen]);

  // Live eval: analyze current position as user navigates
  useEffect(() => {
    if (isReady && fens[currentMoveIndex] && !isAnalyzing) {
      analyzeFen(fens[currentMoveIndex], 18);
    }
  }, [currentMoveIndex, fens, isReady, isAnalyzing, analyzeFen]);

  // Update live eval from Stockfish output
  useEffect(() => {
    if (currentEval) {
      setLiveEval({ cp: currentEval.cp, mate: currentEval.mate });
    }
  }, [currentEval]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowRight": e.preventDefault(); goForward(); break;
        case "ArrowLeft": e.preventDefault(); goBack(); break;
        case "Home": e.preventDefault(); goToStart(); break;
        case "End": e.preventDefault(); goToEnd(); break;
        case "f": e.preventDefault(); flipBoard(); break;
      }
    },
    [goForward, goBack, goToStart, goToEnd, flipBoard]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Full game analysis with Stockfish
  const handleFullAnalysis = useCallback(async () => {
    if (fens.length < 2) return;
    stop();
    setAnalysisProgress(0);

    const results = await analyzeGame(fens, (idx, total) => {
      setAnalysisProgress(Math.round(((idx + 1) / total) * 100));
    });

    // Convert engine evals to MoveEval format
    const evals: MoveEval[] = [];
    for (let i = 1; i < results.length; i++) {
      const before = results[i - 1];
      const after = results[i];
      const moveNum = Math.ceil(i / 2);
      const color = i % 2 === 1 ? "white" : "black";

      // CP loss from the mover's perspective
      const evalBefore = before.mate != null ? (before.mate > 0 ? 10000 : -10000) : (before.cp ?? 0);
      const evalAfter = after.mate != null ? (after.mate > 0 ? 10000 : -10000) : (after.cp ?? 0);

      let cpLoss = 0;
      if (color === "white") {
        cpLoss = Math.max(0, evalBefore - evalAfter);
      } else {
        cpLoss = Math.max(0, evalAfter - evalBefore);
      }

      let classification: MoveClassification = "good";
      if (cpLoss <= 10) classification = "great";
      else if (cpLoss <= 50) classification = "good";
      else if (cpLoss <= 100) classification = "inaccuracy";
      else if (cpLoss <= 200) classification = "mistake";
      else classification = "blunder";

      evals.push({
        moveNumber: moveNum,
        color: color as any,
        move: sans[i - 1] || "",
        fen: fens[i],
        evalBefore: before.cp ?? null,
        evalAfter: after.cp ?? null,
        mateBefore: before.mate ?? null,
        mateAfter: after.mate ?? null,
        bestMove: before.bestMove || "",
        bestLine: before.pv?.slice(0, 5) || [],
        classification,
        cpLoss: Math.round(cpLoss),
      });
    }

    setMoveEvals(evals);
    setAnalysisProgress(100);
  }, [fens, sans, analyzeGame, stop, setMoveEvals]);

  // AI coaching via live API
  const handleAICoach = useCallback(async () => {
    if (!isAnalyzed || moveEvals.length === 0) return;
    setAiLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_ANALYSIS_URL || 
        "https://chesslens-api.salmonbeach-6ce8e8ff.eastus2.azurecontainerapps.io";
      const res = await fetch(`${apiUrl}/coaching/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: "browser-game",
          pgn: pgn || "",
          moveEvals: moveEvals,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "AI review failed");
      }
      const data = await res.json();
      setAiReview(data.review);
    } catch (error: any) {
      console.error("AI coaching error:", error);
      setAiReview({ 
        summary: "AI coaching is temporarily unavailable. Please try again later.",
        overallRating: "Service unavailable",
        openingAssessment: "",
        middlegameThemes: "",
        endgameTechnique: "",
        keyMistakes: [],
        whatToStudy: [],
      });
    } finally {
      setAiLoading(false);
    }
  }, [isAnalyzed, moveEvals, pgn]);

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
      white: sans[i] ? { san: sans[i], classification: whiteEval?.classification } : undefined,
      black: sans[i + 1] ? { san: sans[i + 1], classification: blackEval?.classification } : undefined,
    });
  }

  // Current eval for eval bar: use analysis data if available, else live eval
  const currentMoveEval = currentMoveIndex > 0 ? moveEvals[currentMoveIndex - 1] : undefined;
  const evalCp = currentMoveEval?.evalAfter ?? liveEval?.cp ?? null;
  const evalMate = currentMoveEval?.mateAfter ?? liveEval?.mate ?? null;

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      {/* Left: Eval Bar + Board */}
      <div className="flex gap-2">
        <EvalBar eval_cp={evalCp} mate={evalMate} />
        <div className="flex flex-col gap-2">
          <PlayerBar
            name={orientation === "white" ? headers.Black : headers.White}
            elo={orientation === "white" ? headers.BlackElo : headers.WhiteElo}
            isTop
          />
          <ChessBoard fen={fens[currentMoveIndex]} orientation={orientation} viewOnly={true} />
          <PlayerBar
            name={orientation === "white" ? headers.White : headers.Black}
            elo={orientation === "white" ? headers.WhiteElo : headers.BlackElo}
            isTop={false}
          />
          <div className="flex items-center justify-center gap-1">
            <NavButton onClick={goToStart} title="Start (Home)"><SkipBack className="h-4 w-4" /></NavButton>
            <NavButton onClick={goBack} title="Back (←)"><ChevronLeft className="h-4 w-4" /></NavButton>
            <NavButton onClick={goForward} title="Forward (→)"><ChevronRight className="h-4 w-4" /></NavButton>
            <NavButton onClick={goToEnd} title="End (End)"><SkipForward className="h-4 w-4" /></NavButton>
            <div className="mx-2 h-5 w-px bg-border" />
            <NavButton onClick={flipBoard} title="Flip (F)"><RotateCcw className="h-4 w-4" /></NavButton>
          </div>
          {/* Live engine info */}
          {currentEval && (
            <div className="text-center text-xs text-muted-foreground">
              Engine: depth {currentEval.depth} •{" "}
              {currentEval.mate != null
                ? `M${Math.abs(currentEval.mate)}`
                : `${((currentEval.cp ?? 0) / 100).toFixed(1)}`}
              {currentEval.bestMove && ` • Best: ${currentEval.bestMove}`}
            </div>
          )}
        </div>
      </div>

      {/* Right: Move list + Analysis + AI */}
      <div className="flex flex-1 flex-col gap-4 lg:max-w-sm">
        {/* Game info */}
        {(headers.White || headers.Event) && (
          <div className="rounded-md border border-border bg-card p-3">
            <p className="text-sm font-semibold">
              {headers.White || "?"} vs {headers.Black || "?"} • {headers.Result || "*"}
            </p>
            <p className="text-xs text-muted-foreground">
              {headers.Event && `${headers.Event} • `}
              {headers.Date || ""}
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
        <div className="flex flex-col gap-2">
          {!isAnalyzed && sans.length > 0 && (
            <button
              onClick={handleFullAnalysis}
              disabled={isAnalyzing || !isReady}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing... {analysisProgress}%
                </>
              ) : !isReady ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading Stockfish...
                </>
              ) : (
                <>
                  <Cpu className="h-4 w-4" />
                  Analyze with Stockfish
                </>
              )}
            </button>
          )}

          {isAnalyzed && (
            <button
              onClick={handleAICoach}
              disabled={aiLoading}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {aiLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  AI Reviewing...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4" />
                  Get AI Coaching
                </>
              )}
            </button>
          )}
        </div>

        {/* Analysis progress */}
        {isAnalyzing && (
          <div className="rounded-md border border-border bg-card p-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Analyzing game...</span>
              <span className="font-medium">{analysisProgress}%</span>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${analysisProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Accuracy stats */}
        {isAnalyzed && moveEvals.length > 0 && (
          <AccuracyStats moveEvals={moveEvals} />
        )}

        {/* AI Review */}
        {aiReview && (
          <div className="rounded-md border border-border bg-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-sm">AI Coach</h3>
            </div>
            {aiReview.overallRating && (
              <div className="rounded-md bg-primary/10 p-2 text-sm font-medium text-primary">
                {aiReview.overallRating}
              </div>
            )}
            {aiReview.summary && (
              <p className="text-sm text-muted-foreground">{aiReview.summary}</p>
            )}
            {aiReview.openingAssessment && (
              <div>
                <p className="text-xs font-semibold mb-1">Opening</p>
                <p className="text-xs text-muted-foreground">{aiReview.openingAssessment}</p>
              </div>
            )}
            {aiReview.middlegameThemes && (
              <div>
                <p className="text-xs font-semibold mb-1">Middlegame</p>
                <p className="text-xs text-muted-foreground">{aiReview.middlegameThemes}</p>
              </div>
            )}
            {aiReview.keyMistakes?.length > 0 && (
              <div>
                <p className="text-xs font-semibold mb-1">Key Mistakes</p>
                {aiReview.keyMistakes.map((m: any, i: number) => (
                  <div key={i} className="text-xs text-muted-foreground mb-1">
                    <span className="text-eval-mistake font-mono">{m.moveNumber}. {m.move}</span>
                    {" — "}{m.explanation}
                  </div>
                ))}
              </div>
            )}
            {aiReview.whatToStudy?.length > 0 && (
              <div>
                <p className="text-xs font-semibold mb-1">Study Topics</p>
                <ul className="list-disc list-inside text-xs text-muted-foreground">
                  {aiReview.whatToStudy.map((t: string, i: number) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PlayerBar({ name, elo, isTop }: { name?: string; elo?: string; isTop: boolean }) {
  if (!name) return null;
  return (
    <div className="flex items-center gap-2 px-1">
      <div className={`h-3 w-3 rounded-sm ${isTop ? "bg-gray-800" : "bg-white border border-gray-300"}`} />
      <span className="text-sm font-medium">{name}</span>
      {elo && <span className="text-xs text-muted-foreground">({elo})</span>}
    </div>
  );
}

function NavButton({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} title={title} className="rounded-md border border-border p-2 hover:bg-accent transition-colors">
      {children}
    </button>
  );
}

function AccuracyStats({ moveEvals }: { moveEvals: MoveEval[] }) {
  const whiteEvals = moveEvals.filter((e) => e.color === "white");
  const blackEvals = moveEvals.filter((e) => e.color === "black");
  const avgCpLoss = (evals: MoveEval[]) => evals.length === 0 ? 0 : evals.reduce((s, e) => s + e.cpLoss, 0) / evals.length;
  const whiteAcc = Math.max(0, 100 - avgCpLoss(whiteEvals) / 2);
  const blackAcc = Math.max(0, 100 - avgCpLoss(blackEvals) / 2);
  const countCls = (evals: MoveEval[], cls: string) => evals.filter((e) => e.classification === cls).length;

  return (
    <div className="rounded-md border border-border bg-card p-3">
      <h4 className="mb-2 text-sm font-semibold">Accuracy</h4>
      <div className="grid grid-cols-2 gap-4 mb-3">
        <div className="text-center">
          <p className="text-2xl font-bold">{whiteAcc.toFixed(1)}%</p>
          <p className="text-xs text-muted-foreground">White</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold">{blackAcc.toFixed(1)}%</p>
          <p className="text-xs text-muted-foreground">Black</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        {(["blunder", "mistake", "inaccuracy"] as const).map((cls) => (
          <div key={cls} className="flex justify-between col-span-2">
            <span className={`move-${cls} capitalize`}>{cls}s</span>
            <span>{countCls(whiteEvals, cls)} / {countCls(blackEvals, cls)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}