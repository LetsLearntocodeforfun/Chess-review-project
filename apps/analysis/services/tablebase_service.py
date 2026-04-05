"""Endgame tablebase service using Lichess Syzygy API."""

from __future__ import annotations

import logging

import httpx

logger = logging.getLogger(__name__)

LICHESS_TABLEBASE_URL = "https://tablebase.lichess.ovh"


async def probe_position(fen: str) -> dict | None:
    """Probe the Syzygy tablebase for a position via the Lichess API.

    Returns tablebase result with:
    - category: "win", "loss", "draw", "maybe-win", "maybe-loss", "cursed-win", "blessed-loss"
    - dtm: distance to mate (if available)
    - dtz: distance to zeroing (pawn move or capture)
    - moves: list of moves with their tablebase evaluation
    """
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            # Standard positions (up to 7 pieces)
            resp = await client.get(
                f"{LICHESS_TABLEBASE_URL}/standard",
                params={"fen": fen},
            )

            if resp.status_code == 404:
                return None  # Position not in tablebase (too many pieces)

            resp.raise_for_status()
            data = resp.json()

            return {
                "category": data.get("category", "unknown"),
                "dtm": data.get("dtm"),
                "dtz": data.get("dtz"),
                "checkmate": data.get("checkmate", False),
                "stalemate": data.get("stalemate", False),
                "insufficientMaterial": data.get("insufficient_material", False),
                "bestMove": data.get("moves", [{}])[0].get("san") if data.get("moves") else None,
                "moves": [
                    {
                        "san": m.get("san", ""),
                        "uci": m.get("uci", ""),
                        "category": m.get("category", ""),
                        "dtm": m.get("dtm"),
                        "dtz": m.get("dtz"),
                        "zeroing": m.get("zeroing", False),
                        "checkmate": m.get("checkmate", False),
                    }
                    for m in data.get("moves", [])
                ],
            }

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 400:
                return None  # Invalid FEN or too many pieces
            logger.error(f"Tablebase API error: {e}")
            return None
        except Exception as e:
            logger.error(f"Tablebase probe failed: {e}")
            return None


def count_pieces(fen: str) -> int:
    """Count total pieces on the board from a FEN string."""
    board_part = fen.split(" ")[0]
    return sum(1 for c in board_part if c.isalpha())
