export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowRight, TrendingUp, TrendingDown, Minus, Calendar } from "lucide-react";

function scoreColor(score: number) {
  if (score >= 7.5) return "#14b8a6";
  if (score >= 6) return "#4c8448";
  if (score >= 4.5) return "#d97706";
  return "#ef4444";
}

function scoreLabel(score: number) {
  if (score >= 7.5) return "Sehr gut";
  if (score >= 6) return "Gut";
  if (score >= 4.5) return "OK";
  if (score >= 3) return "Niedrig";
  return "Sehr niedrig";
}

function trend(entries: { score: number }[]) {
  if (entries.length < 2) return "neutral";
  const last = entries[0].score;
  const prev = entries[1].score;
  if (last - prev >= 0.5) return "up";
  if (prev - last >= 0.5) return "down";
  return "neutral";
}

export default async function HistoryPage() {
  const session = await auth();
  const userId = session!.user.id;

  const entries = await prisma.wellbeingEntry.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: { periodKey: true, score: true, mood: true, stress: true, energy: true, createdAt: true },
  });

  const avgScore = entries.length
    ? entries.reduce((s, e) => s + e.score, 0) / entries.length
    : 0;
  const bestEntry = entries.length
    ? entries.reduce((a, b) => (a.score > b.score ? a : b))
    : null;
  const t = trend(entries);

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-400 mb-1">Deine Daten</p>
          <h1
            className="text-3xl font-semibold text-gray-900"
            style={{ fontFamily: "'Fraunces', Georgia, serif" }}
          >
            Mein Verlauf
          </h1>
          <p className="text-gray-400 text-sm mt-1">Letzte {entries.length} Check-ins</p>
        </div>
        <Link
          href="/employee/checkin"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{ background: "linear-gradient(135deg, #14b8a6, #0d9488)" }}
        >
          Neuer Check-in <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {entries.length === 0 ? (
        <div
          className="rounded-3xl p-10 text-center"
          style={{ background: "#f0fdf9", border: "1px solid #d1fae5" }}
        >
          <div className="text-5xl mb-4">🌱</div>
          <p className="font-semibold text-gray-700">Noch keine Check-ins vorhanden.</p>
          <p className="text-gray-400 text-sm mt-1">Starte deinen ersten Check-in!</p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            <div
              className="rounded-2xl p-5"
              style={{ background: "#ffffff", border: "1px solid hsl(200, 15%, 88%)" }}
            >
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Ø Score</p>
              <p
                className="text-4xl font-semibold"
                style={{ color: scoreColor(avgScore), fontFamily: "'Fraunces', Georgia, serif" }}
              >
                {avgScore.toFixed(1)}
              </p>
              <p className="text-xs text-gray-400 mt-1">{scoreLabel(avgScore)}</p>
            </div>

            <div
              className="rounded-2xl p-5"
              style={{ background: "#ffffff", border: "1px solid hsl(200, 15%, 88%)" }}
            >
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Bester Score</p>
              {bestEntry && (
                <>
                  <p
                    className="text-4xl font-semibold"
                    style={{ color: scoreColor(bestEntry.score), fontFamily: "'Fraunces', Georgia, serif" }}
                  >
                    {bestEntry.score.toFixed(1)}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{bestEntry.periodKey}</p>
                </>
              )}
            </div>

            <div
              className="rounded-2xl p-5"
              style={{ background: "#ffffff", border: "1px solid hsl(200, 15%, 88%)" }}
            >
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Trend</p>
              <div className="flex items-center gap-2 mt-1">
                {t === "up" && <TrendingUp className="w-8 h-8" style={{ color: "#14b8a6" }} />}
                {t === "down" && <TrendingDown className="w-8 h-8" style={{ color: "#ef4444" }} />}
                {t === "neutral" && <Minus className="w-8 h-8" style={{ color: "#9ca3af" }} />}
                <span
                  className="text-sm font-medium"
                  style={{ color: t === "up" ? "#14b8a6" : t === "down" ? "#ef4444" : "#9ca3af" }}
                >
                  {t === "up" ? "Steigend" : t === "down" ? "Sinkend" : "Stabil"}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-2">vs. vorherige Periode</p>
            </div>
          </div>

          {/* Mini chart */}
          <div
            className="rounded-2xl p-6"
            style={{ background: "#ffffff", border: "1px solid hsl(200, 15%, 88%)" }}
          >
            <p className="text-sm font-semibold text-gray-700 mb-5">Score-Verlauf</p>
            <div className="flex items-end gap-1.5 h-24">
              {[...entries].reverse().map((e, i) => {
                const color = scoreColor(e.score);
                return (
                  <div key={e.periodKey} className="flex-1 flex flex-col items-center gap-1 group">
                    <div className="w-full relative" style={{ height: 88 }}>
                      <div
                        className="absolute bottom-0 w-full rounded-t-lg"
                        title={`${e.periodKey}: ${e.score.toFixed(1)}`}
                        style={{
                          height: `${(e.score / 10) * 100}%`,
                          background: i === entries.length - 1
                            ? `linear-gradient(to top, ${color}cc, ${color}55)`
                            : `${color}33`,
                          border: i === entries.length - 1 ? `1px solid ${color}66` : "none",
                        }}
                      />
                      <div
                        className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[10px] font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap"
                        style={{ background: "#0a1f1c" }}
                      >
                        {e.score.toFixed(1)}
                      </div>
                    </div>
                    <span className="text-[8px] text-gray-300">{e.periodKey.slice(-3)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Entry table */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{ border: "1px solid hsl(200, 15%, 88%)" }}
          >
            <div
              className="px-6 py-4 flex items-center gap-2"
              style={{ background: "#fafaf9", borderBottom: "1px solid hsl(200, 15%, 88%)" }}
            >
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-semibold text-gray-700">Alle Einträge</span>
            </div>
            <div className="divide-y" style={{ background: "#ffffff" }}>
              {entries.map((e) => {
                const color = scoreColor(e.score);
                return (
                  <div key={e.periodKey} className="flex items-center px-6 py-4 gap-4 group hover:bg-gray-50 transition-colors">
                    {/* Score bar accent */}
                    <div
                      className="w-1 h-10 rounded-full flex-shrink-0"
                      style={{ background: color }}
                    />
                    {/* Period */}
                    <div className="w-28 flex-shrink-0">
                      <p className="text-sm font-semibold text-gray-800">{e.periodKey}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(e.createdAt).toLocaleDateString("de-DE")}
                      </p>
                    </div>
                    {/* Score */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span
                          className="text-2xl font-semibold"
                          style={{ color, fontFamily: "'Fraunces', Georgia, serif" }}
                        >
                          {e.score.toFixed(1)}
                        </span>
                        <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden max-w-[120px]">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${(e.score / 10) * 100}%`, background: color }}
                          />
                        </div>
                        <span className="text-xs text-gray-400">{scoreLabel(e.score)}</span>
                      </div>
                    </div>
                    {/* Metrics */}
                    <div className="flex gap-5 text-sm flex-shrink-0">
                      <div className="text-center">
                        <p className="text-[10px] text-gray-400 font-medium">Stimmung</p>
                        <p className="font-semibold text-gray-700">{e.mood}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-gray-400 font-medium">Stress</p>
                        <p className="font-semibold" style={{ color: "#d97706" }}>{e.stress}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-gray-400 font-medium">Energie</p>
                        <p className="font-semibold" style={{ color: "#4c8448" }}>{e.energy}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
