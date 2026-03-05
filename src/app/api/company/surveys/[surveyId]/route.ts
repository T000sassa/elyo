import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const PatchSurveySchema = z.object({
  status: z.enum(["DRAFT", "ACTIVE", "CLOSED"]).optional(),
  title: z.string().min(3).max(120).optional(),
  description: z.string().max(500).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { surveyId: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "EMPLOYEE") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const survey = await prisma.survey.findFirst({
    where: { id: params.surveyId, companyId: session.user.companyId },
  });
  if (!survey) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = PatchSurveySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const updated = await prisma.survey.update({
    where: { id: params.surveyId },
    data: parsed.data,
    include: { _count: { select: { responses: true, questions: true } } },
  });

  return NextResponse.json({ survey: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { surveyId: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "EMPLOYEE") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const survey = await prisma.survey.findFirst({
    where: { id: params.surveyId, companyId: session.user.companyId },
  });
  if (!survey) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.survey.delete({ where: { id: params.surveyId } });
  return NextResponse.json({ ok: true });
}
