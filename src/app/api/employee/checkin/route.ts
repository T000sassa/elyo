import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CheckinSchema } from "@/lib/validations";

function getPeriodKey(frequency: string): string {
  const now = new Date();
  if (frequency === "DAILY") {
    return now.toISOString().slice(0, 10);
  }
  // WEEKLY: ISO week key e.g. "2024-W12"
  const jan1 = new Date(now.getFullYear(), 0, 1);
  const weekNum = Math.ceil(
    ((now.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7
  );
  return `${now.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Fix: Nur EMPLOYEE darf Check-ins einreichen
  if (session.user.role !== "EMPLOYEE") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = CheckinSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { mood, stress, energy, note } = parsed.data;
  const score = Math.round(((mood + (11 - stress) + energy) / 3) * 10) / 10;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { company: { select: { checkinFrequency: true } } },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const periodKey = getPeriodKey(user.company.checkinFrequency);

  // userId kommt immer aus der Session, nie aus dem Request-Body
  const entry = await prisma.wellbeingEntry.upsert({
    where: { userId_periodKey: { userId: session.user.id, periodKey } },
    update: { mood, stress, energy, score, note },
    create: { userId: session.user.id, companyId: user.companyId, mood, stress, energy, score, note, periodKey },
  });

  return NextResponse.json({ success: true, score: entry.score, periodKey });
}
