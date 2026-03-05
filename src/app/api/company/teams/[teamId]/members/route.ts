import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { teamId: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "EMPLOYEE") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Verify team belongs to company
  const team = await prisma.team.findFirst({
    where: { id: params.teamId, companyId: session.user.companyId },
  });
  if (!team) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const members = await prisma.user.findMany({
    where: { teamId: params.teamId, companyId: session.user.companyId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
    },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return NextResponse.json({ members });
}
