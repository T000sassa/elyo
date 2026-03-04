import { NextRequest, NextResponse } from "next/server";
import { verifyInviteToken } from "@/lib/invites";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ valid: false, error: "Kein Token angegeben" });

  const result = await verifyInviteToken(token);
  if (!result.valid) return NextResponse.json(result);

  return NextResponse.json({
    valid: true,
    company: result.invite!.company,
    email: result.invite!.email,
    role: result.invite!.role,
  });
}
