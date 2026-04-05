"""Chessable course import service.

Chessable exports courses as PGN files with deep variation trees.
This service parses Chessable PGN exports and maps them into ChessLens
opening repertoire format.

Supports:
- Direct PGN export from Chessable (File > Export > PGN)
- Multi-variation trees with nested annotations
- Chessable-style comments and move evaluations
- NAG (Numeric Annotation Glyph) parsing
- Automatic ECO classification
"""

from __future__ import annotations

import logging
import re
from io import StringIO

import chess
import chess.pgn

logger = logging.getLogger(__name__)

# Common Chessable NAG meanings
NAG_MAP = {
    1: "!",    # Good move
    2: "?",    # Mistake
    3: "!!",   # Brilliant
    4: "??",   # Blunder
    5: "!?",   # Interesting
    6: "?!",   # Dubious
    10: "=",   # Equal position
    14: "+=",  # Slight advantage white
    15: "=+",  # Slight advantage black
    16: "+/-", # Clear advantage white
    17: "-/+", # Clear advantage black
    18: "+-",  # Winning for white
    19: "-+",  # Winning for black
}


class RepertoireNode:
    """A node in the repertoire move tree."""

    def __init__(
        self,
        move: str = "",
        fen: str = "",
        annotation: str = "",
        engine_eval: float | None = None,
    ):
        self.move = move
        self.fen = fen
        self.annotation = annotation
        self.engine_eval = engine_eval
        self.children: list[RepertoireNode] = []

    def to_dict(self) -> dict:
        return {
            "move": self.move,
            "fen": self.fen,
            "annotation": self.annotation,
            "engineEval": self.engine_eval,
            "children": [c.to_dict() for c in self.children],
        }


def parse_chessable_pgn(pgn_text: str) -> list[dict]:
    """Parse a Chessable PGN export into repertoire data.

    Chessable PGN exports typically contain one game per chapter/line
    with deep variation trees showing the full repertoire.

    Returns a list of repertoire entries:
    [
        {
            "name": "Chapter name or opening name",
            "color": "white" or "black",
            "moves": <RepertoireNode tree as dict>,
            "eco": "B90",
            "source": "chessable"
        }
    ]
    """
    repertoires: list[dict] = []
    pgn_stream = StringIO(pgn_text)

    while True:
        game = chess.pgn.read_game(pgn_stream)
        if game is None:
            break

        headers = dict(game.headers)
        chapter_name = (
            headers.get("Event", "")
            or headers.get("White", "")
            or "Imported Line"
        )

        # Clean up Chessable-specific header artifacts
        chapter_name = _clean_chapter_name(chapter_name)

        # Determine color from headers or first move
        color = _determine_color(game, headers)

        # Build variation tree
        root = RepertoireNode(
            move="",
            fen=game.board().fen(),
        )
        _build_tree(game, game.board(), root)

        # Detect ECO code
        eco = headers.get("ECO", "")
        opening_name = headers.get("Opening", "")

        if not chapter_name or chapter_name in ("?", ""):
            chapter_name = opening_name or f"Line {len(repertoires) + 1}"

        repertoires.append({
            "name": chapter_name,
            "color": color,
            "moves": [c.to_dict() for c in root.children],
            "eco": eco,
            "openingName": opening_name,
            "source": "chessable",
        })

    logger.info(f"Parsed {len(repertoires)} repertoire lines from Chessable PGN")
    return repertoires


def _build_tree(
    node: chess.pgn.GameNode,
    board: chess.Board,
    parent: RepertoireNode,
) -> None:
    """Recursively build a repertoire tree from a PGN game node."""
    for variation in node.variations:
        move = variation.move
        san = board.san(move)

        # Push move to get resulting FEN
        board.push(move)
        fen = board.fen()

        # Extract annotation from comments and NAGs
        annotation = _extract_annotation(variation)

        child = RepertoireNode(
            move=san,
            fen=fen,
            annotation=annotation,
        )
        parent.children.append(child)

        # Recurse into this variation's continuations
        _build_tree(variation, board, child)

        # Pop move to restore board for next variation
        board.pop()


def _extract_annotation(node: chess.pgn.GameNode) -> str:
    """Extract human-readable annotation from PGN node comments and NAGs."""
    parts: list[str] = []

    # NAG symbols
    for nag in node.nags:
        symbol = NAG_MAP.get(nag, f"${nag}")
        parts.append(symbol)

    # Comment text
    comment = node.comment.strip() if node.comment else ""
    if comment:
        # Remove Chessable-specific metadata tags
        comment = re.sub(r'\[%cal\s+[^\]]*\]', '', comment)  # Arrow annotations
        comment = re.sub(r'\[%csl\s+[^\]]*\]', '', comment)  # Square highlights
        comment = re.sub(r'\[%eval\s+[^\]]*\]', '', comment)  # Eval annotations
        comment = re.sub(r'\[%clk\s+[^\]]*\]', '', comment)   # Clock times
        comment = comment.strip()
        if comment:
            parts.append(comment)

    return " ".join(parts)


def _determine_color(game: chess.pgn.Game, headers: dict) -> str:
    """Determine which color the repertoire is for."""
    # Check headers for clues
    white = headers.get("White", "").lower()
    black = headers.get("Black", "").lower()

    # Chessable often uses "PLAYER" or the course name for the player's color
    if "player" in white or "you" in white or "repertoire" in white:
        return "white"
    if "player" in black or "you" in black or "repertoire" in black:
        return "black"

    # Look at the mainline — if first move has alternatives, likely white repertoire
    mainline = list(game.mainline_moves())
    if not mainline:
        return "white"

    # Default heuristic: check variation count at move 1 vs move 2
    first_node = game.variations[0] if game.variations else None
    if first_node and len(game.variations) > 1:
        return "white"  # Multiple first moves → white repertoire

    if first_node:
        second_variations = first_node.variations
        if len(second_variations) > 1:
            return "black"  # Multiple responses to 1.e4 → black repertoire

    return "white"


def _clean_chapter_name(name: str) -> str:
    """Clean up Chessable chapter names."""
    if not name:
        return ""

    # Remove common Chessable prefixes
    name = re.sub(r'^Chapter\s+\d+[:\-\s]*', '', name, flags=re.IGNORECASE)
    name = re.sub(r'^Section\s+\d+[:\-\s]*', '', name, flags=re.IGNORECASE)
    name = re.sub(r'^Line\s+\d+[:\-\s]*', '', name, flags=re.IGNORECASE)

    # Remove leading/trailing whitespace and punctuation
    name = name.strip().strip("-:").strip()

    return name if name else "Imported Line"


def merge_into_repertoire(
    existing_moves: list[dict], new_moves: list[dict]
) -> list[dict]:
    """Merge new Chessable lines into an existing repertoire tree.

    Deduplicates moves and intelligently merges variation trees.
    """
    for new_node in new_moves:
        _merge_node(existing_moves, new_node)
    return existing_moves


def _merge_node(existing_children: list[dict], new_node: dict) -> None:
    """Merge a single node into an existing children list."""
    # Find matching move in existing children
    for existing in existing_children:
        if existing["move"] == new_node["move"]:
            # Move exists — merge annotations if new one has content
            if new_node.get("annotation") and not existing.get("annotation"):
                existing["annotation"] = new_node["annotation"]

            # Recursively merge children
            for new_child in new_node.get("children", []):
                _merge_node(existing.get("children", []), new_child)
            return

    # Move doesn't exist — add it
    existing_children.append(new_node)
