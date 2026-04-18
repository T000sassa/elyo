import { type NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'EMPLOYEE') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'no_file' }, { status: 400 })

  if (file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'invalid_file_type' }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'file_too_large' }, { status: 400 })
  }

  const blob = await put(file.name, file, { access: 'public' })

  const doc = await prisma.userDocument.create({
    data: {
      userId: session.user.id,
      fileName: file.name,
      blobUrl: blob.url,
      blobKey: blob.pathname,
      mimeType: file.type,
      size: file.size,
    },
  })

  return NextResponse.json({ data: doc })
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'EMPLOYEE') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const docs = await prisma.userDocument.findMany({
    where: { userId: session.user.id },
    orderBy: { uploadedAt: 'desc' },
  })

  return NextResponse.json({ data: docs })
}
