import { type NextRequest, NextResponse } from 'next/server'
import { del } from '@vercel/blob'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'EMPLOYEE') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = params
  const doc = await prisma.userDocument.findUnique({ where: { id } })

  if (!doc || doc.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 })
  }

  try {
    await del(doc.blobKey)
    await prisma.userDocument.delete({ where: { id } })
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: 'delete_failed', detail }, { status: 502 })
  }

  return new NextResponse(null, { status: 204 })
}
