import { NextRequest, NextResponse } from 'next/server'
import { PARTNER_SESSION_COOKIE } from '@/lib/partners/auth'

export async function POST(req: NextRequest) {
  const res = NextResponse.redirect(new URL('/partner/login', req.url), { status: 303 })
  res.cookies.set(PARTNER_SESSION_COOKIE, '', { maxAge: 0, path: '/' })
  return res
}
