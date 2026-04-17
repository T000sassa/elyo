import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const documents = await prisma.healthDocument.findMany({
    where: { userId: session.user.id },
    orderBy: { uploadedAt: 'desc' },
  })

  return NextResponse.json({ data: documents })
}

export async function POST() {
  return NextResponse.json(
    { error: 'Dokument-Upload ist in Phase 2 verfügbar.' },
    { status: 501 },
  )
}
