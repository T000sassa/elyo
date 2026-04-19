import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPartnerSession, PARTNER_SESSION_COOKIE } from '@/lib/partners/auth'

export async function GET(req: NextRequest) {
  const token = req.cookies.get(PARTNER_SESSION_COOKIE)?.value
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const session = verifyPartnerSession(token)
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const partner = await prisma.partner.findUnique({ where: { id: session.partnerId } })
  if (!partner || partner.verificationStatus === 'REJECTED') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { passwordHash, ...safe } = partner
  void passwordHash
  return NextResponse.json({ partner: safe })
}
