"""AI coaching review router."""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException

from models.schemas import CoachingRequest, MoveEvalResult
from services.coaching_service import generate_game_review

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/review")
async def coaching_review(request: CoachingRequest):
    """Generate an AI coaching review for a game.
    
    Requires Stockfish analysis to have been completed first.
    """
    if not request.moveEvals:
        raise HTTPException(
            status_code=400,
            detail="Move evaluations required. Run Stockfish analysis first.",
        )

    try:
        review = await generate_game_review(
            game_id=request.gameId,
            pgn=request.pgn,
            move_evals=request.moveEvals,
        )
        return {"review": review.model_dump()}
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Coaching review failed: {e}")
        raise HTTPException(
            status_code=503,
            detail="AI coaching service temporarily unavailable",
        )
