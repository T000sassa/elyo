import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createInviteToken } from '@/lib/invites'
import { sendInviteEmail } from '@/lib/email'
import { BulkInviteSchema } from '@/lib/validations'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = BulkInviteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const company = await prisma.company.findUnique({
    where: { id: session.user.companyId },
    select: { id: true, name: true },
  })
  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
  let sent = 0
  const failed: string[] = []

  for (const email of parsed.data.emails) {
    try {
      const existing = await prisma.user.findUnique({ where: { email } })
      if (existing) { failed.push(email); continue }

      const invite = await createInviteToken(company.id, {
        email,
        role: 'EMPLOYEE',
        expiresInDays: 14,
      })
      const inviteUrl = `${baseUrl}/auth/invite/${invite.token}`
      const ok = await sendInviteEmail({ to: email, companyName: company.name, inviteUrl })
      if (ok) sent++
      else failed.push(email)
    } catch {
      failed.push(email)
    }
  }

  return NextResponse.json({ sent, failed })
}
