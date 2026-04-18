import { NextResponse } from 'next/server'
import { put, del } from '@vercel/blob'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

export async function POST(req: Request) {
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

  let blob: Awaited<ReturnType<typeof put>> | null = null
  try {
    blob = await put(`documents/${session.user.id}/${Date.now()}-${file.name}`, file, { access: 'public' })
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
  } catch (err) {
    if (blob) await del(blob.pathname).catch(() => {})
    const detail = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: 'upload_failed', detail }, { status: 502 })
  }
}

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'EMPLOYEE') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const docs = await prisma.userDocument.findMany({
    where: { userId: session.user.id },
    orderBy: { uploadedAt: 'desc' },
  })

  return NextResponse.json({ data: docs })
}
