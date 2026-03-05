import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CreateSurveySchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().max(500).optional(),
  questions: z.array(z.object({
    text: z.string().min(3).max(300),
    type: z.enum(["SCALE", "MULTIPLE_CHOICE", "TEXT", "YES_NO"]),
    order: z.number().int().min(0),
    isRequired: z.boolean().default(true),
    options: z.array(z.string()).optional(),
    scaleMinLabel: z.string().optional(),
    scaleMaxLabel: z.string().optional(),
  })).min(1).max(20),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "EMPLOYEE") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const surveys = await prisma.survey.findMany({
    where: { companyId: session.user.companyId },
    include: {
      _count: { select: { responses: true, questions: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ surveys });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "EMPLOYEE") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = CreateSurveySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { questions, ...surveyData } = parsed.data;

  const survey = await prisma.survey.create({
    data: {
      ...surveyData,
      companyId: session.user.companyId,
      questions: {
        create: questions.map((q) => ({
          text: q.text,
          type: q.type,
          order: q.order,
          isRequired: q.isRequired,
          options: q.options ? JSON.stringify(q.options) : undefined,
          scaleMinLabel: q.scaleMinLabel,
          scaleMaxLabel: q.scaleMaxLabel,
        })),
      },
    },
    include: { questions: true, _count: { select: { responses: true } } },
  });

  return NextResponse.json({ survey }, { status: 201 });
}
