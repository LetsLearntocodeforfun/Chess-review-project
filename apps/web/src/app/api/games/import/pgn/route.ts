import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db";
import { Chess } from "chess.js";

// Maximum PGN file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB." },
        { status: 400 }
      );
    }

    const content = await file.text();
    const games = splitPgn(content);

    if (games.length === 0) {
      return NextResponse.json(
        { error: "No valid games found in file" },
        { status: 400 }
      );
    }

    let imported = 0;
    const errors: string[] = [];

    for (const pgnText of games) {
      try {
        const chess = new Chess();
        chess.loadPgn(pgnText);

        const headers = chess.header();
        const result = headers.Result || "*";
        const white = headers.White || "Unknown";
        const black = headers.Black || "Unknown";

        // Parse date
        let playedAt: Date | null = null;
        if (headers.Date && headers.Date !== "????.??.??") {
          const dateParts = headers.Date.replace(/\./g, "-");
          const parsed = new Date(dateParts);
          if (!isNaN(parsed.getTime())) {
            playedAt = parsed;
          }
        }

        // Parse ELO ratings
        const whiteElo = headers.WhiteElo
          ? parseInt(headers.WhiteElo)
          : null;
        const blackElo = headers.BlackElo
          ? parseInt(headers.BlackElo)
          : null;

        await prisma.game.create({
          data: {
            userId,
            pgn: pgnText.trim(),
            source: "upload",
            white,
            black,
            result,
            eco: headers.ECO || null,
            openingName: headers.Opening || null,
            timeControl: headers.TimeControl || null,
            whiteElo: whiteElo && !isNaN(whiteElo) ? whiteElo : null,
            blackElo: blackElo && !isNaN(blackElo) ? blackElo : null,
            playedAt,
          },
        });

        imported++;
      } catch (err: any) {
        errors.push(err.message || "Failed to parse game");
      }
    }

    return NextResponse.json({
      count: imported,
      total: games.length,
      errors: errors.length > 0 ? errors.slice(0, 5) : undefined,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Import failed" },
      { status: 500 }
    );
  }
}

/**
 * Split a multi-game PGN string into individual game PGN strings.
 * Games are separated by double newlines after the result.
 */
function splitPgn(content: string): string[] {
  const games: string[] = [];
  const lines = content.split("\n");
  let currentGame = "";

  for (const line of lines) {
    const trimmed = line.trim();

    // New game starts with a header tag after an empty line following moves
    if (
      trimmed.startsWith("[Event ") &&
      currentGame.trim() &&
      !currentGame.trim().endsWith("]")
    ) {
      games.push(currentGame.trim());
      currentGame = "";
    }

    currentGame += line + "\n";
  }

  // Don't forget the last game
  if (currentGame.trim()) {
    games.push(currentGame.trim());
  }

  return games.filter((g) => g.length > 10); // Filter out empty/tiny entries
}
