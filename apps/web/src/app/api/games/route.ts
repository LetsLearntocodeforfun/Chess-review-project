import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 100);
  const source = url.searchParams.get("source");
  const offset = (page - 1) * limit;

  const where: any = { userId };
  if (source) where.source = source;

  const [games, total] = await Promise.all([
    prisma.game.findMany({
      where,
      include: {
        analysis: {
          select: { status: true, accuracyWhite: true, accuracyBlack: true },
        },
      },
      orderBy: { playedAt: "desc" },
      skip: offset,
      take: limit,
    }),
    prisma.game.count({ where }),
  ]);

  return NextResponse.json({
    games,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}
