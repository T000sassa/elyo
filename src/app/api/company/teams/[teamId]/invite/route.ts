import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createInviteToken } from "@/lib/invites";
import { InviteSchema } from "@/lib/validations";

export async function POST(
  req: NextRequest,
  { params }: { params: { teamId: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = InviteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const invite = await createInviteToken(session.user.companyId, {
    email: parsed.data.email,
    role: parsed.data.role,
    teamId: params.teamId,
  });

  const inviteUrl = `${process.env.NEXTAUTH_URL}/auth/invite/${invite.token}`;
  return NextResponse.json({ inviteUrl, token: invite.token, expiresAt: invite.expiresAt });
}
