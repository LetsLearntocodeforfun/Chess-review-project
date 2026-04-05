import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db";

interface RouteParams {
  params: { id: string };
}

// GET /api/repertoire/:id
export async function GET(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const repertoire = await prisma.repertoire.findFirst({
    where: { id: params.id, userId },
  });

  if (!repertoire) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ repertoire });
}

// PUT /api/repertoire/:id
export async function PUT(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const body = await req.json();

  const existing = await prisma.repertoire.findFirst({
    where: { id: params.id, userId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.repertoire.update({
    where: { id: params.id },
    data: {
      moves: body.moves ?? existing.moves,
      notes: body.notes !== undefined ? body.notes : existing.notes,
      name: body.name ?? existing.name,
    },
  });

  return NextResponse.json({ repertoire: updated });
}

// DELETE /api/repertoire/:id
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;

  const existing = await prisma.repertoire.findFirst({
    where: { id: params.id, userId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.repertoire.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
