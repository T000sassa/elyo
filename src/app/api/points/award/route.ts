import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { awardPoints, POINT_RULES, type PointReason } from '@/lib/points'
import { z } from 'zod'

const AwardSchema = z.object({
  reason: z.enum(Object.keys(POINT_RULES) as [PointReason, ...PointReason[]]),
  userId: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = AwardSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const targetUserId =
    parsed.data.userId && session.user.role !== 'EMPLOYEE'
      ? parsed.data.userId
      : session.user.id

  const result = await awardPoints(targetUserId, parsed.data.reason)
  return NextResponse.json({ data: result })
}
