import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;

  try {
    const body = await req.json();
    const lines = body.lines;

    if (!Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json({ error: "No lines to import" }, { status: 400 });
    }

    let created = 0;

    for (const line of lines) {
      const name = line.name || `Chessable Import ${created + 1}`;
      const color = line.color === "black" ? "black" : "white";
      const moves = line.moves || [];

      await prisma.repertoire.create({
        data: {
          userId,
          name: `${name}${line.eco ? ` [${line.eco}]` : ""}`,
          color,
          moves,
          notes: line.openingName
            ? `Imported from Chessable — ${line.openingName}`
            : "Imported from Chessable",
        },
      });

      created++;
    }

    return NextResponse.json({ created });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Import failed" },
      { status: 500 }
    );
  }
}
