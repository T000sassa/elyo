import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PartnerLoginSchema } from '@/lib/validations'
import { verifyPartnerPassword } from '@/lib/partners/password'
import { signPartnerSession, PARTNER_SESSION_COOKIE, PARTNER_SESSION_TTL_SECONDS } from '@/lib/partners/auth'
import { rateLimit, getClientIP } from '@/lib/ratelimit'

export async function POST(req: NextRequest) {
  const ip = getClientIP(req.headers)
  if (!rateLimit(`partner-login:${ip}`, 5, 15 * 60 * 1000).allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }) }

  const parsed = PartnerLoginSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 })

  const partner = await prisma.partner.findUnique({ where: { email: parsed.data.email } })
  if (!partner) return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 })

  const valid = await verifyPartnerPassword(parsed.data.password, partner.passwordHash)
  if (!valid) return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 })

  if (partner.verificationStatus === 'REJECTED' || partner.verificationStatus === 'SUSPENDED') {
    return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 })
  }

  const token = signPartnerSession(partner.id)
  const res = NextResponse.json({ partnerId: partner.id, status: partner.verificationStatus })
  res.cookies.set(PARTNER_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: PARTNER_SESSION_TTL_SECONDS,
  })
  return res
}
