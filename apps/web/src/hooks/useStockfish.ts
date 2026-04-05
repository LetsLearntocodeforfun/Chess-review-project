"use client";

import { useCallback, useRef, useState } from "react";

interface EngineEval {
  cp?: number;    // centipawns from white's perspective
  mate?: number;  // mate in N (positive = white mates)
  bestMove: string;
  pv: string[];   // principal variation
  depth: number;
}

interface UseStockfishResult {
  isReady: boolean;
  isAnalyzing: boolean;
  currentEval: EngineEval | null;
  analyzeFen: (fen: string, depth?: number) => void;
  analyzeGame: (
    fens: string[],
    onProgress: (moveIndex: number, total: number, eval_: EngineEval) => void
  ) => Promise<EngineEval[]>;
  stop: () => void;
}

/**
 * Hook that runs Stockfish WASM in a Web Worker.
 * Uses the free stockfish.online CDN for the WASM binary.
 */
export function useStockfish(): UseStockfishResult {
  const workerRef = useRef<Worker | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentEval, setCurrentEval] = useState<EngineEval | null>(null);
  const resolveRef = useRef<((eval_: EngineEval) => void) | null>(null);

  const getWorker = useCallback((): Worker => {
    if (workerRef.current) return workerRef.current;

    // Use the stockfish.js CDN — runs Stockfish 16 WASM in a Web Worker
    const worker = new Worker(
      "https://cdn.jsdelivr.net/npm/stockfish@16.0.0/src/stockfish-nnue-16.js"
    );

    let ready = false;

    worker.onmessage = (e: MessageEvent) => {
      const line = typeof e.data === "string" ? e.data : String(e.data);

      if (line === "readyok" && !ready) {
        ready = true;
        setIsReady(true);
      }

      // Parse UCI info lines
      if (line.startsWith("info") && line.includes("score")) {
        const eval_ = parseInfoLine(line);
        if (eval_) {
          setCurrentEval(eval_);
        }
      }

      // Parse bestmove line
      if (line.startsWith("bestmove")) {
        const parts = line.split(" ");
        const bestMove = parts[1] || "";
        setIsAnalyzing(false);

        if (resolveRef.current && currentEval) {
          resolveRef.current({ ...currentEval, bestMove });
          resolveRef.current = null;
        }
      }
    };

    worker.postMessage("uci");
    worker.postMessage("isready");

    workerRef.current = worker;
    return worker;
  }, [currentEval]);

  const analyzeFen = useCallback(
    (fen: string, depth: number = 18) => {
      const worker = getWorker();
      setIsAnalyzing(true);
      worker.postMessage("stop");
      worker.postMessage(`position fen ${fen}`);
      worker.postMessage(`go depth ${depth}`);
    },
    [getWorker]
  );

  const analyzeGame = useCallback(
    async (
      fens: string[],
      onProgress: (moveIndex: number, total: number, eval_: EngineEval) => void
    ): Promise<EngineEval[]> => {
      const worker = getWorker();
      const results: EngineEval[] = [];
      const depth = 16;

      setIsAnalyzing(true);

      for (let i = 0; i < fens.length; i++) {
        const eval_ = await new Promise<EngineEval>((resolve) => {
          let bestEval: EngineEval = {
            cp: 0,
            bestMove: "",
            pv: [],
            depth: 0,
          };

          const handler = (e: MessageEvent) => {
            const line = typeof e.data === "string" ? e.data : String(e.data);

            if (line.startsWith("info") && line.includes("score")) {
              const parsed = parseInfoLine(line);
              if (parsed && parsed.depth >= bestEval.depth) {
                bestEval = parsed;
              }
            }

            if (line.startsWith("bestmove")) {
              const parts = line.split(" ");
              bestEval.bestMove = parts[1] || "";
              worker.removeEventListener("message", handler);
              resolve(bestEval);
            }
          };

          worker.addEventListener("message", handler);
          worker.postMessage("stop");
          worker.postMessage(`position fen ${fens[i]}`);
          worker.postMessage(`go depth ${depth}`);
        });

        results.push(eval_);
        onProgress(i, fens.length, eval_);
      }

      setIsAnalyzing(false);
      return results;
    },
    [getWorker]
  );

  const stop = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.postMessage("stop");
      setIsAnalyzing(false);
    }
  }, []);

  return { isReady, isAnalyzing, currentEval, analyzeFen, analyzeGame, stop };
}

/** Parse a UCI info line into an EngineEval */
function parseInfoLine(line: string): EngineEval | null {
  try {
    const depthMatch = line.match(/\bdepth (\d+)/);
    const depth = depthMatch ? parseInt(depthMatch[1]) : 0;
    if (depth < 6) return null; // Skip shallow depths

    let cp: number | undefined;
    let mate: number | undefined;

    const cpMatch = line.match(/\bscore cp (-?\d+)/);
    const mateMatch = line.match(/\bscore mate (-?\d+)/);

    if (cpMatch) {
      cp = parseInt(cpMatch[1]);
    } else if (mateMatch) {
      mate = parseInt(mateMatch[1]);
    } else {
      return null;
    }

    const pvMatch = line.match(/\bpv (.+)/);
    const pv = pvMatch ? pvMatch[1].split(" ") : [];

    return {
      cp,
      mate,
      bestMove: pv[0] || "",
      pv,
      depth,
    };
  } catch {
    return null;
  }
}
