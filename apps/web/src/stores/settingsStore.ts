import { create } from "zustand";
import { persist } from "zustand/middleware";

export type BoardTheme = "brown" | "blue" | "green" | "purple" | "gray" | "wood";
export type PieceSet = "cburnett" | "merida" | "alpha" | "california" | "cardinal" | "staunty";
export type CoordDisplay = "inside" | "outside" | "none";

interface SettingsState {
  // Appearance
  boardTheme: BoardTheme;
  pieceSet: PieceSet;
  coords: CoordDisplay;
  animationSpeed: number; // ms
  showLegalMoves: boolean;
  highlightLastMove: boolean;
  highlightCheck: boolean;
  boardSize: number; // px

  // Analysis
  engineDepth: number;
  showEvalBar: boolean;
  showBestMoveArrow: boolean;
  autoAnalyze: boolean;
  showMoveClassification: boolean;

  // Display
  darkMode: boolean;
  soundEnabled: boolean;

  // Actions
  setBoardTheme: (theme: BoardTheme) => void;
  setPieceSet: (set: PieceSet) => void;
  setCoords: (display: CoordDisplay) => void;
  setAnimationSpeed: (ms: number) => void;
  setShowLegalMoves: (show: boolean) => void;
  setHighlightLastMove: (show: boolean) => void;
  setHighlightCheck: (show: boolean) => void;
  setBoardSize: (px: number) => void;
  setEngineDepth: (depth: number) => void;
  setShowEvalBar: (show: boolean) => void;
  setShowBestMoveArrow: (show: boolean) => void;
  setAutoAnalyze: (auto: boolean) => void;
  setShowMoveClassification: (show: boolean) => void;
  setDarkMode: (dark: boolean) => void;
  setSoundEnabled: (sound: boolean) => void;
  resetDefaults: () => void;
}

const defaults = {
  boardTheme: "brown" as BoardTheme,
  pieceSet: "cburnett" as PieceSet,
  coords: "inside" as CoordDisplay,
  animationSpeed: 200,
  showLegalMoves: true,
  highlightLastMove: true,
  highlightCheck: true,
  boardSize: 560,
  engineDepth: 22,
  showEvalBar: true,
  showBestMoveArrow: true,
  autoAnalyze: false,
  showMoveClassification: true,
  darkMode: true,
  soundEnabled: true,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaults,
      setBoardTheme: (theme) => set({ boardTheme: theme }),
      setPieceSet: (pieceSet) => set({ pieceSet }),
      setCoords: (coords) => set({ coords }),
      setAnimationSpeed: (animationSpeed) => set({ animationSpeed }),
      setShowLegalMoves: (showLegalMoves) => set({ showLegalMoves }),
      setHighlightLastMove: (highlightLastMove) => set({ highlightLastMove }),
      setHighlightCheck: (highlightCheck) => set({ highlightCheck }),
      setBoardSize: (boardSize) => set({ boardSize }),
      setEngineDepth: (engineDepth) => set({ engineDepth }),
      setShowEvalBar: (showEvalBar) => set({ showEvalBar }),
      setShowBestMoveArrow: (showBestMoveArrow) => set({ showBestMoveArrow }),
      setAutoAnalyze: (autoAnalyze) => set({ autoAnalyze }),
      setShowMoveClassification: (showMoveClassification) =>
        set({ showMoveClassification }),
      setDarkMode: (darkMode) => set({ darkMode }),
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
      resetDefaults: () => set(defaults),
    }),
    {
      name: "chesslens-settings",
    }
  )
);
