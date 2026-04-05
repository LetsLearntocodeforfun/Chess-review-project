import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const ANALYSIS_SERVICE_URL = process.env.ANALYSIS_SERVICE_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Forward the file to the analysis service for Chessable parsing
    const proxyFormData = new FormData();
    proxyFormData.append("file", file);

    const res = await fetch(`${ANALYSIS_SERVICE_URL}/import/chessable/parse`, {
      method: "POST",
      body: proxyFormData,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: "Parse failed" }));
      return NextResponse.json(
        { error: error.detail || "Failed to parse Chessable PGN" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Failed to connect to analysis service" },
      { status: 503 }
    );
  }
}
