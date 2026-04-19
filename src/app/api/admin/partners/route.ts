import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireElyoAdmin, HttpError } from '@/lib/admin-auth'

const VALID_STATUS = ['PENDING_DOCS', 'PENDING_REVIEW', 'VERIFIED', 'SUSPENDED', 'REJECTED'] as const

export async function GET(req: NextRequest) {
  try {
    await requireElyoAdmin()
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.code }, { status: err.status })
    throw err
  }

  const statusParam = req.nextUrl.searchParams.get('status')
  const cursor = req.nextUrl.searchParams.get('cursor')
  const take = 50

  const where = statusParam && (VALID_STATUS as readonly string[]).includes(statusParam)
    ? { verificationStatus: statusParam as (typeof VALID_STATUS)[number] }
    : {}

  const partners = await prisma.partner.findMany({
    where,
    orderBy: [{ verificationStatus: 'asc' }, { createdAt: 'desc' }],
    take: take + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    select: {
      id: true, name: true, type: true, email: true, city: true, categories: true,
      verificationStatus: true, nachweisUrl: true, createdAt: true,
    },
  })

  const nextCursor = partners.length > take ? partners[take - 1].id : null
  return NextResponse.json({ partners: partners.slice(0, take), nextCursor })
}
