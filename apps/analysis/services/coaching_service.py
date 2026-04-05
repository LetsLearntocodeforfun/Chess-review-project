"""AI coaching service using Azure OpenAI o3-mini for game review."""

from __future__ import annotations

import json
import logging

from openai import AsyncAzureOpenAI

from config import settings
from models.schemas import CoachingReview, MoveEvalResult

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an expert chess coach providing game review and coaching advice.
You analyze chess games that have already been evaluated by Stockfish and provide clear,
actionable feedback to help players improve.

Your reviews should be:
- Encouraging but honest
- Focused on patterns and concepts, not just individual moves
- Adapted to the player's level (based on accuracy and mistake types)
- Include specific recommendations for study topics

Respond ONLY with valid JSON matching this exact structure:
{
  "summary": "2-3 sentence overall game summary",
  "openingAssessment": "Assessment of opening play and preparation",
  "middlegameThemes": "Key middlegame themes, tactics, and strategic decisions",
  "endgameTechnique": "Endgame assessment (if applicable, otherwise brief note)",
  "keyMistakes": [
    {
      "moveNumber": 15,
      "color": "white",
      "move": "Bxf7+",
      "explanation": "Why this move was a mistake",
      "betterMove": "Nd5",
      "concept": "Tactical pattern name or strategic concept"
    }
  ],
  "whatToStudy": ["Topic 1", "Topic 2"],
  "overallRating": "Short encouraging rating like 'Solid game!' or 'Keep working on tactics'"
}"""


def _build_game_prompt(pgn: str, move_evals: list[MoveEvalResult]) -> str:
    """Build the user prompt with game data for the AI."""
    # Summarize key stats
    white_evals = [e for e in move_evals if e.color == "white"]
    black_evals = [e for e in move_evals if e.color == "black"]

    white_blunders = [e for e in white_evals if e.classification == "blunder"]
    white_mistakes = [e for e in white_evals if e.classification == "mistake"]
    black_blunders = [e for e in black_evals if e.classification == "blunder"]
    black_mistakes = [e for e in black_evals if e.classification == "mistake"]

    # Build critical moments list
    critical_moves = [
        e for e in move_evals if e.classification in ("blunder", "mistake", "inaccuracy")
    ]
    critical_text = "\n".join(
        f"  Move {e.moveNumber} ({e.color}): {e.move} — {e.classification} "
        f"(lost {e.cpLoss:.0f}cp, best was {e.bestMove})"
        for e in critical_moves[:15]  # Limit to top 15 critical moments
    )

    return f"""Analyze this chess game:

PGN:
{pgn}

Engine Analysis Summary:
- Total moves: {len(move_evals)}
- White: {len(white_blunders)} blunders, {len(white_mistakes)} mistakes
- Black: {len(black_blunders)} blunders, {len(black_mistakes)} mistakes

Critical Moments:
{critical_text if critical_text else "  No significant mistakes found."}

Please provide a coaching review as specified JSON."""


async def generate_game_review(
    game_id: str, pgn: str, move_evals: list[MoveEvalResult]
) -> CoachingReview:
    """Generate an AI coaching review for a game using Azure OpenAI."""
    client = AsyncAzureOpenAI(
        api_key=settings.azure_openai_api_key,
        azure_endpoint=settings.azure_openai_endpoint,
        api_version=settings.azure_openai_api_version,
    )

    user_prompt = _build_game_prompt(pgn, move_evals)

    try:
        response = await client.chat.completions.create(
            model=settings.azure_openai_deployment,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.7,
            max_tokens=2000,
            response_format={"type": "json_object"},
        )

        content = response.choices[0].message.content
        if not content:
            raise ValueError("Empty response from Azure OpenAI")

        review_data = json.loads(content)

        return CoachingReview(
            gameId=game_id,
            summary=review_data.get("summary", ""),
            openingAssessment=review_data.get("openingAssessment", ""),
            middlegameThemes=review_data.get("middlegameThemes", ""),
            endgameTechnique=review_data.get("endgameTechnique", ""),
            keyMistakes=review_data.get("keyMistakes", []),
            whatToStudy=review_data.get("whatToStudy", []),
            overallRating=review_data.get("overallRating", "Keep playing!"),
        )

    except json.JSONDecodeError:
        logger.error("Failed to parse AI response as JSON")
        raise ValueError("AI response was not valid JSON")
    except Exception as e:
        logger.error(f"Azure OpenAI error: {e}")
        raise


async def generate_weekly_summary(
    games_summary: str, stats: dict
) -> str:
    """Generate an AI weekly summary for progress reports."""
    client = AsyncAzureOpenAI(
        api_key=settings.azure_openai_api_key,
        azure_endpoint=settings.azure_openai_endpoint,
        api_version=settings.azure_openai_api_version,
    )

    prompt = f"""As a chess coach, write a brief (3-5 paragraph) weekly progress summary for a student.

Stats this week:
- Games played: {stats.get('gamesPlayed', 0)}
- Wins: {stats.get('wins', 0)}, Losses: {stats.get('losses', 0)}, Draws: {stats.get('draws', 0)}
- Average accuracy: {stats.get('avgAccuracy', 'N/A')}%
- Rating change: {stats.get('ratingChange', 'N/A')}
- Most common openings: {stats.get('commonOpenings', 'N/A')}
- Recurring mistakes: {stats.get('commonMistakes', 'N/A')}

{games_summary}

Write a motivating but honest coaching summary. Identify patterns, suggest specific
areas to study, and acknowledge progress. Be concise and actionable."""

    response = await client.chat.completions.create(
        model=settings.azure_openai_deployment,
        messages=[
            {
                "role": "system",
                "content": "You are an encouraging chess coach providing weekly progress summaries.",
            },
            {"role": "user", "content": prompt},
        ],
        temperature=0.7,
        max_tokens=1000,
    )

    return response.choices[0].message.content or "No summary available."
