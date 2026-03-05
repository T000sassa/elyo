import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAggregatedMetrics, getContinuityData } from "@/lib/anonymize";
import { sendWeeklyDigest } from "@/lib/email";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  // Send weekly digest to all company admins
  const companies = await prisma.company.findMany({
    select: { id: true, name: true, anonymityThreshold: true },
  });

  let totalSent = 0;

  for (const company of companies) {
    const [metrics, teams, continuity, admins] = await Promise.all([
      getAggregatedMetrics(company.id, { threshold: company.anonymityThreshold }),
      prisma.team.findMany({ where: { companyId: company.id }, select: { id: true } }),
      getContinuityData(company.id, { threshold: company.anonymityThreshold }),
      prisma.user.findMany({
        where: { companyId: company.id, role: "COMPANY_ADMIN", isActive: true },
        select: { email: true, name: true },
      }),
    ]);

    if (!metrics.isAboveThreshold) continue;

    // Count at-risk teams
    const teamMetrics = await Promise.all(
      teams.map((t) => getAggregatedMetrics(company.id, { teamId: t.id, threshold: company.anonymityThreshold }))
    );
    const atRiskTeams = teamMetrics.filter((m) => m.isAboveThreshold && m.avgScore < 6).length;

    for (const admin of admins) {
      const ok = await sendWeeklyDigest({
        to: admin.email,
        name: admin.name ?? "Admin",
        companyName: company.name,
        avgScore: metrics.avgScore,
        atRiskTeams,
        activeRate: continuity.activeUserRate,
        dashboardUrl: `${baseUrl}/company/dashboard`,
      });
      if (ok) totalSent++;
    }
  }

  return NextResponse.json({ ok: true, digestsSent: totalSent });
}
