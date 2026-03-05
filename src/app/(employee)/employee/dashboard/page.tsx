export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowRight, Flame, Zap, Smile, TrendingUp } from "lucide-react";

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

function ScoreGauge({ score }: { score: number }) {
  const size = 160;
  const r = 62;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  // Arc goes from 135° to 405° (270° sweep) — bottom-left to bottom-right
  const pct = score / 10;
  const filled = pct * circumference * 0.75;
  const color = scoreColor(score);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Track */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
          strokeDashoffset={circumference * 0.875}
          style={{ transform: "rotate(135deg)", transformOrigin: `${cx}px ${cy}px` }}
        />
        {/* Fill */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          strokeDashoffset={circumference * 0.875}
          style={{
            transform: "rotate(135deg)",
            transformOrigin: `${cx}px ${cy}px`,
            transition: "stroke-dasharray 1s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-4xl font-semibold leading-none"
          style={{ fontFamily: "'Fraunces', Georgia, serif", color }}
        >
          {score.toFixed(1)}
        </span>
        <span className="text-xs font-medium text-gray-400 mt-1">/10</span>
      </div>
    </div>
  );
}

function MetricChip({
  label,
  value,
  icon: Icon,
  color,
  bg,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  bg: string;
}) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-2xl"
      style={{ background: bg }}
    >
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: color + "22" }}
      >
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div>
        <p className="text-xs text-gray-400 font-medium">{label}</p>
        <p className="text-base font-semibold text-gray-800">{value}<span className="text-xs font-normal text-gray-400">/10</span></p>
      </div>
    </div>
  );
}

export default async function EmployeeDashboard() {
  const session = await auth();
  const userId = session!.user.id;
  const firstName = session!.user.name?.split(" ")[0] ?? "Hey";

  const entries = await prisma.wellbeingEntry.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 8,
    select: { periodKey: true, score: true, mood: true, stress: true, energy: true, createdAt: true },
  });

  const latest = entries[0] ?? null;
  const maxBarScore = Math.max(...entries.map(e => e.score), 1);

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-400 mb-1">Willkommen zurück</p>
          <h1
            className="text-3xl font-semibold text-gray-900 leading-tight"
            style={{ fontFamily: "'Fraunces', Georgia, serif" }}
          >
            {firstName} 👋
          </h1>
          <p className="text-gray-400 text-sm mt-1">Dein persönliches Wellbeing-Dashboard</p>
        </div>
        <Link
          href="/employee/checkin"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:shadow-glow"
          style={{ background: "linear-gradient(135deg, #14b8a6, #0d9488)" }}
        >
          Check-in starten
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Hero score card */}
      {latest ? (
        <div
          className="rounded-3xl p-6 flex flex-col sm:flex-row items-center gap-6"
          style={{
            background: "linear-gradient(135deg, #f0fdf9 0%, #ffffff 60%)",
            border: "1px solid #d1fae5",
          }}
        >
          <ScoreGauge score={latest.score} />

          <div className="flex-1 space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-400">Aktueller Status</p>
              <p
                className="text-2xl font-semibold mt-0.5"
                style={{ color: scoreColor(latest.score), fontFamily: "'Fraunces', Georgia, serif" }}
              >
                {scoreLabel(latest.score)}
              </p>
              <p className="text-xs text-gray-400 mt-1">Letzte Periode: {latest.periodKey}</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <MetricChip label="Stimmung" value={latest.mood} icon={Smile} color="#14b8a6" bg="#f0fdf9" />
              <MetricChip label="Energie" value={latest.energy} icon={Zap} color="#4c8448" bg="#f2f7f4" />
              <MetricChip label="Stress" value={latest.stress} icon={Flame} color="#d97706" bg="#fffbeb" />
            </div>
          </div>
        </div>
      ) : (
        /* No check-in yet */
        <div
          className="rounded-3xl p-8 text-center pulse-ring"
          style={{
            background: "linear-gradient(135deg, #f0fdf9 0%, #ffffff 60%)",
            border: "1px solid #d1fae5",
          }}
        >
          <div className="text-5xl mb-4">🌱</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
            Starte deinen ersten Check-in
          </h2>
          <p className="text-gray-400 text-sm mb-6">Nimm dir 2 Minuten für dein Wohlbefinden.</p>
          <Link
            href="/employee/checkin"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #14b8a6, #0d9488)" }}
          >
            Jetzt starten <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Trend chart */}
      {entries.length > 1 && (
        <div
          className="rounded-2xl p-6"
          style={{ background: "#ffffff", border: "1px solid hsl(200, 15%, 88%)" }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-elyo-500" />
                <h2 className="text-sm font-semibold text-gray-700">Verlauf</h2>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">Letzte {entries.length} Check-ins</p>
            </div>
            <Link href="/employee/history" className="text-xs text-elyo-600 font-medium hover:text-elyo-700 transition-colors">
              Alle anzeigen →
            </Link>
          </div>

          {/* Bar chart */}
          <div className="flex items-end gap-2 h-28">
            {[...entries].reverse().map((e, i) => {
              const heightPct = (e.score / 10) * 100;
              const color = scoreColor(e.score);
              return (
                <div key={e.periodKey} className="flex-1 flex flex-col items-center gap-1.5 group">
                  <div className="w-full relative flex items-end justify-center" style={{ height: 96 }}>
                    <div
                      className="w-full rounded-t-lg bar-fill"
                      title={`${e.periodKey}: ${e.score.toFixed(1)}`}
                      style={{
                        height: `${heightPct}%`,
                        background: i === entries.length - 1
                          ? `linear-gradient(to top, ${color}cc, ${color}55)`
                          : `${color}33`,
                        border: i === entries.length - 1
                          ? `1px solid ${color}66`
                          : "none",
                        animationDelay: `${i * 50}ms`,
                      }}
                    />
                    {/* Tooltip on hover */}
                    <div
                      className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 px-2 py-1 rounded-lg text-[10px] font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap"
                      style={{ background: "#0a1f1c" }}
                    >
                      {e.score.toFixed(1)}
                    </div>
                  </div>
                  <span className="text-[9px] text-gray-300 font-medium">
                    {e.periodKey.slice(-3)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-between mt-4 pt-4" style={{ borderTop: "1px solid #f3f4f6" }}>
            <span className="text-xs text-gray-400">Min: 0</span>
            <div className="flex gap-3">
              {[
                { color: "#14b8a6", label: "Sehr gut (7.5+)" },
                { color: "#d97706", label: "OK (4.5–7.4)" },
                { color: "#ef4444", label: "Niedrig (<4.5)" },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                  <span className="text-[10px] text-gray-400">{label}</span>
                </div>
              ))}
            </div>
            <span className="text-xs text-gray-400">Max: 10</span>
          </div>
        </div>
      )}

      {/* CTA when no checkin this period */}
      {latest && (
        <div
          className="rounded-2xl px-6 py-4 flex items-center justify-between"
          style={{ background: "linear-gradient(135deg, #0a1f1c, #0f766e)", color: "white" }}
        >
          <div>
            <p className="font-medium text-sm">Nächster Check-in bereit</p>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.55)" }}>
              Regelmäßige Check-ins verbessern dein Wohlbefinden
            </p>
          </div>
          <Link
            href="/employee/checkin"
            className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{ background: "#14b8a6", color: "white" }}
          >
            Starten <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}
