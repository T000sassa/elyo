export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAggregatedMetrics, getTrendData, getContinuityData } from "@/lib/anonymize";
import { Shield, AlertTriangle, TrendingUp, Users, ArrowRight, Activity, UserCheck } from "lucide-react";
import Link from "next/link";

function scoreColor(score: number) {
  if (score >= 7.5) return "#14b8a6";
  if (score >= 6) return "#4c8448";
  if (score >= 4.5) return "#d97706";
  return "#ef4444";
}

function KpiCard({
  label,
  value,
  max = 10,
  color,
  bg,
  borderColor,
  subtitle,
}: {
  label: string;
  value: number;
  max?: number;
  color: string;
  bg: string;
  borderColor: string;
  subtitle?: string;
}) {
  const pct = (value / max) * 100;
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-3"
      style={{ background: bg, border: `1px solid ${borderColor}` }}
    >
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
      <div>
        <span
          className="text-4xl font-semibold leading-none"
          style={{ color, fontFamily: "'Fraunces', Georgia, serif" }}
        >
          {value.toFixed(1)}
        </span>
        <span className="text-sm text-gray-400 ml-1">/{max}</span>
      </div>
      {/* Mini bar */}
      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
    </div>
  );
}

function TeamHealthRow({
  name,
  color,
  memberCount,
  metrics,
  threshold,
}: {
  name: string;
  color: string | null;
  memberCount: number;
  metrics: { isAboveThreshold: boolean; avgScore: number; avgMood: number; avgEnergy: number; avgStress: number };
  threshold: number;
}) {
  const tc = color ?? "#14b8a6";
  const sc = metrics.isAboveThreshold ? scoreColor(metrics.avgScore) : "#9ca3af";
  const scorePct = metrics.isAboveThreshold ? (metrics.avgScore / 10) * 100 : 0;

  return (
    <div
      className="flex items-center gap-4 px-5 py-4 rounded-2xl group transition-all duration-150"
      style={{ background: "#fafaf9", border: "1px solid #f0ede8" }}
    >
      {/* Team color dot */}
      <div
        className="w-3 h-3 rounded-full flex-shrink-0"
        style={{ background: tc, boxShadow: `0 0 8px ${tc}66` }}
      />

      {/* Name + count */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">{name}</p>
        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
          <Users className="w-3 h-3" />
          {memberCount} Mitglieder
        </p>
      </div>

      {/* Score bar */}
      <div className="flex-1 max-w-[160px]">
        {metrics.isAboveThreshold ? (
          <div className="space-y-1">
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${scorePct}%`, background: sc }}
              />
            </div>
            <p className="text-xs text-gray-400">Score</p>
          </div>
        ) : (
          <span className="text-xs text-gray-400">Zu wenig Daten (min. {threshold})</span>
        )}
      </div>

      {/* Score number */}
      <div className="flex-shrink-0 text-right">
        {metrics.isAboveThreshold ? (
          <div>
            <p
              className="text-lg font-semibold leading-none"
              style={{ color: sc, fontFamily: "'Fraunces', Georgia, serif" }}
            >
              {metrics.avgScore.toFixed(1)}
            </p>
            {metrics.avgScore < 6 && (
              <div className="flex items-center gap-1 mt-1 justify-end">
                <AlertTriangle className="w-3 h-3" style={{ color: "#d97706" }} />
                <span className="text-[10px] font-medium" style={{ color: "#d97706" }}>Erhöhter Stress</span>
              </div>
            )}
          </div>
        ) : (
          <span className="text-gray-300 text-lg">—</span>
        )}
      </div>
    </div>
  );
}

export default async function CompanyDashboard() {
  const session = await auth();
  const companyId = session!.user.companyId;

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { name: true, anonymityThreshold: true },
  });

  const [metrics, teams, trendData, continuity] = await Promise.all([
    getAggregatedMetrics(companyId),
    prisma.team.findMany({
      where: { companyId },
      select: { id: true, name: true, color: true, _count: { select: { members: true } } },
    }),
    getTrendData(companyId, { limit: 6 }),
    getContinuityData(companyId, { threshold: company?.anonymityThreshold }),
  ]);

  const teamsWithMetrics = await Promise.all(
    teams.map(async (team) => {
      const m = await getAggregatedMetrics(companyId, { teamId: team.id });
      return { ...team, metrics: m };
    })
  );

  const atRiskCount = teamsWithMetrics.filter(
    t => t.metrics.isAboveThreshold && t.metrics.avgScore < 6
  ).length;

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-400 mb-1">Unternehmensübersicht</p>
          <h1
            className="text-3xl font-semibold text-gray-900 leading-tight"
            style={{ fontFamily: "'Fraunces', Georgia, serif" }}
          >
            {company?.name}
          </h1>
          <p className="text-gray-400 text-sm mt-1">Anonymisierte Wellbeing-Daten</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/company/reports"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
            style={{ background: "#f0fdf9", color: "#0d9488", border: "1px solid #d1fae5" }}
          >
            <TrendingUp className="w-4 h-4" />
            Reports
          </Link>
          <Link
            href="/company/teams"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200"
            style={{ background: "linear-gradient(135deg, #14b8a6, #0d9488)" }}
          >
            Teams verwalten
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Privacy badge */}
      <div
        className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium"
        style={{ background: "#f0fdf9", border: "1px solid #d1fae5", color: "#0d9488" }}
      >
        <Shield className="w-4 h-4" />
        Alle Daten anonymisiert — Mindestgröße: {company?.anonymityThreshold} Mitarbeiter
      </div>

      {/* At-risk alert */}
      {atRiskCount > 0 && (
        <div
          className="flex items-center gap-3 px-5 py-4 rounded-2xl"
          style={{ background: "#fffbeb", border: "1px solid #fde68a" }}
        >
          <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: "#d97706" }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: "#92400e" }}>
              {atRiskCount} Team{atRiskCount > 1 ? "s" : ""} mit erhöhtem Stresslevel
            </p>
            <p className="text-xs mt-0.5" style={{ color: "#b45309" }}>
              Score unter 6.0 — empfehlen weitere Maßnahmen
            </p>
          </div>
        </div>
      )}

      {/* KPIs */}
      {metrics.isAboveThreshold ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger">
          <KpiCard
            label="Wellbeing Score"
            value={metrics.avgScore}
            color={scoreColor(metrics.avgScore)}
            bg={metrics.avgScore >= 7 ? "#f0fdf9" : metrics.avgScore >= 5 ? "#fffbeb" : "#fef2f2"}
            borderColor={metrics.avgScore >= 7 ? "#d1fae5" : metrics.avgScore >= 5 ? "#fde68a" : "#fecaca"}
            subtitle={`${metrics.responseCount} Einträge analysiert`}
          />
          <KpiCard
            label="Stimmung"
            value={metrics.avgMood}
            color="#14b8a6"
            bg="#f0fdf9"
            borderColor="#d1fae5"
          />
          <KpiCard
            label="Stress"
            value={metrics.avgStress}
            color="#d97706"
            bg="#fffbeb"
            borderColor="#fde68a"
            subtitle="Höher = mehr Stress"
          />
          <KpiCard
            label="Energie"
            value={metrics.avgEnergy}
            color="#4c8448"
            bg="#f2f7f4"
            borderColor="#c4d9c1"
          />
        </div>
      ) : (
        <div
          className="rounded-2xl p-8 text-center"
          style={{ background: "#fafaf9", border: "1px solid #f0ede8" }}
        >
          <div className="text-4xl mb-3">📊</div>
          <p className="font-semibold text-gray-700">Noch nicht genug Daten</p>
          <p className="text-sm text-gray-400 mt-1">
            Mindestens {company?.anonymityThreshold} Mitarbeiter müssen einen Check-in abgeschlossen haben.
          </p>
        </div>
      )}

      {/* Teams */}
      {teamsWithMetrics.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2
              className="text-lg font-semibold text-gray-800"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
            >
              Team-Übersicht
            </h2>
            <Link
              href="/company/teams"
              className="text-xs text-elyo-600 font-medium hover:text-elyo-700 transition-colors"
            >
              Alle Teams →
            </Link>
          </div>
          <div className="space-y-2">
            {teamsWithMetrics.map((team) => (
              <TeamHealthRow
                key={team.id}
                name={team.name}
                color={team.color}
                memberCount={team._count.members}
                metrics={team.metrics}
                threshold={company?.anonymityThreshold ?? 5}
              />
            ))}
          </div>
        </div>
      )}

      {/* Trend chart (text-based, if data available) */}
      {trendData.length > 1 && (
        <div
          className="rounded-2xl p-6"
          style={{ background: "#ffffff", border: "1px solid hsl(200, 15%, 88%)" }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-elyo-500" />
                <h2 className="text-sm font-semibold text-gray-700">Wellbeing-Trend</h2>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">Letzte {trendData.length} Perioden</p>
            </div>
            <Link href="/company/reports" className="text-xs text-elyo-600 font-medium hover:text-elyo-700 transition-colors">
              Details →
            </Link>
          </div>

          <div className="flex items-end gap-2 h-28">
            {trendData.map((pt, i) => {
              const sc = pt.avgScore;
              const color = scoreColor(sc);
              const heightPct = (sc / 10) * 100;
              return (
                <div key={pt.period} className="flex-1 flex flex-col items-center gap-1.5 group">
                  <div className="w-full flex flex-col items-center justify-end" style={{ height: 96 }}>
                    <div
                      className="w-full rounded-t-lg bar-fill"
                      title={`${pt.period}: ${sc.toFixed(1)}`}
                      style={{
                        height: `${heightPct}%`,
                        background: i === trendData.length - 1
                          ? `linear-gradient(to top, ${color}cc, ${color}55)`
                          : `${color}33`,
                      }}
                    />
                  </div>
                  <span className="text-[9px] text-gray-300 font-medium">
                    {pt.period.slice(-3)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
