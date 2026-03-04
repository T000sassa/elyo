import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAggregatedMetrics, getTrendData } from "@/lib/anonymize";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = session.user.companyId;

  const [metrics, trend, teams] = await Promise.all([
    getAggregatedMetrics(companyId),
    getTrendData(companyId, { limit: 12 }),
    prisma.team.findMany({
      where: { companyId },
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
