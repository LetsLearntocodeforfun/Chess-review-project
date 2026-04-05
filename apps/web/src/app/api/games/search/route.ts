import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const url = new URL(req.url);

  // Parse filters
  const opponent = url.searchParams.get("opponent");
  const result = url.searchParams.get("result");
  const color = url.searchParams.get("color");
  const source = url.searchParams.get("source");
  const timeClass = url.searchParams.get("timeClass");
  const opening = url.searchParams.get("opening");
  const minAccuracy = url.searchParams.get("minAccuracy");
  const maxAccuracy = url.searchParams.get("maxAccuracy");
  const dateFrom = url.searchParams.get("dateFrom");
  const dateTo = url.searchParams.get("dateTo");
  const hasBlunders = url.searchParams.get("hasBlunders");
  const sortBy = url.searchParams.get("sortBy") || "date";

  const where: Prisma.GameWhereInput = { userId };

  // Opponent filter
  if (opponent) {
    where.OR = [
      { white: { contains: opponent, mode: "insensitive" } },
      { black: { contains: opponent, mode: "insensitive" } },
    ];
  }

  // Result filter
  if (result === "win") {
    const userName = session.user?.name || "";
    where.AND = [
      ...(Array.isArray((where as any).AND) ? (where as any).AND : []),
      {
        OR: [
          { white: { contains: userName, mode: "insensitive" }, result: "1-0" },
          { black: { contains: userName, mode: "insensitive" }, result: "0-1" },
        ],
      },
    ];
  } else if (result === "loss") {
    const userName = session.user?.name || "";
    where.AND = [
      ...(Array.isArray((where as any).AND) ? (where as any).AND : []),
      {
        OR: [
          { white: { contains: userName, mode: "insensitive" }, result: "0-1" },
          { black: { contains: userName, mode: "insensitive" }, result: "1-0" },
        ],
      },
    ];
  } else if (result === "draw") {
    where.result = "1/2-1/2";
  }

  // Source filter
  if (source) where.source = source;

  // Time class filter
  if (timeClass) where.timeClass = timeClass;

  // Opening filter
  if (opening) {
    where.openingName = { contains: opening, mode: "insensitive" };
  }

  // Date range
  if (dateFrom || dateTo) {
    where.playedAt = {};
    if (dateFrom) where.playedAt.gte = new Date(dateFrom);
    if (dateTo) where.playedAt.lte = new Date(dateTo + "T23:59:59Z");
  }

  // Has blunders filter
  if (hasBlunders === "true") {
    where.analysis = {
      OR: [
        { whiteBlunder: { gt: 0 } },
        { blackBlunder: { gt: 0 } },
      ],
    };
  }

  // Sorting
  let orderBy: Prisma.GameOrderByWithRelationInput = { playedAt: "desc" };
  if (sortBy === "accuracy") {
    orderBy = { analysis: { accuracyWhite: "desc" } };
  }

  const [games, total] = await Promise.all([
    prisma.game.findMany({
      where,
      include: {
        analysis: {
          select: { status: true, accuracyWhite: true, accuracyBlack: true },
        },
      },
      orderBy,
      take: 50,
    }),
    prisma.game.count({ where }),
  ]);

  return NextResponse.json({ games, total });
}
