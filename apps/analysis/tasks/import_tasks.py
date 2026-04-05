"""Import Celery tasks for auto-syncing from Lichess/Chess.com."""

from __future__ import annotations

import asyncio
import logging

from tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="tasks.import_tasks.auto_import_all_users")
def auto_import_all_users() -> dict:
    """Periodic task: auto-import games for all users with linked accounts."""
    return asyncio.run(_auto_import_all())


async def _auto_import_all() -> dict:
    from db import async_session
    from sqlalchemy import text
    from services.lichess_client import fetch_user_games as fetch_lichess
    from services.chesscom_client import fetch_user_games as fetch_chesscom
    from routers.import_games import _import_games

    imported_total = 0
    errors: list[str] = []

    async with async_session() as db:
        # Fetch all users with linked accounts
        result = await db.execute(
            text("SELECT id, lichess_id, chesscom_user FROM users WHERE lichess_id IS NOT NULL OR chesscom_user IS NOT NULL")
        )
        users = result.fetchall()

    for user in users:
        user_id, lichess_id, chesscom_user = user

        # Lichess sync
        if lichess_id:
            try:
                games = await fetch_lichess(username=lichess_id, max_games=50)
                result = await _import_games(user_id, games, "lichess")
                imported_total += result.imported
                logger.info(f"Auto-import Lichess for {lichess_id}: {result.imported} new games")
            except Exception as e:
                errors.append(f"Lichess {lichess_id}: {e}")
                logger.error(f"Auto-import Lichess failed for {lichess_id}: {e}")

        # Chess.com sync
        if chesscom_user:
            try:
                games = await fetch_chesscom(username=chesscom_user, max_months=1)
                result = await _import_games(user_id, games, "chesscom")
                imported_total += result.imported
                logger.info(f"Auto-import Chess.com for {chesscom_user}: {result.imported} new games")
            except Exception as e:
                errors.append(f"Chess.com {chesscom_user}: {e}")
                logger.error(f"Auto-import Chess.com failed for {chesscom_user}: {e}")

    return {
        "imported_total": imported_total,
        "users_processed": len(users),
        "errors": errors[:10],
    }
