import { NextRequest, NextResponse } from "next/server";
import { verifyInviteToken } from "@/lib/invites";
import { rateLimit, getClientIP } from "@/lib/ratelimit";

export async function GET(req: NextRequest) {
  // Fix: Rate-Limiting gegen Token-Enumeration — max. 20 Verify-Checks pro IP pro 5 Minuten
  const ip = getClientIP(req.headers);
  const { allowed, resetAt } = rateLimit(`invite-verify:${ip}`, 20, 5 * 60_000);
  if (!allowed) {
    return NextResponse.json(
      { valid: false, error: "Zu viele Anfragen." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)) },
      }
    );
  }

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
