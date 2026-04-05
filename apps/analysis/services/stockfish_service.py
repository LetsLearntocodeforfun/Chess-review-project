"""Stockfish engine analysis service using python-chess UCI protocol."""

from __future__ import annotations

import logging
from io import StringIO

import chess
import chess.engine
import chess.pgn

from config import settings
from models.schemas import MoveEvalResult

logger = logging.getLogger(__name__)

# Move classification thresholds (centipawns)
THRESHOLDS = {
    "inaccuracy": 50,
    "mistake": 100,
    "blunder": 200,
}


def classify_move(cp_loss: float) -> str:
    """Classify a move based on centipawn loss."""
    if cp_loss < 0:
        return "brilliant"
    if cp_loss <= 10:
        return "great"
    if cp_loss <= THRESHOLDS["inaccuracy"]:
        return "good"
    if cp_loss <= THRESHOLDS["mistake"]:
        return "inaccuracy"
    if cp_loss <= THRESHOLDS["blunder"]:
        return "mistake"
    return "blunder"


def _score_to_white_cp(score: chess.engine.PovScore) -> tuple[float | None, int | None]:
    """Convert a PovScore to centipawns from WHITE's perspective.

    Returns (centipawns, mate_in). Exactly one is None.
    """
    white = score.white()
    if white.is_mate():
        return None, white.mate()
    return float(white.score()), None  # type: ignore[arg-type]


def _eval_from_white(cp: float | None, mate: int | None) -> float:
    """Collapse eval into a single float from white's POV for comparison.

    Mate scores are converted to large values.
    """
    if mate is not None:
        return 100_000.0 if mate > 0 else -100_000.0
    return cp if cp is not None else 0.0


async def analyze_game(pgn_text: str, depth: int | None = None) -> list[MoveEvalResult]:
    """Analyze a game with Stockfish. Returns per-move evaluations.

    Algorithm:
      1. For each position, engine evaluates BEFORE the player moves.
      2. Player makes their move → engine evaluates AFTER.
      3. cp_loss = how much the eval dropped from the mover's perspective.
         cp_loss = eval_before (mover's view) − eval_after (mover's view)
         Only positive values count as losses.
    """
    depth = depth or settings.stockfish_depth

    game = chess.pgn.read_game(StringIO(pgn_text))
    if game is None:
        raise ValueError("Invalid PGN: could not parse game")

    board = game.board()
    moves = list(game.mainline_moves())
    if not moves:
        return []

    results: list[MoveEvalResult] = []
    transport, engine = await chess.engine.popen_uci(settings.stockfish_path)

    try:
        await engine.configure({
            "Threads": settings.stockfish_threads,
            "Hash": settings.stockfish_hash_mb,
        })

        # Evaluate starting position
        info_before = await engine.analyse(board, chess.engine.Limit(depth=depth))
        before_cp, before_mate = _score_to_white_cp(info_before["score"])

        for i, move in enumerate(moves):
            move_number = (i // 2) + 1
            color = "white" if board.turn == chess.WHITE else "black"
            san = board.san(move)

            # Best move in current position (before player moves)
            best_pv = info_before.get("pv", [])
            best_move_obj = best_pv[0] if best_pv else move
            best_move_san = board.san(best_move_obj)

            # Build PV line (up to 5 moves)
            best_line: list[str] = []
            temp = board.copy()
            for pv_move in best_pv[:5]:
                try:
                    best_line.append(temp.san(pv_move))
                    temp.push(pv_move)
                except Exception:
                    break

            # Make player's move
            board.push(move)
            fen_after = board.fen()

            # Evaluate position AFTER player's move
            info_after = await engine.analyse(board, chess.engine.Limit(depth=depth))
            after_cp, after_mate = _score_to_white_cp(info_after["score"])

            # Compute centipawn loss from the mover's perspective.
            # Both evals are from white's POV already.
            # For white: loss = before − after  (higher before = better for white)
            # For black: loss = after − before   (lower before = better for black)
            eval_before = _eval_from_white(before_cp, before_mate)
            eval_after = _eval_from_white(after_cp, after_mate)

            if color == "white":
                cp_loss = max(0.0, eval_before - eval_after)
            else:
                cp_loss = max(0.0, eval_after - eval_before)

            classification = classify_move(cp_loss)

            results.append(
                MoveEvalResult(
                    moveNumber=move_number,
                    color=color,
                    move=san,
                    fen=fen_after,
                    evalBefore=before_cp,
                    evalAfter=after_cp,
                    mateBefore=before_mate,
                    mateAfter=after_mate,
                    bestMove=best_move_san,
                    bestLine=best_line,
                    classification=classification,
                    cpLoss=round(cp_loss, 1),
                )
            )

            # Current "after" becomes next move's "before"
            before_cp = after_cp
            before_mate = after_mate
            info_before = info_after

    finally:
        await engine.quit()
                    fen=fen_after,
                    evalBefore=prev_cp,
                    evalAfter=curr_cp,
                    mateBefore=prev_mate,
                    mateAfter=curr_mate,
                    bestMove=best_move_san,
                    bestLine=best_line,
                    classification=classification,
                    cpLoss=cp_loss,
                )
            )

            # Update previous eval for next iteration
            prev_cp = curr_cp
            prev_mate = curr_mate

    finally:
        await engine.quit()

    return results


def calculate_accuracy(evals: list[MoveEvalResult], color: str) -> float:
    """Calculate accuracy percentage for a color.
    
    Uses a simplified formula: accuracy = max(0, 100 - avg_cp_loss / 2)
    """
    color_evals = [e for e in evals if e.color == color]
    if not color_evals:
        return 100.0

    avg_cp_loss = sum(e.cpLoss for e in color_evals) / len(color_evals)
    return max(0.0, min(100.0, 100.0 - avg_cp_loss / 2.0))


def count_classifications(evals: list[MoveEvalResult], color: str) -> dict[str, int]:
    """Count move classifications for a color."""
    color_evals = [e for e in evals if e.color == color]
    counts = {
        "brilliant": 0,
        "great": 0,
        "good": 0,
        "book": 0,
        "inaccuracy": 0,
        "mistake": 0,
        "blunder": 0,
    }
    for e in color_evals:
        if e.classification in counts:
            counts[e.classification] += 1
    return counts
