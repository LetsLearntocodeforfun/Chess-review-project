from __future__ import annotations

from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    gameId: str
    pgn: str


class MoveEvalResult(BaseModel):
    moveNumber: int
    color: str  # "white" | "black"
    move: str  # SAN notation
    fen: str
    evalBefore: float | None = None
    evalAfter: float | None = None
    mateBefore: int | None = None
    mateAfter: int | None = None
    bestMove: str = ""
    bestLine: list[str] = Field(default_factory=list)
    classification: str = "good"
    cpLoss: float = 0.0


class AnalysisResult(BaseModel):
    gameId: str
    depth: int
    accuracyWhite: float
    accuracyBlack: float
    totalMoves: int
    moveEvals: list[MoveEvalResult]
    whiteStats: dict[str, int] = Field(default_factory=dict)
    blackStats: dict[str, int] = Field(default_factory=dict)


class CoachingRequest(BaseModel):
    gameId: str
    pgn: str
    moveEvals: list[MoveEvalResult]


class CoachingReview(BaseModel):
    gameId: str
    summary: str
    openingAssessment: str
    middlegameThemes: str
    endgameTechnique: str
    keyMistakes: list[dict]
    whatToStudy: list[str]
    overallRating: str


class ImportLichessRequest(BaseModel):
    userId: str
    lichessUsername: str


class ImportChessComRequest(BaseModel):
    userId: str
    chesscomUsername: str


class ImportResult(BaseModel):
    imported: int
    skipped: int
    errors: list[str] = Field(default_factory=list)


class ReportRequest(BaseModel):
    userId: str
    weekStart: str  # ISO date


class WeeklyReportResult(BaseModel):
    gamesPlayed: int
    wins: int
    losses: int
    draws: int
    avgAccuracy: float | None
    ratingChange: int | None
    commonOpenings: list[dict]
    commonMistakes: list[dict]
    improvementAreas: list[str]
    aiSummary: str
