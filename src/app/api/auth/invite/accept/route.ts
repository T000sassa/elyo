import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyInviteToken } from "@/lib/invites";
import bcrypt from "bcryptjs";
import { z } from "zod";

const AcceptSchema = z.object({
  token: z.string(),
  name: z.string().min(2),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = AcceptSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingabe." }, { status: 400 });
  }

  const { token, name, password } = parsed.data;
  const result = await verifyInviteToken(token);
  if (!result.valid) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const invite = result.invite!;
  const email = invite.email ?? body.email;
  if (!email) {
    return NextResponse.json({ error: "E-Mail fehlt." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "E-Mail bereits registriert." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.$transaction([
    prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        role: invite.role,
        companyId: invite.companyId,
        teamId: invite.teamId ?? undefined,
      },
    }),
    prisma.inviteToken.update({
      where: { token },
      data: { usedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ success: true });
}
