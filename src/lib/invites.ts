import crypto from "crypto";
import { prisma } from "./prisma";
import type { Role } from "@prisma/client";

export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function createInviteToken(
  companyId: string,
  options: {
    email?: string;
    role?: Role;
    teamId?: string;
    expiresInDays?: number;
  } = {}
) {
  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (options.expiresInDays ?? 7));

  return prisma.inviteToken.create({
    data: {
      token,
      companyId,
      email: options.email,
      role: options.role ?? "EMPLOYEE",
      teamId: options.teamId,
      expiresAt,
    },
  });
}

export async function verifyInviteToken(token: string) {
  const invite = await prisma.inviteToken.findUnique({
    where: { token },
    include: { company: { select: { id: true, name: true } } },
  });

  if (!invite) return { valid: false, error: "Einladungslink nicht gefunden" };
  if (invite.usedAt) return { valid: false, error: "Einladungslink bereits verwendet" };
  if (invite.expiresAt < new Date()) return { valid: false, error: "Einladungslink abgelaufen" };

  return { valid: true, invite };
}
