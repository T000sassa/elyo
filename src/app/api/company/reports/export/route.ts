import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTrendData, getAggregatedMetrics } from "@/lib/anonymize";

/**
 * Fix: CSV Injection Prevention
 * Verhindert Formula-Injection in Excel (=, +, -, @, | als Prefix → gefährlich)
 */
function sanitizeCSV(value: string): string {
  if (/^[=+\-@|]/.test(value)) {
    return `'${value}`;
  }
  return value.replace(/"/g, '""');
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "EMPLOYEE") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const companyId = session.user.companyId;
  const format = req.nextUrl.searchParams.get("format") ?? "csv";

  const [company, trend, teams] = await Promise.all([
    prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true, anonymityThreshold: true },
    }),
    getTrendData(companyId, { limit: 52 }),
    prisma.team.findMany({
      where: { companyId },
      select: { id: true, name: true, _count: { select: { members: true } } },
    }),
  ]);

  const teamsMetrics = await Promise.all(
    teams.map(async (t) => ({
      name: t.name,
      memberCount: t._count.members,
      metrics: await getAggregatedMetrics(companyId, {
        teamId: t.id,
        threshold: company?.anonymityThreshold,
      }),
    }))
  );

  if (format === "csv") {
    const now = new Date().toISOString().slice(0, 10);
    const lines: string[] = [];

    // Fix: company.name via sanitizeCSV — verhindert CSV/Formula-Injection
    lines.push(`# ELYO ESG Wellbeing Report — ${sanitizeCSV(company?.name ?? "")}`);
    lines.push(`# Exportiert: ${now}`);
    lines.push(`# Anonymitätsschwellenwert: ${company?.anonymityThreshold ?? 5} Mitarbeiter`);
    lines.push(`# Alle Daten sind aggregiert und anonymisiert`);
    lines.push("");

    // Section 1: Trend
    lines.push("## Wellbeing-Trend (historisch)");
    lines.push("Periode,Score,Stimmung,Stress,Energie,Teilnehmende");
    for (const p of trend) {
      lines.push(
        `${p.period},${p.avgScore},${p.avgMood},${p.avgStress},${p.avgEnergy},${p.respondents}`
      );
    }
    lines.push("");

    // Section 2: Teams
    lines.push("## Team-Übersicht (aktuell)");
    lines.push("Team,Mitglieder,Score,Stimmung,Stress,Energie,Datenbasis");
    for (const t of teamsMetrics) {
      if (t.metrics.isAboveThreshold) {
        lines.push(
          `"${sanitizeCSV(t.name)}",${t.memberCount},${t.metrics.avgScore},${t.metrics.avgMood},${t.metrics.avgStress},${t.metrics.avgEnergy},${t.metrics.responseCount}`
        );
      } else {
        lines.push(`"${sanitizeCSV(t.name)}",${t.memberCount},Zu wenig Daten,,,,`);
      }
    }

    const csv = lines.join("\n");
    const filename = `elyo_esg_report_${now}.csv`;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  // JSON fallback
  return NextResponse.json({
    company: company?.name,
    exportedAt: new Date().toISOString(),
    trend,
    teams: teamsMetrics.map((t) => ({
      name: t.name,
      memberCount: t.memberCount,
      ...(t.metrics.isAboveThreshold
        ? {
            avgScore: t.metrics.avgScore,
            avgMood: t.metrics.avgMood,
            avgStress: t.metrics.avgStress,
            avgEnergy: t.metrics.avgEnergy,
            responseCount: t.metrics.responseCount,
          }
        : { dataAvailable: false }),
    })),
  });
}
