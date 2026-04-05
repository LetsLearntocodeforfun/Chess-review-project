"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";
import { Chess } from "chess.js";
import {
  Upload,
  FileText,
  Globe,
  Link2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  GraduationCap,
  ExternalLink,
  Crown,
} from "lucide-react";

// Shared store for imported games (client-side, no DB needed)
import { useImportedGames, type ImportedGame } from "@/stores/importedGamesStore";

export default function ImportPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-2 text-3xl font-bold">Import Games</h1>
      <p className="mb-8 text-muted-foreground">
        Import games from PGN files, FEN positions, or sync from your Lichess
        and Chess.com accounts.
      </p>

      <div className="grid gap-6 md:grid-cols-2">
        <PgnUpload />
        <FenImport />
        <LichessSync />
        <ChessComSync />
        <ChessableImport />
      </div>
    </div>
  );
}

function PgnUpload() {
  const router = useRouter();
  const addGames = useImportedGames((s) => s.addGames);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setStatus("uploading");
      setMessage(`Parsing ${file.name}...`);

      try {
        const text = await file.text();
        const games = parsePgnText(text);

        if (games.length === 0) throw new Error("No valid games found in file");

        addGames(games);
        setStatus("success");
        setMessage(`Loaded ${games.length} game(s) from ${file.name}`);
        setTimeout(() => router.push("/games"), 1500);
      } catch (error: any) {
        setStatus("error");
        setMessage(error.message || "Parse failed");
      }
    },
    [router, addGames]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/x-chess-pgn": [".pgn"], "text/plain": [".pgn", ".txt"] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="mb-4 flex items-center gap-2">
        <FileText className="h-5 w-5 text-primary" />
        <h2 className="font-semibold">PGN File Upload</h2>
      </div>

      <div
        {...getRootProps()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed p-8 transition-colors ${
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50"
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="mb-3 h-8 w-8 text-muted-foreground" />
        {isDragActive ? (
          <p className="text-sm text-primary">Drop your PGN file here</p>
        ) : (
          <div className="text-center">
            <p className="text-sm">Drag & drop a PGN file, or click to browse</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Supports multi-game PGN files up to 10MB
            </p>
          </div>
        )}
      </div>

      {status !== "idle" && (
        <StatusMessage status={status} message={message} />
      )}
    </div>
  );
}

function FenImport() {
  const [fen, setFen] = useState("");
  const router = useRouter();

  const handleLoad = () => {
    if (!fen.trim()) return;
    // Navigate to viewer with FEN as query param
    router.push(`/games/viewer?fen=${encodeURIComponent(fen.trim())}`);
  };

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="mb-4 flex items-center gap-2">
        <Link2 className="h-5 w-5 text-primary" />
        <h2 className="font-semibold">FEN Position</h2>
      </div>
      <p className="mb-3 text-sm text-muted-foreground">
        Paste a FEN string to load a specific position.
      </p>
      <textarea
        value={fen}
        onChange={(e) => setFen(e.target.value)}
        placeholder="rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"
        className="mb-3 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        rows={2}
      />
      <button
        onClick={handleLoad}
        disabled={!fen.trim()}
        className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Load Position
      </button>
    </div>
  );
}

function LichessSync() {
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState<"idle" | "syncing" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const router = useRouter();
  const addGames = useImportedGames((s) => s.addGames);

  const handleSync = async () => {
    const name = username.trim();
    if (!name) return;

    setStatus("syncing");
    setMessage("Fetching games from Lichess...");

    try {
      // Call Lichess public API directly — no auth needed
      const res = await fetch(
        `https://lichess.org/api/games/user/${encodeURIComponent(name)}?max=50&rated=true&pgnInJson=true&opening=true`,
        { headers: { Accept: "application/x-ndjson" } }
      );

      if (res.status === 404) throw new Error(`Lichess user "${name}" not found`);
      if (!res.ok) throw new Error(`Lichess API error (${res.status})`);

      const text = await res.text();
      const lines = text.trim().split("\n").filter(Boolean);
      const games: any[] = [];

      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          if (data.pgn) {
            const players = data.players || {};
            const white = players.white?.user?.name || "Anonymous";
            const black = players.black?.user?.name || "Anonymous";
            const whiteElo = players.white?.rating;
            const blackElo = players.black?.rating;
            const winner = data.winner;
            const result = winner === "white" ? "1-0" : winner === "black" ? "0-1" : "1/2-1/2";
            const opening = data.opening || {};

            games.push({
              id: data.id || `lichess-${Date.now()}-${Math.random()}`,
              pgn: data.pgn,
              source: "lichess",
              white,
              black,
              whiteElo,
              blackElo,
              result,
              eco: opening.eco || null,
              openingName: opening.name || null,
              timeClass: data.speed || null,
              playedAt: data.createdAt ? new Date(data.createdAt).toISOString() : null,
            });
          }
        } catch { /* skip malformed lines */ }
      }

      if (games.length === 0) throw new Error("No games found for this user");

      addGames(games);
      setStatus("success");
      setMessage(`Loaded ${games.length} game(s) from Lichess for ${name}`);
      setTimeout(() => router.push("/games"), 2000);
    } catch (error: any) {
      setStatus("error");
      setMessage(error.message || "Sync failed");
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="mb-4 flex items-center gap-2">
        <Globe className="h-5 w-5 text-primary" />
        <h2 className="font-semibold">Lichess Import</h2>
      </div>
      <p className="mb-3 text-sm text-muted-foreground">
        Import your rated games directly from Lichess. No login needed — uses the
        public API.
      </p>
      <input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Your Lichess username"
        onKeyDown={(e) => e.key === "Enter" && handleSync()}
        className="mb-3 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <button
        onClick={handleSync}
        disabled={!username.trim() || status === "syncing"}
        className="w-full rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === "syncing" ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Fetching games...
          </span>
        ) : (
          "Import from Lichess"
        )}
      </button>
      {status !== "idle" && (
        <StatusMessage status={status} message={message} />
      )}
    </div>
  );
}

function ChessComSync() {
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState<"idle" | "syncing" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const router = useRouter();
  const addGames = useImportedGames((s) => s.addGames);

  const handleSync = async () => {
    const name = username.trim();
    if (!name) return;

    setStatus("syncing");
    setMessage("Fetching game archives from Chess.com...");

    try {
      // Step 1: Get archives list
      const archivesRes = await fetch(
        `https://api.chess.com/pub/player/${encodeURIComponent(name)}/games/archives`
      );

      if (archivesRes.status === 404) throw new Error(`Chess.com user "${name}" not found`);
      if (!archivesRes.ok) throw new Error(`Chess.com API error (${archivesRes.status})`);

      const { archives } = await archivesRes.json();
      if (!archives || archives.length === 0) throw new Error("No game archives found");

      // Step 2: Fetch the last 2 months of games
      const recentArchives = archives.slice(-2);
      const allGames: any[] = [];

      for (const archiveUrl of recentArchives) {
        setMessage(`Fetching games (${allGames.length} so far)...`);
        try {
          const res = await fetch(archiveUrl);
          if (!res.ok) continue;
          const data = await res.json();

          for (const game of data.games || []) {
            if (!game.pgn) continue;

            const white = game.white?.username || "Unknown";
            const black = game.black?.username || "Unknown";
            const whiteElo = game.white?.rating;
            const blackElo = game.black?.rating;
            const whiteResult = game.white?.result;
            const result =
              whiteResult === "win" ? "1-0" :
              game.black?.result === "win" ? "0-1" :
              whiteResult === "stalemate" || whiteResult === "agreed" || whiteResult === "repetition" || whiteResult === "insufficient" ? "1/2-1/2" :
              "*";

            allGames.push({
              id: game.url?.split("/").pop() || `chesscom-${Date.now()}-${Math.random()}`,
              pgn: game.pgn,
              source: "chesscom",
              white,
              black,
              whiteElo,
              blackElo,
              result,
              eco: null,
              openingName: null,
              timeClass: game.time_class || null,
              playedAt: game.end_time ? new Date(game.end_time * 1000).toISOString() : null,
            });
          }
        } catch { /* skip failed archives */ }
      }

      if (allGames.length === 0) throw new Error("No games found for this user");

      addGames(allGames);
      setStatus("success");
      setMessage(`Loaded ${allGames.length} game(s) from Chess.com for ${name}`);
      setTimeout(() => router.push("/games"), 2000);
    } catch (error: any) {
      setStatus("error");
      setMessage(error.message || "Sync failed");
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="mb-4 flex items-center gap-2">
        <Globe className="h-5 w-5 text-primary" />
        <h2 className="font-semibold">Chess.com Sync</h2>
      </div>
      <p className="mb-3 text-sm text-muted-foreground">
        Import your games from Chess.com using your username. No login needed —
        uses the public API.
      </p>
      <input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Your Chess.com username"
        onKeyDown={(e) => e.key === "Enter" && handleSync()}
        className="mb-3 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <button
        onClick={handleSync}
        disabled={!username.trim() || status === "syncing"}
        className="w-full rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === "syncing" ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Syncing...
          </span>
        ) : (
          "Import from Chess.com"
        )}
      </button>
      {status !== "idle" && (
        <StatusMessage status={status} message={message} />
      )}
    </div>
  );
}

function StatusMessage({
  status,
  message,
}: {
  status: "idle" | "uploading" | "syncing" | "success" | "error";
  message: string;
}) {
  const icon =
    status === "success" ? (
      <CheckCircle2 className="h-4 w-4 text-green-500" />
    ) : status === "error" ? (
      <AlertCircle className="h-4 w-4 text-destructive" />
    ) : (
      <Loader2 className="h-4 w-4 animate-spin text-primary" />
    );

  return (
    <div className="mt-3 flex items-center gap-2 text-sm">
      {icon}
      <span className="text-muted-foreground">{message}</span>
    </div>
  );
}

function ChessableImport() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [parsedLines, setParsedLines] = useState<any[] | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setStatus("uploading");
    setMessage(`Parsing ${file.name}...`);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/games/import/chessable", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Parse failed");

      setParsedLines(data.lines);
      setStatus("success");
      setMessage(
        `Found ${data.count} repertoire line(s). Click "Import All" to create repertoires.`
      );
    } catch (error: any) {
      setStatus("error");
      setMessage(error.message || "Import failed");
    }
  }, []);

  const handleImportAll = async () => {
    if (!parsedLines) return;
    setStatus("uploading");
    setMessage("Creating repertoires...");

    try {
      const res = await fetch("/api/repertoire/import-chessable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines: parsedLines }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Import failed");

      setStatus("success");
      setMessage(`Created ${data.created} repertoire(s) from Chessable export`);
      setTimeout(() => router.push("/repertoire"), 1500);
    } catch (error: any) {
      setStatus("error");
      setMessage(error.message || "Import failed");
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/x-chess-pgn": [".pgn"], "text/plain": [".pgn", ".txt"] },
    maxFiles: 1,
    maxSize: 20 * 1024 * 1024,
  });

  return (
    <div className="rounded-lg border border-border bg-card p-6 md:col-span-2">
      <div className="mb-4 flex items-center gap-2">
        <GraduationCap className="h-5 w-5 text-primary" />
        <h2 className="font-semibold">Chessable Import</h2>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          NEW
        </span>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Import your Chessable courses directly into your opening repertoire.
        Export your course from Chessable as PGN (Course → ⋯ → Export → PGN),
        then upload here. All variations, annotations, and move trees are preserved.
      </p>

      <div
        {...getRootProps()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed p-6 transition-colors ${
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50"
        }`}
      >
        <input {...getInputProps()} />
        <BookOpen className="mb-2 h-8 w-8 text-muted-foreground" />
        <p className="text-sm">
          {isDragActive
            ? "Drop Chessable PGN here"
            : "Drop your Chessable PGN export, or click to browse"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Supports full variation trees up to 20MB
        </p>
      </div>

      {parsedLines && parsedLines.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 text-sm font-medium">
            Preview ({parsedLines.length} lines):
          </div>
          <div className="max-h-48 overflow-y-auto rounded-md border border-border bg-background p-2 space-y-1">
            {parsedLines.slice(0, 20).map((line: any, i: number) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span
                  className={`inline-block h-3 w-3 rounded-sm ${
                    line.color === "white"
                      ? "bg-white border border-gray-300"
                      : "bg-gray-800"
                  }`}
                />
                <span className="font-medium">{line.name}</span>
                {line.eco && (
                  <span className="text-muted-foreground">[{line.eco}]</span>
                )}
              </div>
            ))}
            {parsedLines.length > 20 && (
              <p className="text-xs text-muted-foreground">
                ...and {parsedLines.length - 20} more
              </p>
            )}
          </div>
          <button
            onClick={handleImportAll}
            className="mt-3 w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Import All to Repertoire
          </button>
        </div>
      )}

      {status !== "idle" && !parsedLines && (
        <StatusMessage status={status} message={message} />
      )}
      {status === "success" && parsedLines && (
        <StatusMessage status={status} message={message} />
      )}
      {status === "error" && (
        <StatusMessage status={status} message={message} />
      )}
    </div>
  );
}

/** Parse a multi-game PGN string into individual game objects (client-side). */
function parsePgnText(text: string): ImportedGame[] {
  const games: ImportedGame[] = [];
  // Split on double newline before [Event tags
  const chunks = text.split(/\n\n(?=\[Event )/);

  for (const chunk of chunks) {
    const trimmed = chunk.trim();
    if (trimmed.length < 10) continue;

    try {
      const chess = new Chess();
      chess.loadPgn(trimmed);
      const rawHeaders = chess.header();
      const headers: Record<string, string> = {};
      for (const [k, v] of Object.entries(rawHeaders)) {
        if (v != null) headers[k] = String(v);
      }

      games.push({
        id: `pgn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        pgn: trimmed,
        source: "upload",
        white: headers.White || "Unknown",
        black: headers.Black || "Unknown",
        whiteElo: headers.WhiteElo ? parseInt(headers.WhiteElo) : null,
        blackElo: headers.BlackElo ? parseInt(headers.BlackElo) : null,
        result: headers.Result || "*",
        eco: headers.ECO || null,
        openingName: headers.Opening || null,
        timeClass: null,
        playedAt: headers.Date && headers.Date !== "????.??.??"
          ? new Date(headers.Date.replace(/\./g, "-")).toISOString()
          : null,
      });
    } catch {
      // Skip unparseable chunks
    }
  }

  return games;
}
