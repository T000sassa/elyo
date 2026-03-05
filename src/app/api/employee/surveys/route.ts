import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get all ACTIVE surveys for the employee's company
  const surveys = await prisma.survey.findMany({
    where: {
      companyId: session.user.companyId,
      status: "ACTIVE",
    },
    include: {
      questions: { orderBy: { order: "asc" } },
      _count: { select: { responses: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Check which ones the employee has already completed
  const completedSurveyIds = await prisma.surveyResponse.findMany({
    where: { userId: session.user.id, surveyId: { in: surveys.map((s) => s.id) } },
    select: { surveyId: true },
  });
  const completedSet = new Set(completedSurveyIds.map((r) => r.surveyId));

  const result = surveys.map((s) => ({
    id: s.id,
    title: s.title,
    description: s.description,
    questionCount: s.questions.length,
    completed: completedSet.has(s.id),
    endsAt: s.endsAt,
  }));

  return NextResponse.json({ surveys: result });
}
