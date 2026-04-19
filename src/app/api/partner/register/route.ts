import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { PartnerRegisterSchema } from '@/lib/validations'
import { hashPartnerPassword } from '@/lib/partners/password'
import { signPartnerSession, PARTNER_SESSION_COOKIE, PARTNER_SESSION_TTL_SECONDS } from '@/lib/partners/auth'
import { rateLimit, getClientIP } from '@/lib/ratelimit'

export async function POST(req: NextRequest) {
  const ip = getClientIP(req.headers)
  if (!rateLimit(`partner-register:${ip}`, 3, 15 * 60 * 1000).allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }) }

  const parsed = PartnerRegisterSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'validation_error', issues: parsed.error.flatten() }, { status: 400 })
  }

  const { password, website, ...data } = parsed.data
  const passwordHash = await hashPartnerPassword(password)

  try {
    const partner = await prisma.partner.create({
      data: {
        ...data,
        website: website === '' ? null : website,
        passwordHash,
        verificationStatus: 'PENDING_DOCS',
      },
    })

    const token = signPartnerSession(partner.id)
    const res = NextResponse.json({ partnerId: partner.id }, { status: 201 })
    res.cookies.set(PARTNER_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: PARTNER_SESSION_TTL_SECONDS,
    })
    return res
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return NextResponse.json({ error: 'email_taken' }, { status: 409 })
    }
    console.error('partner register failed', err)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
