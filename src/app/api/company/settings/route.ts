import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const UpdateSettingsSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  industry: z.string().max(80).optional(),
  billingEmail: z.string().email().optional().or(z.literal("")),
  checkinFrequency: z.enum(["DAILY", "WEEKLY"]).optional(),
  anonymityThreshold: z.number().int().min(3).max(20).optional(),
});

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "EMPLOYEE") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = UpdateSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const company = await prisma.company.update({
    where: { id: session.user.companyId },
    data: parsed.data,
    select: { id: true, name: true, industry: true, billingEmail: true, checkinFrequency: true, anonymityThreshold: true },
  });

  return NextResponse.json({ data: company });
}
