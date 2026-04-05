"""Stockfish analysis Celery tasks."""

from __future__ import annotations

import asyncio
import json
import logging

from tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="tasks.analysis_tasks.analyze_game")
def analyze_game_task(game_id: str, pgn: str) -> dict:
    """Celery task wrapper for Stockfish game analysis."""
    return asyncio.run(_analyze_game(game_id, pgn))


async def _analyze_game(game_id: str, pgn: str) -> dict:
    from db import async_session
    from services.stockfish_service import analyze_game, calculate_accuracy, count_classifications
    from sqlalchemy import text

    async with async_session() as db:
        try:
            # Mark as analyzing
            await db.execute(
                text("UPDATE game_analyses SET status = 'analyzing' WHERE game_id = :gid"),
                {"gid": game_id},
            )
            await db.commit()

            # Run analysis
            move_evals = await analyze_game(pgn)

            accuracy_white = calculate_accuracy(move_evals, "white")
            accuracy_black = calculate_accuracy(move_evals, "black")
            white_stats = count_classifications(move_evals, "white")
            black_stats = count_classifications(move_evals, "black")

            evals_json = json.dumps([e.model_dump() for e in move_evals])

            await db.execute(
                text("""
                    UPDATE game_analyses SET
                        status = 'complete',
                        move_evals = :evals::jsonb,
                        accuracy_white = :aw, accuracy_black = :ab,
                        total_moves = :tm, analyzed_at = NOW()
                    WHERE game_id = :gid
                """),
                {
                    "gid": game_id,
                    "evals": evals_json,
                    "aw": accuracy_white,
                    "ab": accuracy_black,
                    "tm": len(move_evals),
                },
            )
            await db.commit()

            return {"status": "complete", "gameId": game_id}

        except Exception as e:
            logger.error(f"Analysis task failed for {game_id}: {e}")
            await db.execute(
                text("UPDATE game_analyses SET status = 'failed' WHERE game_id = :gid"),
                {"gid": game_id},
            )
            await db.commit()
            return {"status": "failed", "gameId": game_id, "error": str(e)}
