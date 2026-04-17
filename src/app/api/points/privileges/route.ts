import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getPrivileges, type Level } from '@/lib/points'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const up = await prisma.userPoints.findUnique({
    where: { userId: session.user.id },
  })

  const level = (up?.level ?? 'STARTER') as Level
  const privileges = getPrivileges(level)

  return NextResponse.json({ data: privileges })
}
