import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { randomBytes } from "crypto";

// POST: Create a shareable link for a game analysis
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const { gameId } = await req.json();

  if (!gameId) {
    return NextResponse.json({ error: "gameId required" }, { status: 400 });
  }

  // Verify ownership
  const game = await prisma.game.findFirst({
    where: { id: gameId, userId },
  });

  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  // Generate a unique share token
  const shareToken = randomBytes(16).toString("hex");

  // Store share token (using the game's sourceId field for simplicity)
  // In a production app, you'd have a dedicated ShareLink table
  await prisma.game.update({
    where: { id: gameId },
    data: { sourceId: `share:${shareToken}` },
  });

  const shareUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/share/${shareToken}`;

  return NextResponse.json({ shareUrl, token: shareToken });
}
