"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Plus, Trash2, Pencil } from "lucide-react";

interface Repertoire {
  id: string;
  name: string;
  color: "white" | "black";
  updatedAt: string;
}

export default function RepertoirePage() {
  const router = useRouter();
  const [repertoires, setRepertoires] = useState<Repertoire[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<"white" | "black">("white");

  useEffect(() => {
    fetch("/api/repertoire")
      .then((r) => r.json())
      .then((data) => setRepertoires(data.repertoires || []))
      .catch(() => {});
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;

    try {
      const res = await fetch("/api/repertoire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), color: newColor }),
      });
      const data = await res.json();
      if (data.repertoire) {
        setRepertoires((prev) => [data.repertoire, ...prev]);
        setNewName("");
        setIsCreating(false);
      }
    } catch {
      // handle error
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/repertoire/${id}`, { method: "DELETE" });
      setRepertoires((prev) => prev.filter((r) => r.id !== id));
    } catch {
      // handle error
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Opening Repertoire</h1>
          <p className="text-muted-foreground">
            Build and train your opening preparation
          </p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Repertoire
        </button>
      </div>

      {/* Create form */}
      {isCreating && (
        <div className="mb-6 rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 font-semibold">Create New Repertoire</h3>
          <div className="flex flex-col gap-4 sm:flex-row">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g., Sicilian Najdorf"
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => setNewColor("white")}
                className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                  newColor === "white"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-accent"
                }`}
              >
                ♔ White
              </button>
              <button
                onClick={() => setNewColor("black")}
                className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                  newColor === "black"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-accent"
                }`}
              >
                ♚ Black
              </button>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleCreate}
              disabled={!newName.trim()}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              Create
            </button>
            <button
              onClick={() => {
                setIsCreating(false);
                setNewName("");
              }}
              className="rounded-md border border-border px-4 py-2 text-sm hover:bg-accent"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Repertoire list */}
      {repertoires.length === 0 && !isCreating ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <BookOpen className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
          <p className="mb-2 font-semibold">No repertoires yet</p>
          <p className="mb-4 text-sm text-muted-foreground">
            Create your first opening repertoire to start building your preparation.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {repertoires.map((rep) => (
            <div
              key={rep.id}
              className="flex items-center gap-4 rounded-md border border-border bg-card p-4 hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => router.push(`/repertoire/${rep.id}`)}
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-md text-lg ${
                  rep.color === "white"
                    ? "bg-white text-black border border-gray-300"
                    : "bg-gray-800 text-white"
                }`}
              >
                {rep.color === "white" ? "♔" : "♚"}
              </div>
              <div className="flex-1">
                <p className="font-medium">{rep.name}</p>
                <p className="text-xs text-muted-foreground">
                  Playing as {rep.color} • Updated{" "}
                  {new Date(rep.updatedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/repertoire/${rep.id}`);
                  }}
                  className="rounded-md p-2 hover:bg-accent transition-colors"
                  title="Edit"
                >
                  <Pencil className="h-4 w-4 text-muted-foreground" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(rep.id);
                  }}
                  className="rounded-md p-2 hover:bg-destructive/10 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
