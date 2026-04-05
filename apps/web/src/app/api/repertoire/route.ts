import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/repertoire — list user's repertoires
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const repertoires = await prisma.repertoire.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, color: true, updatedAt: true },
  });

  return NextResponse.json({ repertoires });
}

// POST /api/repertoire — create a new repertoire
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const body = await req.json();

  const name = body.name;
  const color = body.color;

  if (!name || typeof name !== "string" || name.length > 200) {
    return NextResponse.json({ error: "Valid name required" }, { status: 400 });
  }

  if (color !== "white" && color !== "black") {
    return NextResponse.json({ error: "Color must be 'white' or 'black'" }, { status: 400 });
  }

  const repertoire = await prisma.repertoire.create({
    data: {
      userId,
      name: name.trim(),
      color,
      moves: [],
    },
  });

  return NextResponse.json({ repertoire });
}
