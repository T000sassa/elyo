import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TeamSchema } from "@/lib/validations";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teams = await prisma.team.findMany({
    where: { companyId: session.user.companyId },
    include: { _count: { select: { members: true } }, manager: { select: { name: true } } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ teams });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = TeamSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const team = await prisma.team.create({
    data: { ...parsed.data, companyId: session.user.companyId },
  });

  return NextResponse.json({ team }, { status: 201 });
}
