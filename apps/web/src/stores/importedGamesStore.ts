import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ImportedGame {
  id: string;
  pgn: string;
  source: string;
  white: string;
  black: string;
  whiteElo?: number | null;
  blackElo?: number | null;
  result: string;
  eco?: string | null;
  openingName?: string | null;
  timeClass?: string | null;
  playedAt?: string | null;
}

interface ImportedGamesState {
  games: ImportedGame[];
  addGames: (games: ImportedGame[]) => void;
  clearGames: () => void;
  removeGame: (id: string) => void;
}

export const useImportedGames = create<ImportedGamesState>()(
  persist(
    (set, get) => ({
      games: [],
      addGames: (newGames) => {
        const existing = new Set(get().games.map((g) => g.id));
        const unique = newGames.filter((g) => !existing.has(g.id));
        set({ games: [...unique, ...get().games] });
      },
      clearGames: () => set({ games: [] }),
      removeGame: (id) =>
        set({ games: get().games.filter((g) => g.id !== id) }),
    }),
    {
      name: "chesslens-imported-games",
    }
  )
);
