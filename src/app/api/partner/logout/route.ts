import { NextResponse } from 'next/server'
import { PARTNER_SESSION_COOKIE } from '@/lib/partners/auth'

export async function POST() {
  const res = new NextResponse(null, { status: 204 })
  res.cookies.set(PARTNER_SESSION_COOKIE, '', { maxAge: 0, path: '/' })
  return res
}
