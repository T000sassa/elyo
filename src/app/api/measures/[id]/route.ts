import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const patchSchema = z.object({
  status: z.enum(['ACTIVE', 'COMPLETED', 'DISMISSED']),
})

const VALID_TRANSITIONS: Record<string, string[]> = {
  SUGGESTED: ['ACTIVE', 'DISMISSED'],
  ACTIVE: ['COMPLETED', 'DISMISSED'],
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'COMPANY_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const measure = await prisma.measure.findUnique({ where: { id } })
  if (!measure) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (measure.companyId !== session.user.companyId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'validation_error' }, { status: 400 })

  const allowed = VALID_TRANSITIONS[measure.status] ?? []
  if (!allowed.includes(parsed.data.status)) {
    return NextResponse.json({ error: 'invalid_transition' }, { status: 400 })
  }

  const updateData: Record<string, unknown> = { status: parsed.data.status }
  if (parsed.data.status === 'ACTIVE') updateData.startedAt = new Date()
  if (parsed.data.status === 'COMPLETED') updateData.completedAt = new Date()

  const updated = await prisma.measure.update({ where: { id }, data: updateData })
  return NextResponse.json({ measure: updated })
}
