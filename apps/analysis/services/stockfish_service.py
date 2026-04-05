"""Stockfish engine analysis service using python-chess UCI protocol."""

from __future__ import annotations

import logging

import chess
import chess.engine
import chess.pgn
from io import StringIO

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


def score_to_cp(score: chess.engine.PovScore, turn: chess.Color) -> tuple[float | None, int | None]:
    """Convert a PovScore to centipawns from white's perspective.
    
    Returns (centipawns, mate_in) tuple. One is always None.
    """
    pov = score.white()
    if pov.is_mate():
        return None, pov.mate()
    return float(pov.score()), None


async def analyze_game(pgn_text: str, depth: int | None = None) -> list[MoveEvalResult]:
    """Analyze a complete game with Stockfish and return per-move evaluations.
    
    Runs Stockfish as a subprocess via python-chess UCI protocol.
    """
    depth = depth or settings.stockfish_depth

    # Parse PGN
    game = chess.pgn.read_game(StringIO(pgn_text))
    if game is None:
        raise ValueError("Invalid PGN: could not parse game")

    board = game.board()
    moves = list(game.mainline_moves())

    if not moves:
        return []

    results: list[MoveEvalResult] = []

    # Open Stockfish engine
    transport, engine = await chess.engine.popen_uci(settings.stockfish_path)

    try:
        await engine.configure({
            "Threads": settings.stockfish_threads,
            "Hash": settings.stockfish_hash_mb,
        })

        # Get initial position eval
        prev_info = await engine.analyse(board, chess.engine.Limit(depth=depth))
        prev_cp, prev_mate = score_to_cp(prev_info["score"], board.turn)

        for i, move in enumerate(moves):
            move_number = (i // 2) + 1
            color = "white" if board.turn == chess.WHITE else "black"
            san = board.san(move)

            # Make the player's move
            board.push(move)
            fen_after = board.fen()

            # Analyze position after move
            info = await engine.analyse(board, chess.engine.Limit(depth=depth))
            curr_cp, curr_mate = score_to_cp(info["score"], board.turn)

            # Get best move for the position BEFORE player's move
            board.pop()
            best_info = await engine.analyse(board, chess.engine.Limit(depth=depth))
            best_move_obj = best_info.get("pv", [None])[0]
            best_move_san = board.san(best_move_obj) if best_move_obj else san

            # PV line (principal variation)
            pv = best_info.get("pv", [])
            best_line = []
            temp_board = board.copy()
            for pv_move in pv[:5]:  # Show up to 5 moves in PV
                try:
                    best_line.append(temp_board.san(pv_move))
                    temp_board.push(pv_move)
                except Exception:
                    break

            # Re-push the player's move
            board.push(move)

            # Calculate centipawn loss
            # We need to compare the eval of the best move vs the player's move
            # from the same side's perspective
            cp_loss = 0.0
            if prev_cp is not None and curr_cp is not None:
                # Both are regular evals
                # Loss = how much worse the position got compared to best
                if color == "white":
                    cp_loss = max(0, prev_cp - (-curr_cp))
                    # prev_cp was white's advantage before, curr_cp is now from black's perspective
                    # actually: both score_to_cp return from white's perspective
                    cp_loss = max(0, prev_cp - (-curr_cp)) if i > 0 else 0
                else:
                    cp_loss = max(0, (-prev_cp) - curr_cp)
            elif prev_mate is not None and curr_mate is None:
                cp_loss = 300  # Lost a mating sequence
            elif prev_cp is not None and curr_mate is not None:
                if (color == "white" and curr_mate < 0) or (color == "black" and curr_mate > 0):
                    cp_loss = 500  # Allowed mate against us

            # Simplified cp_loss: compare best_eval with actual eval
            best_cp, best_mate = score_to_cp(best_info["score"], board.turn)
            actual_cp, actual_mate = score_to_cp(info["score"], board.turn)

            if best_cp is not None and actual_cp is not None:
                if color == "white":
                    cp_loss = max(0, best_cp - (-actual_cp))
                else:
                    cp_loss = max(0, (-best_cp) - actual_cp)
            elif best_mate is not None and actual_cp is not None:
                cp_loss = 300
            elif best_cp is not None and actual_mate is not None:
                if (color == "white" and actual_mate < 0) or (
                    color == "black" and actual_mate > 0
                ):
                    cp_loss = 500

            classification = classify_move(cp_loss)

            results.append(
                MoveEvalResult(
                    moveNumber=move_number,
                    color=color,
                    move=san,
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
