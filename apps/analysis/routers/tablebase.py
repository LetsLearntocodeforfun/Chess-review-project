"""Tablebase and utility endpoints."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.tablebase_service import probe_position, count_pieces

router = APIRouter()


class TablebaseRequest(BaseModel):
    fen: str


@router.post("/tablebase")
async def tablebase_probe(request: TablebaseRequest):
    """Probe the Syzygy endgame tablebase for a position.

    Returns perfect play information for positions with 7 or fewer pieces.
    Uses the Lichess tablebase API (powered by Syzygy tablebases).
    """
    fen = request.fen.strip()
    if not fen:
        raise HTTPException(status_code=400, detail="FEN string required")

    pieces = count_pieces(fen)
    if pieces > 7:
        raise HTTPException(
            status_code=400,
            detail=f"Position has {pieces} pieces. Tablebase supports up to 7 pieces.",
        )

    result = await probe_position(fen)
    if result is None:
        raise HTTPException(status_code=404, detail="Position not found in tablebase")

    return result
