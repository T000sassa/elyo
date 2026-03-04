import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTrendData } from "@/lib/anonymize";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "12");
  const teamId = req.nextUrl.searchParams.get("teamId") ?? undefined;

  const trend = await getTrendData(session.user.companyId, { limit, teamId });
  return NextResponse.json({ trend });
}
