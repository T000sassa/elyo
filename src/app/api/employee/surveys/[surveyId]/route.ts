import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
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
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!survey) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Check if already completed
  const existing = await prisma.surveyResponse.findUnique({
    where: { userId_surveyId: { userId: session.user.id, surveyId: params.surveyId } },
  });
  if (existing) return NextResponse.json({ error: "Already completed" }, { status: 409 });

  return NextResponse.json({ survey });
}
