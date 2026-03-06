import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyInviteToken } from "@/lib/invites";
import { rateLimit, getClientIP } from "@/lib/ratelimit";
import bcrypt from "bcryptjs";
import { z } from "zod";

const AcceptSchema = z.object({
  token: z.string(),
  name: z.string().min(2),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  // Fix: Rate-Limiting — max. 10 Invite-Akzeptierungen pro IP pro 15 Minuten
  const ip = getClientIP(req.headers);
  const { allowed, resetAt } = rateLimit(`invite-accept:${ip}`, 10, 15 * 60_000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Zu viele Anfragen. Bitte versuchen Sie es später erneut." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)) },
      }
    );
  }

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

  // Fix: E-Mail muss im Invite hinterlegt sein — nie aus dem Request-Body übernehmen
  if (!invite.email) {
    return NextResponse.json({ error: "Ungültiger Invite-Token." }, { status: 400 });
  }
  const email = invite.email;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "E-Mail bereits registriert." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    await prisma.$transaction(async (tx) => {
      // Fix: Atomischer Token-Check — updateMany mit where: { usedAt: null }
      // Verhindert Race Condition: zweiter paralleler Request bekommt count=0 und schlägt fehl
      const marked = await tx.inviteToken.updateMany({
        where: { token, usedAt: null },
        data: { usedAt: new Date() },
      });

      if (marked.count === 0) {
        throw new Error("TOKEN_ALREADY_USED");
      }

      await tx.user.create({
        data: {
          email,
          name,
          passwordHash,
          role: invite.role,
          companyId: invite.companyId,
          teamId: invite.teamId ?? undefined,
        },
      });
    });
  } catch (err) {
    if (err instanceof Error && err.message === "TOKEN_ALREADY_USED") {
      return NextResponse.json({ error: "Einladung wurde bereits verwendet." }, { status: 409 });
    }
    throw err;
  }

  return NextResponse.json({ success: true });
}
