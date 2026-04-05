"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { ChessBoard } from "@/components/board/ChessBoard";
import { Chess } from "chess.js";
import {
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  GraduationCap,
  MessageSquare,
} from "lucide-react";

interface RepertoireNode {
  move: string;
  fen: string;
  annotation?: string;
  engineEval?: number;
  children: RepertoireNode[];
}

interface RepertoireData {
  id: string;
  name: string;
  color: "white" | "black";
  moves: RepertoireNode[];
  notes: string | null;
}

export default function RepertoireEditorPage() {
  const params = useParams();
  const [repertoire, setRepertoire] = useState<RepertoireData | null>(null);
  const [currentPath, setCurrentPath] = useState<number[]>([]); // indices into tree
  const [chess] = useState(new Chess());
  const [currentFen, setCurrentFen] = useState(chess.fen());
  const [annotation, setAnnotation] = useState("");
  const [isTraining, setIsTraining] = useState(false);

  useEffect(() => {
    fetch(`/api/repertoire/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.repertoire) {
          setRepertoire(data.repertoire);
        }
      })
      .catch(() => {});
  }, [params.id]);

  // Navigate to a specific node in the tree
  const getCurrentNode = useCallback((): RepertoireNode | null => {
    if (!repertoire) return null;
    let nodes = repertoire.moves;
    for (let i = 0; i < currentPath.length; i++) {
      if (currentPath[i] >= nodes.length) return null;
      if (i === currentPath.length - 1) return nodes[currentPath[i]];
      nodes = nodes[currentPath[i]].children;
    }
    return null;
  }, [repertoire, currentPath]);

  // Get children of current position
  const getCurrentChildren = useCallback((): RepertoireNode[] => {
    if (!repertoire) return [];
    let nodes = repertoire.moves;
    for (const idx of currentPath) {
      if (idx >= nodes.length) return [];
      nodes = nodes[idx].children;
    }
    return nodes;
  }, [repertoire, currentPath]);

  // Update FEN when path changes
  useEffect(() => {
    chess.reset();
    if (!repertoire) return;

    let nodes = repertoire.moves;
    for (const idx of currentPath) {
      if (idx < nodes.length) {
        chess.move(nodes[idx].move);
        nodes = nodes[idx].children;
      }
    }
    setCurrentFen(chess.fen());

    const node = getCurrentNode();
    setAnnotation(node?.annotation || "");
  }, [currentPath, repertoire, chess, getCurrentNode]);

  const handleMove = (from: string, to: string, promotion?: string) => {
    if (!repertoire) return;

    const result = chess.move({ from, to, promotion: promotion as any });
    if (!result) return;

    const children = getCurrentChildren();
    const existingIdx = children.findIndex((c) => c.move === result.san);

    if (existingIdx >= 0) {
      // Move already in tree — navigate to it
      setCurrentPath([...currentPath, existingIdx]);
    } else {
      // Add new move to tree
      const newNode: RepertoireNode = {
        move: result.san,
        fen: chess.fen(),
        children: [],
      };

      const updated = { ...repertoire };
      let nodes = updated.moves;
      for (const idx of currentPath) {
        nodes = nodes[idx].children;
      }
      nodes.push(newNode);

      setRepertoire(updated);
      setCurrentPath([...currentPath, nodes.length - 1]);
    }
  };

  const handleGoBack = () => {
    if (currentPath.length > 0) {
      setCurrentPath(currentPath.slice(0, -1));
    }
  };

  const handleSelectChild = (index: number) => {
    setCurrentPath([...currentPath, index]);
  };

  const handleSave = async () => {
    if (!repertoire) return;
    try {
      await fetch(`/api/repertoire/${repertoire.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moves: repertoire.moves,
          notes: repertoire.notes,
        }),
      });
    } catch {
      // handle error
    }
  };

  const handleDeleteVariation = () => {
    if (!repertoire || currentPath.length === 0) return;

    const updated = { ...repertoire };
    let nodes = updated.moves;
    for (let i = 0; i < currentPath.length - 1; i++) {
      nodes = nodes[currentPath[i]].children;
    }
    nodes.splice(currentPath[currentPath.length - 1], 1);

    setRepertoire(updated);
    setCurrentPath(currentPath.slice(0, -1));
  };

  if (!repertoire) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <p className="text-muted-foreground">Loading repertoire...</p>
      </div>
    );
  }

  const children = getCurrentChildren();
  const currentNode = getCurrentNode();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{repertoire.name}</h1>
          <p className="text-sm text-muted-foreground">
            Playing as {repertoire.color} • {currentPath.length} moves deep
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsTraining(!isTraining)}
            className={`inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
              isTraining
                ? "border-primary bg-primary/10 text-primary"
                : "border-border hover:bg-accent"
            }`}
          >
            <GraduationCap className="h-4 w-4" />
            {isTraining ? "Stop Training" : "Train"}
          </button>
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Save className="h-4 w-4" />
            Save
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Board */}
        <div className="flex flex-col gap-2">
          <ChessBoard
            fen={currentFen}
            orientation={repertoire.color}
            interactive={!isTraining}
            onMove={handleMove}
            viewOnly={false}
          />

          {/* Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleGoBack}
              disabled={currentPath.length === 0}
              className="rounded-md border border-border p-2 hover:bg-accent transition-colors disabled:opacity-50"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            {currentPath.length > 0 && (
              <button
                onClick={handleDeleteVariation}
                className="rounded-md border border-border p-2 hover:bg-destructive/10 transition-colors"
                title="Delete this variation"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="flex flex-1 flex-col gap-4 lg:max-w-sm">
          {/* Continuations */}
          <div className="rounded-lg border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
              <h3 className="text-sm font-semibold">
                Continuations ({children.length})
              </h3>
            </div>
            <div className="p-2">
              {children.length === 0 ? (
                <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                  Make a move on the board to add a continuation
                </p>
              ) : (
                <div className="space-y-1">
                  {children.map((child, i) => (
                    <button
                      key={i}
                      onClick={() => handleSelectChild(i)}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
                    >
                      <span className="font-mono font-semibold">
                        {child.move}
                      </span>
                      {child.annotation && (
                        <span className="text-xs text-muted-foreground truncate">
                          — {child.annotation}
                        </span>
                      )}
                      <span className="ml-auto text-xs text-muted-foreground">
                        {child.children.length} line
                        {child.children.length !== 1 ? "s" : ""}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Move path */}
          {currentPath.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="mb-2 text-sm font-semibold">Current Line</h3>
              <div className="flex flex-wrap gap-1">
                {(() => {
                  const moves: string[] = [];
                  let nodes = repertoire.moves;
                  for (const idx of currentPath) {
                    if (idx < nodes.length) {
                      moves.push(nodes[idx].move);
                      nodes = nodes[idx].children;
                    }
                  }
                  return moves.map((m, i) => (
                    <span key={i} className="font-mono text-sm">
                      {i % 2 === 0 && (
                        <span className="text-muted-foreground">
                          {Math.floor(i / 2) + 1}.{" "}
                        </span>
                      )}
                      {m}
                    </span>
                  ));
                })()}
              </div>
            </div>
          )}

          {/* Annotation */}
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="mb-2 flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Annotation</h3>
            </div>
            <textarea
              value={annotation}
              onChange={(e) => {
                setAnnotation(e.target.value);
                if (currentNode) {
                  currentNode.annotation = e.target.value;
                }
              }}
              placeholder="Add notes about this position..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              rows={3}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
