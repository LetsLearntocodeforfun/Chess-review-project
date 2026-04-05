"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";
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
} from "lucide-react";

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
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setStatus("uploading");
      setMessage(`Uploading ${file.name}...`);

      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch("/api/games/import/pgn", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Upload failed");

        setStatus("success");
        setMessage(`Imported ${data.count} game(s) from ${file.name}`);
        setTimeout(() => router.push("/games"), 1500);
      } catch (error: any) {
        setStatus("error");
        setMessage(error.message || "Upload failed");
      }
    },
    [router]
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
  const [status, setStatus] = useState<"idle" | "syncing" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSync = async () => {
    setStatus("syncing");
    setMessage("Fetching games from Lichess...");

    try {
      const res = await fetch("/api/games/import/lichess", { method: "POST" });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Sync failed");

      setStatus("success");
      setMessage(`Imported ${data.imported} new game(s), ${data.skipped} skipped`);
    } catch (error: any) {
      setStatus("error");
      setMessage(error.message || "Sync failed");
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="mb-4 flex items-center gap-2">
        <Globe className="h-5 w-5 text-primary" />
        <h2 className="font-semibold">Lichess Sync</h2>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Automatically import all your rated games from Lichess. Requires sign in
        with your Lichess account.
      </p>
      <button
        onClick={handleSync}
        disabled={status === "syncing"}
        className="w-full rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50"
      >
        {status === "syncing" ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Syncing...
          </span>
        ) : (
          "Sync from Lichess"
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

  const handleSync = async () => {
    if (!username.trim()) return;

    setStatus("syncing");
    setMessage("Fetching games from Chess.com...");

    try {
      const res = await fetch("/api/games/import/chesscom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim() }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Sync failed");

      setStatus("success");
      setMessage(`Imported ${data.imported} new game(s), ${data.skipped} skipped`);
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
        Import your games from Chess.com using your username (public API, no
        login required).
      </p>
      <input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Your Chess.com username"
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
