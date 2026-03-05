import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface HeatmapCell {
  dayOfWeek: number; // 0=So, 1=Mo ... 6=Sa
  hour: number;      // 0-23
  count: number;
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "EMPLOYEE") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Use raw SQL to extract day-of-week and hour from createdAt
  const rows = await prisma.$queryRaw<{ day_of_week: number; hour: number; count: bigint }[]>`
    SELECT
      EXTRACT(DOW FROM "created_at")::int  AS day_of_week,
      EXTRACT(HOUR FROM "created_at")::int AS hour,
      COUNT(*)::bigint                     AS count
    FROM wellbeing_entries
    WHERE company_id = ${session.user.companyId}
    GROUP BY day_of_week, hour
    ORDER BY day_of_week, hour
  `;

  const cells: HeatmapCell[] = rows.map((r) => ({
    dayOfWeek: r.day_of_week,
    hour: r.hour,
    count: Number(r.count),
  }));

  const maxCount = cells.reduce((m, c) => Math.max(m, c.count), 0);

  return NextResponse.json({ cells, maxCount });
}
