import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const AnswerSchema = z.object({
  questionId: z.string(),
  scaleValue: z.number().int().min(1).max(10).optional(),
  textValue: z.string().max(2000).optional(),
  choiceValue: z.string().max(200).optional(),
  boolValue: z.boolean().optional(),
});

const RespondSchema = z.object({
  answers: z.array(AnswerSchema).min(1),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { surveyId: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const survey = await prisma.survey.findFirst({
    where: {
      id: params.surveyId,
      companyId: session.user.companyId,
      status: "ACTIVE",
    },
    include: { questions: true },
  });
  if (!survey) return NextResponse.json({ error: "Survey not found or not active" }, { status: 404 });

  const existing = await prisma.surveyResponse.findUnique({
    where: { userId_surveyId: { userId: session.user.id, surveyId: params.surveyId } },
  });
  if (existing) return NextResponse.json({ error: "Already completed" }, { status: 409 });

  const body = await req.json();
  const parsed = RespondSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // Validate questionIds belong to this survey
  const validQuestionIds = new Set(survey.questions.map((q) => q.id));
  for (const a of parsed.data.answers) {
    if (!validQuestionIds.has(a.questionId)) {
      return NextResponse.json({ error: `Invalid questionId: ${a.questionId}` }, { status: 400 });
    }
  }

  await prisma.surveyResponse.create({
    data: {
      surveyId: params.surveyId,
      userId: session.user.id,
      companyId: session.user.companyId,
      answers: {
        create: parsed.data.answers.map((a) => ({
          questionId: a.questionId,
          scaleValue: a.scaleValue,
          textValue: a.textValue,
          choiceValue: a.choiceValue,
          boolValue: a.boolValue,
        })),
      },
    },
  });

  return NextResponse.json({ ok: true });
}
