import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAggregatedMetrics, getTrendData } from "@/lib/anonymize";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = session.user.companyId;
  const isManager = session.user.role === "COMPANY_MANAGER";
  const managedTeamId = session.user.managedTeamId ?? undefined;

  // Fix: Manager ohne zugewiesenes Team darf keine Daten sehen
  if (isManager && !managedTeamId) {
    return NextResponse.json(
      { error: "Kein Team zugewiesen. Bitte wenden Sie sich an Ihren Administrator." },
      { status: 403 }
    );
  }

  // Managers are scoped to their team only
  const teamFilter = isManager && managedTeamId ? { id: managedTeamId } : {};

  const [metrics, trend, teams] = await Promise.all([
    getAggregatedMetrics(companyId, isManager && managedTeamId ? { teamId: managedTeamId } : {}),
    getTrendData(companyId, { limit: 12, teamId: isManager ? managedTeamId : undefined }),
    prisma.team.findMany({
      where: { companyId, ...teamFilter },
      select: { id: true, name: true, color: true, _count: { select: { members: true } } },
    }),
  ]);

  const teamsWithMetrics = await Promise.all(
    teams.map(async (team) => {
      const m = await getAggregatedMetrics(companyId, { teamId: team.id });
      return {
        id: team.id,
        name: team.name,
        color: team.color,
        memberCount: team._count.members,
        metrics: m.isAboveThreshold
          ? { isAboveThreshold: true, avgScore: m.avgScore, avgMood: m.avgMood, avgStress: m.avgStress, responseCount: m.responseCount }
          : { isAboveThreshold: false, responseCount: m.responseCount },
      };
    })
  );

  return NextResponse.json({ company: metrics, trend, teams: teamsWithMetrics });
}
