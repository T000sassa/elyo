import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const DEFAULT_PREFERENCES = {
  checkinReminder: true,
  checkinReminderTime: '09:00',
  weeklySummary: true,
  partnerUpdates: false,
}

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const prefs = await prisma.notificationPreference.findUnique({
    where: { userId: session.user.id },
  })

  return NextResponse.json({ preferences: prefs ?? { userId: session.user.id, ...DEFAULT_PREFERENCES } })
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { checkinReminder, checkinReminderTime, weeklySummary, partnerUpdates } = body

  const updateData: Record<string, unknown> = {}
  if (checkinReminder !== undefined) updateData.checkinReminder = Boolean(checkinReminder)
  if (checkinReminderTime !== undefined) updateData.checkinReminderTime = String(checkinReminderTime)
  if (weeklySummary !== undefined) updateData.weeklySummary = Boolean(weeklySummary)
  if (partnerUpdates !== undefined) updateData.partnerUpdates = Boolean(partnerUpdates)

  const preferences = await prisma.notificationPreference.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, ...DEFAULT_PREFERENCES, ...updateData },
    update: updateData,
  })

  return NextResponse.json({ preferences })
}
