import { NextRequest, NextResponse } from 'next/server'
import { put, del } from '@vercel/blob'
import { prisma } from '@/lib/prisma'
import { verifyPartnerSession, PARTNER_SESSION_COOKIE } from '@/lib/partners/auth'

const MAX_SIZE = 5 * 1024 * 1024
const ALLOWED_MIME = new Set(['application/pdf', 'image/png', 'image/jpeg'])

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const token = req.cookies.get(PARTNER_SESSION_COOKIE)?.value
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const session = verifyPartnerSession(token)
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const partner = await prisma.partner.findUnique({ where: { id: session.partnerId } })
  if (!partner || partner.verificationStatus === 'REJECTED') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'no_file' }, { status: 400 })

  if (!ALLOWED_MIME.has(file.type)) return NextResponse.json({ error: 'invalid_file' }, { status: 400 })
  if (file.size > MAX_SIZE) return NextResponse.json({ error: 'too_large' }, { status: 413 })

  const extMatch = file.name.match(/\.(pdf|png|jpe?g)$/i)
  const ext = extMatch ? extMatch[0] : ''

  const previousNachweisUrl = partner.nachweisUrl

  let blob: Awaited<ReturnType<typeof put>> | null = null
  try {
    blob = await put(
      `partners/${partner.id}/nachweis-${Date.now()}${ext}`,
      file,
      { access: 'public' },
    )

    await prisma.partner.update({
      where: { id: partner.id },
      data: {
        nachweisUrl: blob.url,
        verificationStatus: partner.verificationStatus === 'PENDING_DOCS' ? 'PENDING_REVIEW' : partner.verificationStatus,
      },
    })
  } catch (err) {
    // Roll back the new blob if write succeeded but DB update failed
    if (blob) await del(blob.url).catch(() => {})
    console.error('partner nachweis upload failed', err)
    return NextResponse.json({ error: 'storage_failed' }, { status: 502 })
  }

  // Success path: delete old blob (best-effort, never blocks response)
  if (previousNachweisUrl) {
    try {
      await del(previousNachweisUrl)
    } catch (err) {
      console.warn('partner documents: old blob delete failed', err)
    }
  }

  return NextResponse.json({ nachweisUrl: blob.url })
}
