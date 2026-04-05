"""Weekly report generation service."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from services.coaching_service import generate_weekly_summary

logger = logging.getLogger(__name__)


async def generate_weekly_report(db: AsyncSession, user_id: str, week_start: datetime) -> dict:
    """Generate a weekly report for a user covering games from the specified week."""
    week_end = week_start + timedelta(days=7)

    # Fetch games from the week
    result = await db.execute(
        text("""
            SELECT g.id, g.result, g.eco, g.opening_name, g.white, g.black, g.white_elo, g.black_elo,
                   ga.accuracy_white, ga.accuracy_black, ga.move_evals,
                   ga.white_blunder, ga.white_mistake, ga.white_inaccuracy,
                   ga.black_blunder, ga.black_mistake, ga.black_inaccuracy
            FROM games g
            LEFT JOIN game_analyses ga ON ga.game_id = g.id
            WHERE g.user_id = :user_id
              AND g.played_at >= :week_start
              AND g.played_at < :week_end
            ORDER BY g.played_at
        """),
        {"user_id": user_id, "week_start": week_start, "week_end": week_end},
    )
    rows = result.fetchall()

    if not rows:
        return {
            "gamesPlayed": 0,
            "wins": 0,
            "losses": 0,
            "draws": 0,
            "avgAccuracy": None,
            "ratingChange": None,
            "commonOpenings": [],
            "commonMistakes": [],
            "improvementAreas": [],
            "aiSummary": "No games played this week.",
        }

    # Get the user's identifier to determine their color in each game
    user_result = await db.execute(
        text("SELECT name, lichess_id, chesscom_user FROM users WHERE id = :id"),
        {"id": user_id},
    )
    user_row = user_result.fetchone()
    user_names = {user_row[0], user_row[1], user_row[2]} - {None} if user_row else set()

    # Aggregate stats
    wins = losses = draws = 0
    accuracies = []
    opening_counts: dict[str, dict] = {}
    mistake_concepts: dict[str, int] = {}

    for row in rows:
        game_result = row[1]
        white = row[4]
        black = row[5]

        # Determine if user is white or black
        is_white = any(name and name.lower() == white.lower() for name in user_names)

        if game_result == "1-0":
            if is_white:
                wins += 1
            else:
                losses += 1
        elif game_result == "0-1":
            if is_white:
                losses += 1
            else:
                wins += 1
        elif game_result == "1/2-1/2":
            draws += 1

        # Accuracy
        accuracy = row[8] if is_white else row[9]
        if accuracy is not None:
            accuracies.append(accuracy)

        # Openings
        opening = row[3] or row[2] or "Unknown"
        if opening not in opening_counts:
            opening_counts[opening] = {"count": 0, "wins": 0}
        opening_counts[opening]["count"] += 1
        if (is_white and game_result == "1-0") or (not is_white and game_result == "0-1"):
            opening_counts[opening]["wins"] += 1

    games_played = len(rows)
    avg_accuracy = sum(accuracies) / len(accuracies) if accuracies else None

    common_openings = sorted(
        [
            {"name": name, "count": data["count"], "winRate": data["wins"] / data["count"]}
            for name, data in opening_counts.items()
        ],
        key=lambda x: x["count"],
        reverse=True,
    )[:5]

    # Calculate common mistakes
    common_mistakes = sorted(
        [{"concept": concept, "count": count} for concept, count in mistake_concepts.items()],
        key=lambda x: x["count"],
        reverse=True,
    )[:5]

    # Generate AI summary
    stats = {
        "gamesPlayed": games_played,
        "wins": wins,
        "losses": losses,
        "draws": draws,
        "avgAccuracy": f"{avg_accuracy:.1f}" if avg_accuracy else "N/A",
        "ratingChange": "N/A",
        "commonOpenings": ", ".join(o["name"] for o in common_openings[:3]),
        "commonMistakes": ", ".join(m["concept"] for m in common_mistakes[:3]) or "None identified",
    }

    try:
        ai_summary = await generate_weekly_summary("", stats)
    except Exception as e:
        logger.error(f"Failed to generate AI weekly summary: {e}")
        ai_summary = "AI summary unavailable."

    improvement_areas = []
    if avg_accuracy and avg_accuracy < 70:
        improvement_areas.append("Focus on calculating variations before playing moves")
    if any(o.get("winRate", 0) < 0.3 for o in common_openings):
        improvement_areas.append("Review openings with low win rates")

    return {
        "gamesPlayed": games_played,
        "wins": wins,
        "losses": losses,
        "draws": draws,
        "avgAccuracy": avg_accuracy,
        "ratingChange": None,
        "commonOpenings": common_openings,
        "commonMistakes": common_mistakes,
        "improvementAreas": improvement_areas,
        "aiSummary": ai_summary,
    }
