import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { fetchSteps, fetchSleepSessions, fetchHeartRateAvg } from '@/lib/googleHealth'

export async function POST() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const to = new Date()
  const from = new Date(to)
  from.setDate(from.getDate() - 7)

  await fetchSteps(session.user.id, from, to)
  await fetchSleepSessions(session.user.id, from, to)
  await fetchHeartRateAvg(session.user.id, from, to)

  return NextResponse.json({ data: { synced: true } })
}
