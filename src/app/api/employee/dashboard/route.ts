import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  const entries = await prisma.wellbeingEntry.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 7,
    select: { periodKey: true, score: true, mood: true, stress: true, energy: true, createdAt: true },
  });

  const latest = entries[0] ?? null;
  const streakCount = entries.length;

  return NextResponse.json({ latest, entries: entries.reverse(), streakCount });
}
