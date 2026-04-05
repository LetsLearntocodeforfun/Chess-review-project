"""Game import router for Lichess and Chess.com."""

from __future__ import annotations

import logging
from datetime import datetime

from fastapi import APIRouter, HTTPException
from sqlalchemy import text

from db import async_session
from models.schemas import ImportChessComRequest, ImportLichessRequest, ImportResult
from services.lichess_client import fetch_user_games as fetch_lichess_games
from services.chesscom_client import fetch_user_games as fetch_chesscom_games

logger = logging.getLogger(__name__)
router = APIRouter()


async def _import_games(user_id: str, games: list[dict], source: str) -> ImportResult:
    """Import parsed games into the database, skipping duplicates."""
    imported = 0
    skipped = 0
    errors: list[str] = []

    async with async_session() as db:
        for game_data in games:
            source_id = game_data.get("sourceId")
            if not source_id:
                continue

            try:
                # Check for existing game (deduplication)
                existing = await db.execute(
                    text(
                        "SELECT id FROM games WHERE user_id = :user_id AND source_id = :source_id AND source = :source"
                    ),
                    {"user_id": user_id, "source_id": source_id, "source": source},
                )
                if existing.fetchone():
                    skipped += 1
                    continue

                # Parse played_at
                played_at = None
                raw_time = game_data.get("playedAt")
                if raw_time:
                    if isinstance(raw_time, (int, float)):
                        played_at = datetime.fromtimestamp(raw_time / 1000)
                    elif isinstance(raw_time, str):
                        played_at = datetime.fromisoformat(raw_time)

                await db.execute(
                    text("""
                        INSERT INTO games (
                            id, user_id, pgn, source, source_id, white, black,
                            result, eco, opening_name, time_control, time_class,
                            white_elo, black_elo, played_at, imported_at
                        ) VALUES (
                            gen_random_uuid(), :user_id, :pgn, :source, :source_id,
                            :white, :black, :result, :eco, :opening_name,
                            :time_control, :time_class, :white_elo, :black_elo,
                            :played_at, NOW()
                        )
                    """),
                    {
                        "user_id": user_id,
                        "pgn": game_data.get("pgn", ""),
                        "source": source,
                        "source_id": source_id,
                        "white": game_data.get("white", "Unknown"),
                        "black": game_data.get("black", "Unknown"),
                        "result": game_data.get("result", "*"),
                        "eco": game_data.get("eco"),
                        "opening_name": game_data.get("openingName"),
                        "time_control": game_data.get("timeControl"),
                        "time_class": game_data.get("timeClass"),
                        "white_elo": game_data.get("whiteElo"),
                        "black_elo": game_data.get("blackElo"),
                        "played_at": played_at,
                    },
                )
                imported += 1

            except Exception as e:
                logger.warning(f"Failed to import game {source_id}: {e}")
                errors.append(str(e))
                continue

        await db.commit()

    return ImportResult(imported=imported, skipped=skipped, errors=errors[:5])


@router.post("/lichess")
async def import_lichess(request: ImportLichessRequest):
    """Import games from Lichess for a user."""
    try:
        games = await fetch_lichess_games(
            username=request.lichessUsername,
            max_games=200,
        )
    except Exception as e:
        logger.error(f"Lichess import failed: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to fetch from Lichess: {e}")

    result = await _import_games(request.userId, games, "lichess")
    return result.model_dump()


@router.post("/chesscom")
async def import_chesscom(request: ImportChessComRequest):
    """Import games from Chess.com for a user."""
    try:
        games = await fetch_chesscom_games(
            username=request.chesscomUsername,
            max_months=3,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Chess.com import failed: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to fetch from Chess.com: {e}")

    result = await _import_games(request.userId, games, "chesscom")
    return result.model_dump()
