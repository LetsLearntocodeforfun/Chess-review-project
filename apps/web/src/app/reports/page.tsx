"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Target,
  Brain,
  Calendar,
  BarChart3,
} from "lucide-react";

interface WeeklyReport {
  id: string;
  weekStart: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  avgAccuracy: number | null;
  ratingChange: number | null;
  commonOpenings: { name: string; count: number; winRate: number }[] | null;
  commonMistakes: { concept: string; count: number }[] | null;
  improvementAreas: string[] | null;
  aiSummary: string | null;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<WeeklyReport | null>(null);

  useEffect(() => {
    fetch("/api/reports")
      .then((r) => r.json())
      .then((data) => {
        const list = data.reports || [];
        setReports(list);
        if (list.length > 0) setSelectedReport(list[0]);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Weekly Reports</h1>
        <p className="text-muted-foreground">
          Track your progress and get AI-powered coaching insights
        </p>
      </div>

      {reports.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <BarChart3 className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
          <p className="mb-2 font-semibold">No reports yet</p>
          <p className="text-sm text-muted-foreground">
            Reports are generated weekly after you have analyzed games. Import
            and analyze some games to get started.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Report list */}
          <div className="w-full lg:w-64 shrink-0">
            <div className="rounded-lg border border-border bg-card">
              <div className="border-b border-border px-4 py-3">
                <h3 className="text-sm font-semibold">Reports</h3>
              </div>
              <div className="p-1">
                {reports.map((report) => (
                  <button
                    key={report.id}
                    onClick={() => setSelectedReport(report)}
                    className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                      selectedReport?.id === report.id
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-accent"
                    }`}
                  >
                    <Calendar className="h-4 w-4 shrink-0" />
                    <span>
                      Week of{" "}
                      {new Date(report.weekStart).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Report detail */}
          {selectedReport && <ReportDetail report={selectedReport} />}
        </div>
      )}
    </div>
  );
}

function ReportDetail({ report }: { report: WeeklyReport }) {
  const winRate =
    report.gamesPlayed > 0
      ? ((report.wins / report.gamesPlayed) * 100).toFixed(0)
      : "0";

  return (
    <div className="flex-1 space-y-4">
      {/* Header */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-bold">
          Week of{" "}
          {new Date(report.weekStart).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </h2>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Games Played"
          value={report.gamesPlayed.toString()}
          detail={`${report.wins}W ${report.losses}L ${report.draws}D`}
        />
        <StatCard label="Win Rate" value={`${winRate}%`} />
        <StatCard
          label="Accuracy"
          value={
            report.avgAccuracy !== null
              ? `${report.avgAccuracy.toFixed(1)}%`
              : "—"
          }
          icon={<Target className="h-4 w-4" />}
        />
        <StatCard
          label="Rating Change"
          value={
            report.ratingChange !== null
              ? `${report.ratingChange > 0 ? "+" : ""}${report.ratingChange}`
              : "—"
          }
          icon={
            report.ratingChange && report.ratingChange > 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )
          }
        />
      </div>

      {/* AI Summary */}
      {report.aiSummary && (
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="mb-3 flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">AI Coaching Summary</h3>
          </div>
          <p className="text-sm text-muted-foreground whitespace-pre-line">
            {report.aiSummary}
          </p>
        </div>
      )}

      {/* Common Openings */}
      {report.commonOpenings && report.commonOpenings.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-3 font-semibold">Most Played Openings</h3>
          <div className="space-y-2">
            {report.commonOpenings.map((opening, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span>{opening.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">
                    {opening.count} game{opening.count !== 1 ? "s" : ""}
                  </span>
                  <span
                    className={
                      opening.winRate >= 0.5
                        ? "text-green-500"
                        : "text-red-500"
                    }
                  >
                    {(opening.winRate * 100).toFixed(0)}% win rate
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Improvement Areas */}
      {report.improvementAreas && report.improvementAreas.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-3 font-semibold">Areas to Improve</h3>
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            {report.improvementAreas.map((area, i) => (
              <li key={i}>{area}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        {icon}
      </div>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {detail && (
        <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
      )}
    </div>
  );
}
