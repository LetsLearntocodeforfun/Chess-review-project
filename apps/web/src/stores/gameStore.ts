import { create } from "zustand";
import { Chess } from "chess.js";
import type { MoveEval, MoveClassification } from "@chesslens/shared";

interface GameState {
  // Game data
  chess: Chess;
  pgn: string;
  fens: string[]; // FEN at each half-move index (0 = start position)
  sans: string[]; // SAN move at each half-move index (1-indexed with fens)
  headers: Record<string, string>;

  // Navigation
  currentMoveIndex: number; // 0 = initial position, 1 = after first move, etc.

  // Analysis
  moveEvals: MoveEval[];
  isAnalyzed: boolean;

  // Board
  orientation: "white" | "black";

  // Actions
  loadPgn: (pgn: string) => void;
  loadFen: (fen: string) => void;
  goToMove: (index: number) => void;
  goForward: () => void;
  goBack: () => void;
  goToStart: () => void;
  goToEnd: () => void;
  flipBoard: () => void;
  setMoveEvals: (evals: MoveEval[]) => void;
  reset: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  chess: new Chess(),
  pgn: "",
  fens: ["rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"],
  sans: [],
  headers: {},
  currentMoveIndex: 0,
  moveEvals: [],
  isAnalyzed: false,
  orientation: "white",

  loadPgn: (pgn: string) => {
    const chess = new Chess();
    try {
      chess.loadPgn(pgn);
    } catch {
      return; // Invalid PGN
    }

    const rawHeaders = chess.header();
    const headers: Record<string, string> = {};
    for (const [k, v] of Object.entries(rawHeaders)) {
      if (v != null) headers[k] = v;
    }
    const history = chess.history();

    // Rebuild FEN at each position
    const replay = new Chess();
    const fens: string[] = [replay.fen()];
    const sans: string[] = [];

    for (const move of history) {
      replay.move(move);
      fens.push(replay.fen());
      sans.push(move);
    }

    set({
      chess,
      pgn,
      fens,
      sans,
      headers,
      currentMoveIndex: 0,
      moveEvals: [],
      isAnalyzed: false,
    });
  },

  loadFen: (fen: string) => {
    const chess = new Chess(fen);
    set({
      chess,
      pgn: "",
      fens: [fen],
      sans: [],
      headers: {},
      currentMoveIndex: 0,
      moveEvals: [],
      isAnalyzed: false,
    });
  },

  goToMove: (index: number) => {
    const { fens } = get();
    if (index >= 0 && index < fens.length) {
      set({ currentMoveIndex: index });
    }
  },

  goForward: () => {
    const { currentMoveIndex, fens } = get();
    if (currentMoveIndex < fens.length - 1) {
      set({ currentMoveIndex: currentMoveIndex + 1 });
    }
  },

  goBack: () => {
    const { currentMoveIndex } = get();
    if (currentMoveIndex > 0) {
      set({ currentMoveIndex: currentMoveIndex - 1 });
    }
  },

  goToStart: () => set({ currentMoveIndex: 0 }),

  goToEnd: () => {
    const { fens } = get();
    set({ currentMoveIndex: fens.length - 1 });
  },

  flipBoard: () => {
    const { orientation } = get();
    set({ orientation: orientation === "white" ? "black" : "white" });
  },

  setMoveEvals: (evals: MoveEval[]) => {
    set({ moveEvals: evals, isAnalyzed: true });
  },

  reset: () => {
    set({
      chess: new Chess(),
      pgn: "",
      fens: ["rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"],
      sans: [],
      headers: {},
      currentMoveIndex: 0,
      moveEvals: [],
      isAnalyzed: false,
      orientation: "white",
    });
  },
}));
