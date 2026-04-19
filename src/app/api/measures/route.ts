import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const createSchema = z.object({
  title: z.string().min(3).max(100),
  category: z.enum(['workshop', 'flexibility', 'sport', 'mental', 'nutrition']),
  description: z.string().min(10).max(500),
  teamId: z.string().optional(),
})

export async function GET(_req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'COMPANY_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const measures = await prisma.measure.findMany({
    where: { companyId: session.user.companyId },
    include: { team: { select: { name: true } } },
    orderBy: { suggestedAt: 'desc' },
  })

  return NextResponse.json({ measures })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'COMPANY_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'validation_error', details: parsed.error.flatten() }, { status: 400 })

  const measure = await prisma.measure.create({
    data: {
      companyId: session.user.companyId,
      teamId: parsed.data.teamId ?? null,
      title: parsed.data.title,
      category: parsed.data.category,
      description: parsed.data.description,
      status: 'ACTIVE',
      startedAt: new Date(),
      createdBy: session.user.id,
    },
  })

  return NextResponse.json({ measure }, { status: 201 })
}
