import Link from "next/link";
import {
  BarChart3,
  Brain,
  Upload,
  BookOpen,
  TrendingUp,
  Cpu,
  Globe,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: Upload,
    title: "Import Games",
    description:
      "Import from PGN/FEN files, or auto-sync from Lichess and Chess.com accounts.",
  },
  {
    icon: Cpu,
    title: "Stockfish Analysis",
    description:
      "Deep engine analysis with Stockfish 18 — identify blunders, mistakes, and missed tactics.",
  },
  {
    icon: Brain,
    title: "AI Coaching",
    description:
      "Azure AI-powered game review with personalized coaching advice, move-by-move.",
  },
  {
    icon: BookOpen,
    title: "Opening Repertoire",
    description:
      "Build, organize, and train your opening repertoire with interactive move trees.",
  },
  {
    icon: TrendingUp,
    title: "Weekly Reports",
    description:
      "Track your progress with accuracy trends, rating graphs, and AI-generated coaching summaries.",
  },
  {
    icon: Globe,
    title: "Open Source",
    description:
      "Fully open-source, self-hostable, and community-driven. Your data, your control.",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-24 text-center">
          <div className="mx-auto max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground">
              <Zap className="h-4 w-4 text-primary" />
              Open Source Chess Analysis
            </div>
            <h1 className="mb-6 text-5xl font-bold tracking-tight sm:text-6xl">
              Improve your chess with{" "}
              <span className="text-primary">AI-powered</span> game review
            </h1>
            <p className="mb-8 text-lg text-muted-foreground">
              ChessLens combines Stockfish engine analysis with Azure AI coaching
              to help you understand your games, fix recurring mistakes, and
              build a winning repertoire.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/import"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Upload className="h-4 w-4" />
                Import Your Games
              </Link>
              <Link
                href="/games"
                className="inline-flex items-center gap-2 rounded-md border border-border px-6 py-3 text-sm font-medium hover:bg-accent transition-colors"
              >
                <BarChart3 className="h-4 w-4" />
                View Demo
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-20">
          <h2 className="mb-12 text-center text-3xl font-bold">
            Everything you need to improve
          </h2>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="rounded-lg border border-border bg-card p-6 transition-colors hover:border-primary/50"
                >
                  <div className="mb-4 inline-flex rounded-md bg-primary/10 p-3">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-muted-foreground">
          <p>
            ChessLens is open source software.{" "}
            <a
              href="https://github.com/chesslens/chesslens"
              className="text-primary hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              View on GitHub
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
