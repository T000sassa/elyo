import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const take = parseInt(req.nextUrl.searchParams.get("limit") ?? "20");

  const entries = await prisma.wellbeingEntry.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
    take,
    select: { periodKey: true, score: true, mood: true, stress: true, energy: true, createdAt: true },
  });

  return NextResponse.json({ entries });
}
