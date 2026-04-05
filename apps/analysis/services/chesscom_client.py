"""Chess.com public API client for game imports."""

from __future__ import annotations

import asyncio
import logging
from io import StringIO

import chess.pgn
import httpx

logger = logging.getLogger(__name__)

CHESSCOM_API_BASE = "https://api.chess.com/pub"
USER_AGENT = "ChessLens/0.1.0 (open-source chess analysis; github.com/chesslens/chesslens)"


async def fetch_user_games(
    username: str,
    max_months: int = 3,
) -> list[dict]:
    """Fetch a user's games from Chess.com public API.

    Fetches the most recent N months of archives.
    """
    games: list[dict] = []

    async with httpx.AsyncClient(
        timeout=30.0,
        headers={"User-Agent": USER_AGENT},
    ) as client:
        # Step 1: Get list of monthly archives
        archives_url = f"{CHESSCOM_API_BASE}/player/{username}/games/archives"
        try:
            archives_resp = await client.get(archives_url)
            if archives_resp.status_code == 404:
                raise ValueError(f"Chess.com user '{username}' not found")
            archives_resp.raise_for_status()
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429:
                logger.warning("Chess.com API rate limited. Retrying after delay...")
                await asyncio.sleep(2)
                archives_resp = await client.get(archives_url)
                archives_resp.raise_for_status()
            else:
                raise

        archives = archives_resp.json().get("archives", [])
        if not archives:
            return []

        # Take most recent N months
        recent_archives = archives[-max_months:]

        # Step 2: Fetch games from each month
        for archive_url in reversed(recent_archives):  # Most recent first
            try:
                resp = await client.get(archive_url)

                if resp.status_code == 429:
                    # Rate limited — wait and retry once
                    logger.warning("Chess.com rate limit hit, waiting 5s...")
                    await asyncio.sleep(5)
                    resp = await client.get(archive_url)

                resp.raise_for_status()
                month_games = resp.json().get("games", [])

                for game_data in month_games:
                    parsed = _parse_chesscom_game(game_data)
                    if parsed:
                        games.append(parsed)

            except httpx.HTTPStatusError as e:
                logger.error(f"Failed to fetch archive {archive_url}: {e}")
                continue

            # Small delay between archive requests to be polite
            await asyncio.sleep(0.5)

    return games


def _parse_chesscom_game(data: dict) -> dict | None:
    """Parse a Chess.com game JSON object into our standard format."""
    try:
        pgn = data.get("pgn", "")
        if not pgn:
            return None

        # Parse PGN to extract info
        game = chess.pgn.read_game(StringIO(pgn))
        if game is None:
            return None

        headers = dict(game.headers)

        # Extract game URL as source ID
        url = data.get("url", "")
        source_id = url.split("/")[-1] if url else None

        # Player info
        white_info = data.get("white", {})
        black_info = data.get("black", {})

        white_name = white_info.get("username", headers.get("White", "Unknown"))
        black_name = black_info.get("username", headers.get("Black", "Unknown"))
        white_elo = white_info.get("rating")
        black_elo = black_info.get("rating")

        # Result
        white_result = white_info.get("result", "")
        if white_result == "win":
            result = "1-0"
        elif black_info.get("result") == "win":
            result = "0-1"
        elif white_result in ("agreed", "stalemate", "repetition", "insufficient", "50move"):
            result = "1/2-1/2"
        else:
            result = headers.get("Result", "*")

        # Time control
        time_control = data.get("time_control") or headers.get("TimeControl")
        time_class = data.get("time_class", "unknown")

        # Date
        end_time = data.get("end_time")  # Unix timestamp

        # Opening (from ECO URL)
        eco_url = data.get("eco")
        eco = headers.get("ECO")
        opening_name = headers.get("Opening")

        return {
            "sourceId": source_id,
            "pgn": pgn,
            "white": white_name,
            "black": black_name,
            "whiteElo": white_elo,
            "blackElo": black_elo,
            "result": result,
            "eco": eco,
            "openingName": opening_name,
            "timeControl": time_control,
            "timeClass": time_class,
            "playedAt": end_time * 1000 if end_time else None,  # Convert to epoch ms
        }

    except Exception as e:
        logger.warning(f"Failed to parse Chess.com game: {e}")
        return None
