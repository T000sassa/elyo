import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { surveyId: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "EMPLOYEE") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const survey = await prisma.survey.findFirst({
    where: { id: params.surveyId, companyId: session.user.companyId },
    include: {
      questions: { orderBy: { order: "asc" } },
      _count: { select: { responses: true } },
    },
  });
  if (!survey) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const responseCount = survey._count.responses;

  // Aggregate answers per question — never return individual responses
  const questionResults = await Promise.all(
    survey.questions.map(async (q) => {
      if (q.type === "SCALE") {
        const agg = await prisma.surveyAnswer.aggregate({
          where: { questionId: q.id },
          _avg: { scaleValue: true },
          _count: { scaleValue: true },
        });
        return {
          questionId: q.id,
          text: q.text,
          type: q.type,
          scaleMinLabel: q.scaleMinLabel,
          scaleMaxLabel: q.scaleMaxLabel,
          avgValue: agg._avg.scaleValue ?? null,
          answerCount: agg._count.scaleValue,
        };
      }

      if (q.type === "YES_NO") {
        const trueCount = await prisma.surveyAnswer.count({ where: { questionId: q.id, boolValue: true } });
        const totalCount = await prisma.surveyAnswer.count({ where: { questionId: q.id } });
        return {
          questionId: q.id,
          text: q.text,
          type: q.type,
          trueCount,
          falseCount: totalCount - trueCount,
          answerCount: totalCount,
        };
      }

      if (q.type === "MULTIPLE_CHOICE") {
        const answers = await prisma.surveyAnswer.groupBy({
          by: ["choiceValue"],
          where: { questionId: q.id },
          _count: { choiceValue: true },
          orderBy: { _count: { choiceValue: "desc" } },
        });
        return {
          questionId: q.id,
          text: q.text,
          type: q.type,
          options: answers.map((a) => ({ value: a.choiceValue, count: a._count.choiceValue })),
          answerCount: answers.reduce((s, a) => s + a._count.choiceValue, 0),
        };
      }

      // TEXT — only return count, no individual answers
      const textCount = await prisma.surveyAnswer.count({ where: { questionId: q.id } });
      return {
        questionId: q.id,
        text: q.text,
        type: q.type,
        answerCount: textCount,
      };
    })
  );

  return NextResponse.json({
    survey: { id: survey.id, title: survey.title, status: survey.status },
    responseCount,
    questions: questionResults,
  });
}
