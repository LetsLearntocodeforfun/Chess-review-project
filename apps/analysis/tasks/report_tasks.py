"""Weekly report generation Celery tasks."""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta

from tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="tasks.report_tasks.generate_all_weekly_reports")
def generate_all_weekly_reports() -> dict:
    """Periodic task: generate weekly reports for all active users."""
    return asyncio.run(_generate_all_reports())


async def _generate_all_reports() -> dict:
    from db import async_session
    from sqlalchemy import text
    from services.report_service import generate_weekly_report

    # Calculate the previous week
    today = datetime.utcnow()
    week_start = today - timedelta(days=today.weekday() + 7)  # Previous Monday
    week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)

    generated = 0
    errors: list[str] = []

    async with async_session() as db:
        # Find users who played games last week
        result = await db.execute(
            text("""
                SELECT DISTINCT user_id FROM games
                WHERE played_at >= :week_start AND played_at < :week_end
            """),
            {"week_start": week_start, "week_end": week_start + timedelta(days=7)},
        )
        user_ids = [row[0] for row in result.fetchall()]

    for user_id in user_ids:
        try:
            async with async_session() as db:
                report_data = await generate_weekly_report(db, user_id, week_start)

                # Upsert the report
                await db.execute(
                    text("""
                        INSERT INTO weekly_reports (
                            id, user_id, week_start, games_played, wins, losses, draws,
                            avg_accuracy, rating_change, common_openings, common_mistakes,
                            improvement_areas, ai_summary, created_at
                        ) VALUES (
                            gen_random_uuid(), :user_id, :week_start, :games_played,
                            :wins, :losses, :draws, :avg_accuracy, :rating_change,
                            :common_openings::jsonb, :common_mistakes::jsonb,
                            :improvement_areas::jsonb, :ai_summary, NOW()
                        )
                        ON CONFLICT (user_id, week_start) DO UPDATE SET
                            games_played = EXCLUDED.games_played,
                            wins = EXCLUDED.wins,
                            losses = EXCLUDED.losses,
                            draws = EXCLUDED.draws,
                            avg_accuracy = EXCLUDED.avg_accuracy,
                            common_openings = EXCLUDED.common_openings,
                            common_mistakes = EXCLUDED.common_mistakes,
                            improvement_areas = EXCLUDED.improvement_areas,
                            ai_summary = EXCLUDED.ai_summary
                    """),
                    {
                        "user_id": user_id,
                        "week_start": week_start,
                        "games_played": report_data["gamesPlayed"],
                        "wins": report_data["wins"],
                        "losses": report_data["losses"],
                        "draws": report_data["draws"],
                        "avg_accuracy": report_data["avgAccuracy"],
                        "rating_change": report_data["ratingChange"],
                        "common_openings": str(report_data["commonOpenings"]),
                        "common_mistakes": str(report_data["commonMistakes"]),
                        "improvement_areas": str(report_data["improvementAreas"]),
                        "ai_summary": report_data["aiSummary"],
                    },
                )
                await db.commit()
                generated += 1

        except Exception as e:
            errors.append(f"User {user_id}: {e}")
            logger.error(f"Report generation failed for {user_id}: {e}")

    return {"generated": generated, "errors": errors[:10]}
