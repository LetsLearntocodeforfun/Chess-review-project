// Shared constants and types for ChessLens

// ---------- Move Classification Thresholds (centipawns) ----------
export const EVAL_THRESHOLDS = {
  BRILLIANT: -50, // Sacrifice that leads to significant advantage
  GREAT: 0, // Best or near-best move
  GOOD: 25, // Slight inaccuracy threshold
  INACCURACY: 50, // ±50cp drop
  MISTAKE: 100, // ±100cp drop
  BLUNDER: 200, // ±200cp drop
} as const;

// ---------- Game Sources ----------
export type GameSource = "lichess" | "chesscom" | "upload";

// ---------- Time Controls ----------
export type TimeClass = "ultraBullet" | "bullet" | "blitz" | "rapid" | "classical" | "correspondence";

// ---------- Game Result ----------
export type GameResult = "1-0" | "0-1" | "1/2-1/2" | "*";

// ---------- Piece Color ----------
export type PieceColor = "white" | "black";

// ---------- Move Classification ----------
export type MoveClassification =
  | "brilliant"
  | "great"
  | "good"
  | "book"
  | "inaccuracy"
  | "mistake"
  | "blunder";

// ---------- Analysis per move ----------
export interface MoveEval {
  moveNumber: number;
  color: PieceColor;
  move: string; // SAN notation
  fen: string;
  evalBefore: number | null; // centipawns, null = mate
  evalAfter: number | null;
  mateBefore: number | null; // mate in N, null = not mate
  mateAfter: number | null;
  bestMove: string; // engine best move (SAN)
  bestLine: string[]; // principal variation
  classification: MoveClassification;
  cpLoss: number; // centipawn loss vs best move
}

// ---------- Game Analysis Summary ----------
export interface AnalysisSummary {
  gameId: string;
  depth: number;
  accuracyWhite: number;
  accuracyBlack: number;
  totalMoves: number;
  whiteStats: MoveStats;
  blackStats: MoveStats;
  moveEvals: MoveEval[];
}

export interface MoveStats {
  brilliant: number;
  great: number;
  good: number;
  book: number;
  inaccuracy: number;
  mistake: number;
  blunder: number;
}

// ---------- AI Coaching Review ----------
export interface AIReview {
  gameId: string;
  summary: string;
  openingAssessment: string;
  middlegameThemes: string;
  endgameTechnique: string;
  keyMistakes: KeyMistake[];
  whatToStudy: string[];
  overallRating: string; // e.g. "Good effort", "Needs work"
}

export interface KeyMistake {
  moveNumber: number;
  color: PieceColor;
  move: string;
  explanation: string;
  betterMove: string;
  concept: string; // e.g. "Tactical awareness", "Pawn structure"
}

// ---------- Opening Repertoire ----------
export interface RepertoireMove {
  move: string; // SAN
  fen: string;
  annotation?: string;
  engineEval?: number;
  children: RepertoireMove[];
}

// ---------- Weekly Report ----------
export interface WeeklyReportData {
  weekStart: string; // ISO date
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  avgAccuracy: number;
  ratingChange: number;
  commonOpenings: { name: string; count: number; winRate: number }[];
  commonMistakes: { concept: string; count: number }[];
  improvementAreas: string[];
  aiSummary: string;
}
