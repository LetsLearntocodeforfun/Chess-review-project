"use client";

interface EvalBarProps {
  eval_cp: number | null; // centipawns from white's perspective
  mate: number | null; // mate in N (positive = white mates)
  height?: number;
}

export function EvalBar({ eval_cp, mate, height = 560 }: EvalBarProps) {
  let whitePercent: number;
  let displayText: string;

  if (mate !== null) {
    // Mate score
    whitePercent = mate > 0 ? 100 : 0;
    displayText = `M${Math.abs(mate)}`;
  } else if (eval_cp !== null) {
    // Convert centipawns to percentage (sigmoid-like curve)
    // ±400cp maps roughly to 10%-90%
    const clampedEval = Math.max(-1000, Math.min(1000, eval_cp));
    whitePercent = 50 + 50 * (2 / (1 + Math.exp(-0.005 * clampedEval)) - 1);
    const evalPawns = Math.abs(eval_cp / 100);
    displayText = evalPawns >= 10
      ? evalPawns.toFixed(0)
      : evalPawns.toFixed(1);
  } else {
    whitePercent = 50;
    displayText = "0.0";
  }

  const isWhiteAdvantage = mate !== null ? mate > 0 : (eval_cp ?? 0) >= 0;

  return (
    <div className="eval-bar flex flex-col items-center" style={{ height: `${height}px` }}>
      <div className="eval-bar-bg relative w-full h-full">
        <div
          className="eval-bar-fill"
          style={{ height: `${whitePercent}%` }}
        />
        {/* Eval text */}
        <div
          className={`absolute left-0 right-0 text-center text-[10px] font-bold ${
            isWhiteAdvantage ? "bottom-1 text-black" : "top-1 text-white"
          }`}
        >
          {displayText}
        </div>
      </div>
    </div>
  );
}
