"use client";

import { useSettingsStore, type BoardTheme, type PieceSet } from "@/stores/settingsStore";
import { Settings, RotateCcw, Monitor, Cpu, Palette } from "lucide-react";

const boardThemes: { value: BoardTheme; label: string; colors: [string, string] }[] = [
  { value: "brown", label: "Brown", colors: ["#f0d9b5", "#b58863"] },
  { value: "blue", label: "Blue", colors: ["#dee3e6", "#8ca2ad"] },
  { value: "green", label: "Green", colors: ["#ffffdd", "#86a666"] },
  { value: "purple", label: "Purple", colors: ["#e8dff5", "#9f7aba"] },
  { value: "gray", label: "Gray", colors: ["#e0e0e0", "#9e9e9e"] },
  { value: "wood", label: "Wood", colors: ["#e8c99b", "#a67a4a"] },
];

const pieceSets: { value: PieceSet; label: string }[] = [
  { value: "cburnett", label: "CBurnett (Default)" },
  { value: "merida", label: "Merida" },
  { value: "alpha", label: "Alpha" },
  { value: "california", label: "California" },
  { value: "cardinal", label: "Cardinal" },
  { value: "staunty", label: "Staunty" },
];

export default function SettingsPage() {
  const settings = useSettingsStore();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Settings className="h-8 w-8" />
          Settings
        </h1>
        <p className="mt-1 text-muted-foreground">
          Customize your ChessLens experience
        </p>
      </div>

      {/* Board Appearance */}
      <Section title="Board Appearance" icon={<Palette className="h-5 w-5" />}>
        {/* Board Theme */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-3">Board Theme</label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {boardThemes.map((theme) => (
              <button
                key={theme.value}
                onClick={() => settings.setBoardTheme(theme.value)}
                className={`flex flex-col items-center gap-1.5 rounded-lg border-2 p-2 transition-colors ${
                  settings.boardTheme === theme.value
                    ? "border-primary"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="grid grid-cols-2 h-10 w-10 rounded overflow-hidden">
                  <div style={{ backgroundColor: theme.colors[0] }} />
                  <div style={{ backgroundColor: theme.colors[1] }} />
                  <div style={{ backgroundColor: theme.colors[1] }} />
                  <div style={{ backgroundColor: theme.colors[0] }} />
                </div>
                <span className="text-xs">{theme.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Piece Set */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-3">Piece Set</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {pieceSets.map((ps) => (
              <button
                key={ps.value}
                onClick={() => settings.setPieceSet(ps.value)}
                className={`rounded-md border px-3 py-2 text-sm text-left transition-colors ${
                  settings.pieceSet === ps.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-accent"
                }`}
              >
                {ps.label}
              </button>
            ))}
          </div>
        </div>

        {/* Board Size */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            Board Size: {settings.boardSize}px
          </label>
          <input
            type="range"
            min={320}
            max={720}
            step={40}
            value={settings.boardSize}
            onChange={(e) => settings.setBoardSize(parseInt(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Small</span>
            <span>Large</span>
          </div>
        </div>

        {/* Animation Speed */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            Animation Speed: {settings.animationSpeed}ms
          </label>
          <input
            type="range"
            min={0}
            max={500}
            step={50}
            value={settings.animationSpeed}
            onChange={(e) => settings.setAnimationSpeed(parseInt(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Instant</span>
            <span>Slow</span>
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-3">
          <Toggle
            label="Show legal move dots"
            checked={settings.showLegalMoves}
            onChange={settings.setShowLegalMoves}
          />
          <Toggle
            label="Highlight last move"
            checked={settings.highlightLastMove}
            onChange={settings.setHighlightLastMove}
          />
          <Toggle
            label="Highlight check"
            checked={settings.highlightCheck}
            onChange={settings.setHighlightCheck}
          />
          <Toggle
            label="Sound effects"
            checked={settings.soundEnabled}
            onChange={settings.setSoundEnabled}
          />
        </div>
      </Section>

      {/* Analysis Settings */}
      <Section title="Analysis" icon={<Cpu className="h-5 w-5" />}>
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            Engine Depth: {settings.engineDepth}
          </label>
          <input
            type="range"
            min={10}
            max={30}
            step={1}
            value={settings.engineDepth}
            onChange={(e) => settings.setEngineDepth(parseInt(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Fast (10)</span>
            <span>Deep (30)</span>
          </div>
        </div>

        <div className="space-y-3">
          <Toggle
            label="Show evaluation bar"
            checked={settings.showEvalBar}
            onChange={settings.setShowEvalBar}
          />
          <Toggle
            label="Show best move arrow"
            checked={settings.showBestMoveArrow}
            onChange={settings.setShowBestMoveArrow}
          />
          <Toggle
            label="Show move classification dots"
            checked={settings.showMoveClassification}
            onChange={settings.setShowMoveClassification}
          />
          <Toggle
            label="Auto-analyze imported games"
            checked={settings.autoAnalyze}
            onChange={settings.setAutoAnalyze}
          />
        </div>
      </Section>

      {/* Display Settings */}
      <Section title="Display" icon={<Monitor className="h-5 w-5" />}>
        <div className="space-y-3">
          <Toggle
            label="Dark mode"
            checked={settings.darkMode}
            onChange={settings.setDarkMode}
          />
        </div>
      </Section>

      {/* Reset */}
      <div className="mt-8 pt-6 border-t border-border">
        <button
          onClick={settings.resetDefaults}
          className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm hover:bg-accent transition-colors"
        >
          <RotateCcw className="h-4 w-4" />
          Reset to Defaults
        </button>
      </div>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-8 rounded-lg border border-border bg-card p-6">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
        {icon}
        {title}
      </h2>
      {children}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-sm">{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? "bg-primary" : "bg-secondary"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </label>
  );
}
