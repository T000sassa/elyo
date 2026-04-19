import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireElyoAdmin, HttpError } from '@/lib/admin-auth'
import { AdminPartnerActionSchema } from '@/lib/validations'
import {
  sendPartnerApprovedEmail,
  sendPartnerRejectedEmail,
  sendPartnerSuspendedEmail,
} from '@/lib/email'

type Status = 'PENDING_DOCS' | 'PENDING_REVIEW' | 'VERIFIED' | 'SUSPENDED' | 'REJECTED'

const TRANSITIONS: Record<string, { from: Status[]; to: Status }> = {
  approve:   { from: ['PENDING_REVIEW'], to: 'VERIFIED' },
  reject:    { from: ['PENDING_REVIEW'], to: 'REJECTED' },
  suspend:   { from: ['VERIFIED'],        to: 'SUSPENDED' },
  unsuspend: { from: ['SUSPENDED'],       to: 'VERIFIED' },
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let session
  try {
    session = await requireElyoAdmin()
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.code }, { status: err.status })
    throw err
  }

  const { id } = await params
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }) }

  const parsed = AdminPartnerActionSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'validation_error', issues: parsed.error.flatten() }, { status: 400 })

  const partner = await prisma.partner.findUnique({ where: { id } })
  if (!partner) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const transition = TRANSITIONS[parsed.data.action]
  if (!transition.from.includes(partner.verificationStatus as Status)) {
    return NextResponse.json({ error: 'invalid_transition' }, { status: 400 })
  }

  const updated = await prisma.partner.update({
    where: { id },
    data: {
      verificationStatus: transition.to,
      reviewedAt: new Date(),
      reviewedById: session.user.id,
      rejectionReason: parsed.data.action === 'reject' ? parsed.data.rejectionReason : null,
    },
  })

  let warning: string | undefined
  try {
    if (parsed.data.action === 'approve')        await sendPartnerApprovedEmail(updated)
    else if (parsed.data.action === 'reject')    await sendPartnerRejectedEmail(updated, parsed.data.rejectionReason!)
    else if (parsed.data.action === 'suspend')   await sendPartnerSuspendedEmail(updated)
  } catch (err) {
    console.error('partner email send failed', err)
    warning = 'email_send_failed'
  }

  return NextResponse.json({ partner: updated, ...(warning ? { warning } : {}) })
}
