"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Filter,
  Clock,
  Crown,
  CheckCircle2,
  Cpu,
  Calendar,
  SlidersHorizontal,
} from "lucide-react";

interface SearchFilters {
  opponent: string;
  result: "" | "win" | "loss" | "draw";
  color: "" | "white" | "black";
  source: "" | "lichess" | "chesscom" | "upload";
  timeClass: "" | "bullet" | "blitz" | "rapid" | "classical";
  opening: string;
  minAccuracy: string;
  maxAccuracy: string;
  dateFrom: string;
  dateTo: string;
  analyzed: "" | "yes" | "no";
  hasBlunders: boolean;
  sortBy: "date" | "accuracy" | "rating";
}

interface SearchResult {
  id: string;
  white: string;
  black: string;
  result: string;
  openingName: string | null;
  timeClass: string | null;
  source: string;
  playedAt: string | null;
  whiteElo: number | null;
  blackElo: number | null;
  analysis: {
    status: string;
    accuracyWhite: number | null;
    accuracyBlack: number | null;
  } | null;
}

export default function SearchPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<SearchFilters>({
    opponent: "",
    result: "",
    color: "",
    source: "",
    timeClass: "",
    opening: "",
    minAccuracy: "",
    maxAccuracy: "",
    dateFrom: "",
    dateTo: "",
    analyzed: "",
    hasBlunders: false,
    sortBy: "date",
  });
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [showFilters, setShowFilters] = useState(true);

  const handleSearch = async () => {
    setIsSearching(true);
    try {
      const params = new URLSearchParams();
      if (filters.opponent) params.set("opponent", filters.opponent);
      if (filters.result) params.set("result", filters.result);
      if (filters.color) params.set("color", filters.color);
      if (filters.source) params.set("source", filters.source);
      if (filters.timeClass) params.set("timeClass", filters.timeClass);
      if (filters.opening) params.set("opening", filters.opening);
      if (filters.minAccuracy) params.set("minAccuracy", filters.minAccuracy);
      if (filters.maxAccuracy) params.set("maxAccuracy", filters.maxAccuracy);
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.set("dateTo", filters.dateTo);
      if (filters.analyzed) params.set("analyzed", filters.analyzed);
      if (filters.hasBlunders) params.set("hasBlunders", "true");
      params.set("sortBy", filters.sortBy);

      const res = await fetch(`/api/games/search?${params}`);
      const data = await res.json();

      setResults(data.games || []);
      setTotalResults(data.total || 0);
    } catch {
      // handle error
    } finally {
      setIsSearching(false);
    }
  };

  const handleReset = () => {
    setFilters({
      opponent: "",
      result: "",
      color: "",
      source: "",
      timeClass: "",
      opening: "",
      minAccuracy: "",
      maxAccuracy: "",
      dateFrom: "",
      dateTo: "",
      analyzed: "",
      hasBlunders: false,
      sortBy: "date",
    });
    setResults([]);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Advanced Search</h1>
          <p className="text-muted-foreground">
            Search and filter your game library
          </p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent transition-colors"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {showFilters ? "Hide Filters" : "Show Filters"}
        </button>
      </div>

      {showFilters && (
        <div className="mb-6 rounded-lg border border-border bg-card p-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Opponent */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Opponent
              </label>
              <input
                type="text"
                value={filters.opponent}
                onChange={(e) => setFilters({ ...filters, opponent: e.target.value })}
                placeholder="Username..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Result */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Result
              </label>
              <select
                value={filters.result}
                onChange={(e) => setFilters({ ...filters, result: e.target.value as any })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Any</option>
                <option value="win">Wins</option>
                <option value="loss">Losses</option>
                <option value="draw">Draws</option>
              </select>
            </div>

            {/* Color */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Played as
              </label>
              <select
                value={filters.color}
                onChange={(e) => setFilters({ ...filters, color: e.target.value as any })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Either</option>
                <option value="white">White</option>
                <option value="black">Black</option>
              </select>
            </div>

            {/* Source */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Source
              </label>
              <select
                value={filters.source}
                onChange={(e) => setFilters({ ...filters, source: e.target.value as any })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">All</option>
                <option value="lichess">Lichess</option>
                <option value="chesscom">Chess.com</option>
                <option value="upload">Uploaded</option>
              </select>
            </div>

            {/* Time Control */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Time Control
              </label>
              <select
                value={filters.timeClass}
                onChange={(e) =>
                  setFilters({ ...filters, timeClass: e.target.value as any })
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">All</option>
                <option value="bullet">Bullet</option>
                <option value="blitz">Blitz</option>
                <option value="rapid">Rapid</option>
                <option value="classical">Classical</option>
              </select>
            </div>

            {/* Opening */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Opening
              </label>
              <input
                type="text"
                value={filters.opening}
                onChange={(e) => setFilters({ ...filters, opening: e.target.value })}
                placeholder="e.g., Sicilian, Queen's Gambit..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Accuracy Range */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Accuracy Range
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  value={filters.minAccuracy}
                  onChange={(e) =>
                    setFilters({ ...filters, minAccuracy: e.target.value })
                  }
                  placeholder="Min %"
                  min={0}
                  max={100}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <span className="text-muted-foreground">–</span>
                <input
                  type="number"
                  value={filters.maxAccuracy}
                  onChange={(e) =>
                    setFilters({ ...filters, maxAccuracy: e.target.value })
                  }
                  placeholder="Max %"
                  min={0}
                  max={100}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Date From
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) =>
                  setFilters({ ...filters, dateFrom: e.target.value })
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Date To
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) =>
                  setFilters({ ...filters, dateTo: e.target.value })
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Checkboxes */}
          <div className="mt-4 flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={filters.hasBlunders}
                onChange={(e) =>
                  setFilters({ ...filters, hasBlunders: e.target.checked })
                }
                className="rounded border-input"
              />
              Games with blunders only
            </label>
          </div>

          {/* Actions */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <Search className="h-4 w-4" />
              {isSearching ? "Searching..." : "Search"}
            </button>
            <button
              onClick={handleReset}
              className="rounded-md border border-border px-4 py-2 text-sm hover:bg-accent transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div>
          <p className="mb-3 text-sm text-muted-foreground">
            {totalResults} game{totalResults !== 1 ? "s" : ""} found
          </p>
          <div className="space-y-2">
            {results.map((game) => (
              <Link
                key={game.id}
                href={`/games/${game.id}`}
                className="flex items-center gap-4 rounded-md border border-border bg-card p-4 hover:border-primary/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {game.white} vs {game.black}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {game.result}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    {game.openingName && <span>{game.openingName}</span>}
                    {game.timeClass && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {game.timeClass}
                      </span>
                    )}
                    <span className="capitalize">{game.source}</span>
                  </div>
                </div>
                {game.analysis?.status === "complete" && (
                  <div className="text-xs text-green-500 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {game.analysis.accuracyWhite?.toFixed(1)}% /{" "}
                    {game.analysis.accuracyBlack?.toFixed(1)}%
                  </div>
                )}
                <div className="text-xs text-muted-foreground whitespace-nowrap">
                  {game.playedAt
                    ? new Date(game.playedAt).toLocaleDateString()
                    : "—"}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {results.length === 0 && !isSearching && totalResults === 0 && (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <Search className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
          <p className="font-semibold">Search your games</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Use the filters above to find specific games in your library.
          </p>
        </div>
      )}
    </div>
  );
}
