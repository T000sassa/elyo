import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AnamnesisSchema } from '@/lib/validations'
import { calcCompletionPct } from '@/lib/anamnesis'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await prisma.anamnesisProfile.findUnique({
    where: { userId: session.user.id },
  })

  return NextResponse.json({ data: profile ?? null })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = AnamnesisSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const existing = await prisma.anamnesisProfile.findUnique({
    where: { userId: session.user.id },
  })

  const merged = { ...(existing ?? {}), ...parsed.data }
  const completionPct = calcCompletionPct(merged)

  const profile = await prisma.anamnesisProfile.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      ...parsed.data,
      completionPct,
    },
    update: {
      ...parsed.data,
      completionPct,
    },
  })

  return NextResponse.json({ data: profile })
}
