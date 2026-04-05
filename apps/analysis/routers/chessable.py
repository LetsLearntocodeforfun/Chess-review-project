"""Chessable import router."""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel

from services.chessable_import import parse_chessable_pgn, merge_into_repertoire

logger = logging.getLogger(__name__)
router = APIRouter()

MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB


class ChessableMergeRequest(BaseModel):
    repertoireId: str
    userId: str
    pgnText: str


@router.post("/chessable/parse")
async def parse_chessable(file: UploadFile = File(...)):
    """Parse a Chessable PGN export and return structured repertoire data.
    
    Accepts a PGN file exported from Chessable and returns the parsed
    variation tree ready to be imported into a repertoire.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 20MB)")

    try:
        pgn_text = content.decode("utf-8")
    except UnicodeDecodeError:
        try:
            pgn_text = content.decode("latin-1")
        except UnicodeDecodeError:
            raise HTTPException(status_code=400, detail="Unable to decode file")

    try:
        repertoires = parse_chessable_pgn(pgn_text)
    except Exception as e:
        logger.error(f"Chessable parsing failed: {e}")
        raise HTTPException(status_code=422, detail=f"Failed to parse PGN: {e}")

    if not repertoires:
        raise HTTPException(status_code=400, detail="No repertoire lines found in file")

    return {
        "lines": repertoires,
        "count": len(repertoires),
        "source": "chessable",
    }


@router.post("/chessable/merge")
async def merge_chessable(request: ChessableMergeRequest):
    """Merge Chessable lines into an existing repertoire.
    
    Takes raw PGN text and a repertoire ID, parses the Chessable PGN,
    and merges the lines into the existing repertoire tree.
    """
    from db import async_session
    from sqlalchemy import text

    async with async_session() as db:
        # Fetch existing repertoire
        result = await db.execute(
            text("SELECT id, moves, color FROM repertoires WHERE id = :id AND user_id = :uid"),
            {"id": request.repertoireId, "uid": request.userId},
        )
        row = result.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Repertoire not found")

        existing_moves = row[1] if isinstance(row[1], list) else []

        # Parse Chessable PGN
        try:
            new_lines = parse_chessable_pgn(request.pgnText)
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"Failed to parse Chessable PGN: {e}")

        # Merge all lines into existing tree
        for line in new_lines:
            line_moves = line.get("moves", [])
            existing_moves = merge_into_repertoire(existing_moves, line_moves)

        # Save updated repertoire
        import json
        await db.execute(
            text("UPDATE repertoires SET moves = :moves::jsonb, updated_at = NOW() WHERE id = :id"),
            {"id": request.repertoireId, "moves": json.dumps(existing_moves)},
        )
        await db.commit()

    return {
        "merged": len(new_lines),
        "repertoireId": request.repertoireId,
    }
