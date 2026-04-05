"""Stockfish analysis router."""

from __future__ import annotations

import json
import logging

from fastapi import APIRouter, BackgroundTasks, HTTPException
from sqlalchemy import text

from db import async_session
from models.schemas import AnalyzeRequest, AnalysisResult
from services.stockfish_service import analyze_game, calculate_accuracy, count_classifications

logger = logging.getLogger(__name__)
router = APIRouter()


async def _run_analysis(game_id: str, pgn: str) -> None:
    """Background task that runs Stockfish analysis and saves results."""
    async with async_session() as db:
        try:
            # Mark as analyzing
            await db.execute(
                text(
                    "UPDATE game_analyses SET status = 'analyzing' WHERE game_id = :game_id"
                ),
                {"game_id": game_id},
            )
            await db.commit()

            # Run Stockfish
            move_evals = await analyze_game(pgn)

            # Calculate stats
            accuracy_white = calculate_accuracy(move_evals, "white")
            accuracy_black = calculate_accuracy(move_evals, "black")
            white_stats = count_classifications(move_evals, "white")
            black_stats = count_classifications(move_evals, "black")

            # Save results
            evals_json = json.dumps([e.model_dump() for e in move_evals])

            await db.execute(
                text("""
                    UPDATE game_analyses SET
                        status = 'complete',
                        move_evals = :move_evals::jsonb,
                        accuracy_white = :accuracy_white,
                        accuracy_black = :accuracy_black,
                        total_moves = :total_moves,
                        white_brilliant = :wb, white_great = :wg, white_good = :wgd,
                        white_book = :wbk, white_inaccuracy = :wi, white_mistake = :wm,
                        white_blunder = :wbl,
                        black_brilliant = :bb, black_great = :bg, black_good = :bgd,
                        black_book = :bbk, black_inaccuracy = :bi, black_mistake = :bm,
                        black_blunder = :bbl,
                        analyzed_at = NOW()
                    WHERE game_id = :game_id
                """),
                {
                    "game_id": game_id,
                    "move_evals": evals_json,
                    "accuracy_white": accuracy_white,
                    "accuracy_black": accuracy_black,
                    "total_moves": len(move_evals),
                    "wb": white_stats["brilliant"],
                    "wg": white_stats["great"],
                    "wgd": white_stats["good"],
                    "wbk": white_stats["book"],
                    "wi": white_stats["inaccuracy"],
                    "wm": white_stats["mistake"],
                    "wbl": white_stats["blunder"],
                    "bb": black_stats["brilliant"],
                    "bg": black_stats["great"],
                    "bgd": black_stats["good"],
                    "bbk": black_stats["book"],
                    "bi": black_stats["inaccuracy"],
                    "bm": black_stats["mistake"],
                    "bbl": black_stats["blunder"],
                },
            )
            await db.commit()

            logger.info(f"Analysis complete for game {game_id}")

        except Exception as e:
            logger.error(f"Analysis failed for game {game_id}: {e}")
            await db.execute(
                text("UPDATE game_analyses SET status = 'failed' WHERE game_id = :game_id"),
                {"game_id": game_id},
            )
            await db.commit()


@router.post("/analyze")
async def analyze(request: AnalyzeRequest, background_tasks: BackgroundTasks):
    """Queue a game for Stockfish analysis."""
    background_tasks.add_task(_run_analysis, request.gameId, request.pgn)
    return {"status": "queued", "gameId": request.gameId}


@router.get("/analyze/{game_id}/status")
async def analysis_status(game_id: str):
    """Check analysis status for a game."""
    async with async_session() as db:
        result = await db.execute(
            text("SELECT status, accuracy_white, accuracy_black FROM game_analyses WHERE game_id = :game_id"),
            {"game_id": game_id},
        )
        row = result.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="No analysis found for this game")

        return {
            "gameId": game_id,
            "status": row[0],
            "accuracyWhite": row[1],
            "accuracyBlack": row[2],
        }
