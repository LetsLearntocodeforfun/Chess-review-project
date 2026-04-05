"""Lichess API client for game imports."""

from __future__ import annotations

import logging
from io import StringIO

import chess.pgn
import httpx

logger = logging.getLogger(__name__)

LICHESS_API_BASE = "https://lichess.org"


async def fetch_user_games(
    username: str,
    max_games: int = 200,
    since: int | None = None,
    token: str | None = None,
) -> list[dict]:
    """Fetch a user's rated games from Lichess API.

    Returns a list of parsed game dicts with PGN, metadata, etc.
    Uses the ND-JSON streaming endpoint for efficiency.
    """
    url = f"{LICHESS_API_BASE}/api/games/user/{username}"

    headers = {
        "Accept": "application/x-ndjson",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"

    params = {
        "max": str(max_games),
        "rated": "true",
        "pgnInJson": "true",
        "opening": "true",
        "clocks": "false",
        "evals": "false",
    }
    if since is not None:
        params["since"] = str(since)

    games: list[dict] = []

    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            async with client.stream("GET", url, headers=headers, params=params) as response:
                if response.status_code == 429:
                    logger.warning("Lichess API rate limit hit. Wait before retrying.")
                    raise httpx.HTTPStatusError(
                        "Rate limited",
                        request=response.request,
                        response=response,
                    )

                response.raise_for_status()

                async for line in response.aiter_lines():
                    line = line.strip()
                    if not line:
                        continue

                    import json
                    try:
                        game_data = json.loads(line)
                    except json.JSONDecodeError:
                        continue

                    parsed = _parse_lichess_game(game_data)
                    if parsed:
                        games.append(parsed)

        except httpx.HTTPStatusError as e:
            logger.error(f"Lichess API error: {e.response.status_code}")
            raise
        except httpx.ConnectError:
            logger.error("Cannot connect to Lichess API")
            raise

    return games


def _parse_lichess_game(data: dict) -> dict | None:
    """Parse a Lichess game JSON object into our standard format."""
    try:
        pgn = data.get("pgn", "")
        if not pgn:
            # Try to reconstruct PGN from moves
            moves = data.get("moves", "")
            if not moves:
                return None
            pgn = moves  # Simplified — real implementation builds full PGN

        game_id = data.get("id", "")
        players = data.get("players", {})
        white = players.get("user", players.get("white", {}))
        black_player = players.get("black", {})

        # Handle nested player structure
        white_name = ""
        white_elo = None
        black_name = ""
        black_elo = None

        if "white" in players:
            white_info = players["white"]
            white_name = white_info.get("user", {}).get("name", "Anonymous")
            white_elo = white_info.get("rating")
        if "black" in players:
            black_info = players["black"]
            black_name = black_info.get("user", {}).get("name", "Anonymous")
            black_elo = black_info.get("rating")

        # Determine result
        winner = data.get("winner")
        if winner == "white":
            result = "1-0"
        elif winner == "black":
            result = "0-1"
        elif data.get("status") == "draw" or data.get("status") == "stalemate":
            result = "1/2-1/2"
        else:
            result = data.get("status", "*")
            if result not in ("1-0", "0-1", "1/2-1/2"):
                result = "*"

        # Time control
        clock = data.get("clock", {})
        time_control = None
        if clock:
            initial = clock.get("initial", 0) // 1000  # ms to seconds
            increment = clock.get("increment", 0) // 1000
            time_control = f"{initial}+{increment}"

        speed = data.get("speed", "unknown")

        # Opening
        opening = data.get("opening", {})

        return {
            "sourceId": game_id,
            "pgn": pgn,
            "white": white_name,
            "black": black_name,
            "whiteElo": white_elo,
            "blackElo": black_elo,
            "result": result,
            "eco": opening.get("eco"),
            "openingName": opening.get("name"),
            "timeControl": time_control,
            "timeClass": speed,
            "playedAt": data.get("createdAt"),  # epoch ms
        }

    except Exception as e:
        logger.warning(f"Failed to parse Lichess game: {e}")
        return None
