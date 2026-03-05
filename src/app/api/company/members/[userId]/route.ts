import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "EMPLOYEE") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { isActive } = body;
  if (typeof isActive !== "boolean") {
    return NextResponse.json({ error: "isActive must be boolean" }, { status: 400 });
  }

  // Verify the target user belongs to the same company
  const target = await prisma.user.findFirst({
    where: { id: params.userId, companyId: session.user.companyId },
  });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Prevent deactivating yourself
  if (target.id === session.user.id) {
    return NextResponse.json({ error: "Cannot deactivate yourself" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: params.userId },
    data: { isActive },
    select: { id: true, name: true, email: true, isActive: true },
  });

  return NextResponse.json({ user: updated });
}
