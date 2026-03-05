"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { Shield, Download, TrendingUp, TrendingDown, Minus, Activity, Loader2 } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface TrendPoint {
  period: string;
  avgScore: number;
  avgMood: number;
  avgStress: number;
  avgEnergy: number;
  respondents: number;
}

interface HeatmapCell {
  dayOfWeek: number;
  hour: number;
  count: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 7.5) return "#14b8a6";
  if (score >= 6) return "#4c8448";
  if (score >= 4.5) return "#d97706";
  return "#ef4444";
}

const DOW_LABELS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const BUSINESS_HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
const BUSINESS_DAYS = [1, 2, 3, 4, 5];

// ── HeatmapGrid ───────────────────────────────────────────────────────────────

function HeatmapGrid({ cells, maxCount }: { cells: HeatmapCell[]; maxCount: number }) {
  const lookup = new Map<string, number>();
  for (const c of cells) lookup.set(`${c.dayOfWeek}-${c.hour}`, c.count);

  function cellBg(count: number): string {
    if (count === 0 || maxCount === 0) return "rgba(20,184,166,0.04)";
    const p = count / maxCount;
    if (p < 0.15) return "rgba(20,184,166,0.10)";
    if (p < 0.30) return "rgba(20,184,166,0.22)";
    if (p < 0.50) return "rgba(20,184,166,0.38)";
    if (p < 0.70) return "rgba(20,184,166,0.58)";
    if (p < 0.85) return "rgba(20,184,166,0.78)";
    return "rgba(20,184,166,0.95)";
  }

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: 420 }}>
        <div className="flex gap-1 mb-1 pl-8">
          {BUSINESS_HOURS.map((h) => (
            <div key={h} className="flex-1 text-center text-[9px] text-gray-300 font-medium">{h}</div>
          ))}
        </div>
        {BUSINESS_DAYS.map((dow) => (
          <div key={dow} className="flex items-center gap-1 mb-1">
            <div className="w-7 text-right text-[10px] font-semibold text-gray-400 flex-shrink-0">{DOW_LABELS[dow]}</div>
            {BUSINESS_HOURS.map((h) => {
              const count = lookup.get(`${dow}-${h}`) ?? 0;
              return (
                <div
                  key={h}
                  className="flex-1 h-7 rounded-md cursor-default"
                  title={count > 0 ? `${DOW_LABELS[dow]} ${h}:00 — ${count} Check-ins` : "Keine Daten"}
                  style={{ background: cellBg(count), border: "1px solid rgba(20,184,166,0.08)" }}
                />
              );
            })}
          </div>
        ))}
        <div className="flex items-center gap-3 mt-3 pl-8">
          <span className="text-[10px] text-gray-400">Weniger</span>
          <div className="flex gap-0.5">
            {[0.04, 0.10, 0.22, 0.38, 0.58, 0.78, 0.95].map((a) => (
              <div key={a} className="w-4 h-4 rounded-sm" style={{ background: `rgba(20,184,166,${a})`, border: "1px solid rgba(20,184,166,0.12)" }} />
            ))}
          </div>
          <span className="text-[10px] text-gray-400">Mehr</span>
        </div>
      </div>
    </div>
  );
}

// ── TrendBars ─────────────────────────────────────────────────────────────────

function TrendBars({ data }: { data: TrendPoint[] }) {
  const chartH = 120;
  return (
    <div className="flex items-end gap-1.5 overflow-x-auto" style={{ height: chartH + 28 }}>
      {data.map((pt, i) => {
        const sc = pt.avgScore;
        const color = scoreColor(sc);
        const h = Math.max(4, (sc / 10) * chartH);
        const isLast = i === data.length - 1;
        return (
          <div key={pt.period} className="flex-shrink-0 flex flex-col items-center gap-1" style={{ width: 36 }}>
            <div className="w-full flex flex-col items-center justify-end relative" style={{ height: chartH }}>
              {isLast && (
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold whitespace-nowrap" style={{ color }}>
                  {sc.toFixed(1)}
                </div>
              )}
              <div
                className="w-full rounded-t-lg"
                title={`${pt.period}: ${sc.toFixed(1)}`}
                style={{ height: h, background: isLast ? `linear-gradient(to top, ${color}, ${color}88)` : `${color}44` }}
              />
            </div>
            <span className="text-[8px] text-gray-300 font-medium">{pt.period.slice(-3)}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── MetricDeltas ──────────────────────────────────────────────────────────────

function MetricDeltas({ data }: { data: TrendPoint[] }) {
  if (data.length < 2) return null;
  const last = data[data.length - 1];
  const prev = data[data.length - 2];

  const metrics = [
    { label: "Score", curr: last.avgScore, prev: prev.avgScore, color: scoreColor(last.avgScore), invert: false },
    { label: "Stimmung", curr: last.avgMood, prev: prev.avgMood, color: "#14b8a6", invert: false },
    { label: "Stress", curr: last.avgStress, prev: prev.avgStress, color: "#d97706", invert: true },
    { label: "Energie", curr: last.avgEnergy, prev: prev.avgEnergy, color: "#4c8448", invert: false },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {metrics.map((m) => {
        const d = m.curr - m.prev;
        const improved = m.invert ? d < -0.05 : d > 0.05;
        const worsened = m.invert ? d > 0.05 : d < -0.05;
        return (
          <div key={m.label} className="rounded-xl p-4" style={{ background: "#fafaf9", border: "1px solid #f0ede8" }}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{m.label}</p>
            <p className="text-2xl font-semibold leading-none" style={{ color: m.color, fontFamily: "'Fraunces', Georgia, serif" }}>
              {m.curr.toFixed(1)}
            </p>
            <div className="flex items-center gap-1 mt-1.5">
              {Math.abs(d) <= 0.05 ? (
                <><Minus className="w-3 h-3 text-gray-300" /><span className="text-[10px] text-gray-400">Stabil</span></>
              ) : improved ? (
                <><TrendingUp className="w-3 h-3 text-emerald-500" /><span className="text-[10px] text-emerald-600">+{Math.abs(d).toFixed(1)}</span></>
              ) : (
                <><TrendingDown className="w-3 h-3 text-amber-500" /><span className="text-[10px] text-amber-600">-{Math.abs(d).toFixed(1)}</span></>
              )}
              <span className="text-[10px] text-gray-300 ml-1">vs. Vorperiode</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [heatmap, setHeatmap] = useState<{ cells: HeatmapCell[]; maxCount: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/company/reports?limit=24").then((r) => r.json()),
      fetch("/api/company/analytics/heatmap").then((r) => r.json()),
    ]).then(([td, hd]) => {
      setTrend(td.trend ?? []);
      if (!hd.error) setHeatmap(hd);
    }).finally(() => setLoading(false));
  }, []);

  async function downloadCSV() {
    setDownloading(true);
    const res = await fetch("/api/company/reports/export?format=csv");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `elyo_esg_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloading(false);
  }

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-400 mb-1">Analyse</p>
          <h1 className="text-3xl font-semibold text-gray-900 leading-tight" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
            Reports
          </h1>
          <p className="text-gray-400 text-sm mt-1">Wellbeing-Trends, Nutzungsmuster & ESG-Export</p>
        </div>
        <button
          onClick={downloadCSV}
          disabled={downloading || trend.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
          style={{ background: "#f0fdf9", color: "#0d9488", border: "1px solid #d1fae5" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#d1fae5"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#f0fdf9"; }}
        >
          {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          ESG CSV exportieren
        </button>
      </div>

      {/* Privacy badge */}
      <div className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium"
        style={{ background: "#f0fdf9", border: "1px solid #d1fae5", color: "#0d9488" }}>
        <Shield className="w-4 h-4" />
        Nur Perioden mit ausreichend Teilnahme werden angezeigt
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-400 text-sm pt-4">
          <Loader2 className="w-4 h-4 animate-spin" /> Laden…
        </div>
      ) : trend.length === 0 ? (
        <div className="rounded-2xl p-10 text-center" style={{ background: "#fafaf9", border: "1px solid #f0ede8" }}>
          <div className="text-4xl mb-3">📊</div>
          <p className="font-semibold text-gray-700">Noch keine auswertbaren Daten</p>
          <p className="text-sm text-gray-400 mt-1">Sobald genug Check-ins eingegangen sind, erscheinen hier Reports.</p>
        </div>
      ) : (
        <>
          {/* KPI delta cards */}
          <MetricDeltas data={trend} />

          {/* Trend bar chart */}
          <div className="rounded-2xl p-6" style={{ background: "#ffffff", border: "1px solid hsl(200, 15%, 88%)" }}>
            <div className="flex items-center gap-2 mb-5">
              <TrendingUp className="w-4 h-4 text-elyo-500" />
              <h2 className="text-sm font-semibold text-gray-700">Score-Verlauf</h2>
              <span className="text-xs text-gray-400 ml-1">({trend.length} Perioden)</span>
            </div>
            <TrendBars data={trend} />
          </div>

          {/* Data table */}
          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid hsl(200, 15%, 88%)" }}>
            <div className="px-5 py-4" style={{ background: "#fafaf9", borderBottom: "1px solid hsl(200, 15%, 88%)" }}>
              <h2 className="text-sm font-semibold text-gray-700">Perioden-Detail</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid #f0ede8" }}>
                    {["Periode", "Score", "Stimmung", "Stress", "Energie", "Teilnehmende"].map((h, i) => (
                      <th key={h} className={`py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider ${i === 0 ? "text-left" : "text-right"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...trend].reverse().map((row, i) => (
                    <tr key={row.period} style={{ borderBottom: "1px solid #f9f7f4", background: i % 2 === 0 ? "#ffffff" : "#fafaf9" }}>
                      <td className="py-3 px-4 font-semibold text-gray-700">{row.period}</td>
                      <td className="py-3 px-4 text-right font-bold" style={{ color: scoreColor(row.avgScore) }}>{row.avgScore.toFixed(1)}</td>
                      <td className="py-3 px-4 text-right text-gray-600">{row.avgMood.toFixed(1)}</td>
                      <td className="py-3 px-4 text-right" style={{ color: "#d97706" }}>{row.avgStress.toFixed(1)}</td>
                      <td className="py-3 px-4 text-right" style={{ color: "#4c8448" }}>{row.avgEnergy.toFixed(1)}</td>
                      <td className="py-3 px-4 text-right text-gray-400">{row.respondents}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Heatmap */}
          {heatmap && heatmap.maxCount > 0 && (
            <div className="rounded-2xl p-6" style={{ background: "#ffffff", border: "1px solid hsl(200, 15%, 88%)" }}>
              <div className="flex items-center gap-2 mb-5">
                <Activity className="w-4 h-4 text-elyo-500" />
                <h2 className="text-sm font-semibold text-gray-700">Nutzungsmuster</h2>
                <span className="text-xs text-gray-400 ml-1">Wann checken Mitarbeiter ein?</span>
              </div>
              <HeatmapGrid cells={heatmap.cells} maxCount={heatmap.maxCount} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
