import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendCheckinReminder } from "@/lib/email";

// Called by a cron job (e.g. Vercel Cron, GitHub Actions, or external scheduler)
// Protected by CRON_SECRET header
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  const expected = process.env.CRON_SECRET;

  // Fix: Timing-Safe-Vergleich verhindert Timing-Side-Channel-Angriffe
  if (!secret || !expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const secretBuf = Buffer.from(secret);
  const expectedBuf = Buffer.from(expected);

  if (
    secretBuf.length !== expectedBuf.length ||
    !timingSafeEqual(secretBuf, expectedBuf)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  // Find employees who haven't checked in this week
  const now = new Date();
  const year = now.getFullYear();
  const start = new Date(year, 0, 1);
  const week = Math.ceil(
    ((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7
  );
  const currentPeriod = `${year}-W${String(week).padStart(2, "0")}`;

  // Fix: Explizit dokumentierter Multi-Tenant-Zugriff — Cron verarbeitet bewusst alle Companies.
  // companyId-Filter nicht sinnvoll hier, da der Job alle Tenants gleichzeitig verarbeitet.
  // Scoping erfolgt pro Company über die company-Relation.
  const employees = await prisma.user.findMany({
    where: { role: "EMPLOYEE", isActive: true },
    select: {
      id: true,
      email: true,
      name: true,
      company: { select: { name: true, checkinFrequency: true } },
    },
  });

  // Find who already checked in this period
  const checkedIn = await prisma.wellbeingEntry.findMany({
    where: { periodKey: currentPeriod },
    select: { userId: true },
  });
  const checkedInIds = new Set(checkedIn.map((e) => e.userId));

  const pending = employees.filter((e) => !checkedInIds.has(e.id));

  let sent = 0;
  let failed = 0;

  for (const emp of pending) {
    const ok = await sendCheckinReminder({
      to: emp.email,
      name: emp.name ?? emp.email.split("@")[0],
      companyName: emp.company.name,
      checkinUrl: `${baseUrl}/employee/checkin`,
    });
    if (ok) sent++;
    else failed++;
  }

  return NextResponse.json({
    ok: true,
    period: currentPeriod,
    totalEmployees: employees.length,
    alreadyCheckedIn: employees.length - pending.length,
    remindersSent: sent,
    failed,
  });
}
