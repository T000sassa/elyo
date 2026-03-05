import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface HeatmapCell {
  dayOfWeek: number;
  hour: number;
  count: number;
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "EMPLOYEE") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const companyId = session.user.companyId;
  const isManager = session.user.role === "COMPANY_MANAGER";
  const managedTeamId = session.user.managedTeamId;

  let rows: { day_of_week: number; hour: number; count: bigint }[];

  if (isManager && managedTeamId) {
    // Manager: only entries from their team members
    rows = await prisma.$queryRaw`
      SELECT
        EXTRACT(DOW FROM we."created_at")::int  AS day_of_week,
        EXTRACT(HOUR FROM we."created_at")::int AS hour,
        COUNT(*)::bigint                        AS count
      FROM wellbeing_entries we
      JOIN users u ON u.id = we."user_id"
      WHERE we.company_id = ${companyId}
        AND u."team_id" = ${managedTeamId}
      GROUP BY day_of_week, hour
      ORDER BY day_of_week, hour
    `;
  } else {
    rows = await prisma.$queryRaw`
      SELECT
        EXTRACT(DOW FROM "created_at")::int  AS day_of_week,
        EXTRACT(HOUR FROM "created_at")::int AS hour,
        COUNT(*)::bigint                     AS count
      FROM wellbeing_entries
      WHERE company_id = ${companyId}
      GROUP BY day_of_week, hour
      ORDER BY day_of_week, hour
    `;
  }

  const cells: HeatmapCell[] = rows.map((r) => ({
    dayOfWeek: r.day_of_week,
    hour: r.hour,
    count: Number(r.count),
  }));

  const maxCount = cells.reduce((m, c) => Math.max(m, c.count), 0);

  return NextResponse.json({ cells, maxCount });
}
