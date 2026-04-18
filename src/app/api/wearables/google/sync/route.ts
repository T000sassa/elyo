import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { fetchSteps, fetchSleepSessions, fetchHeartRateAvg } from '@/lib/googleHealth'

export async function POST() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'EMPLOYEE') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const to = new Date()
  const from = new Date(to)
  from.setDate(from.getDate() - 7)

  try {
    await fetchSteps(session.user.id, from, to)
    await fetchSleepSessions(session.user.id, from, to)
    await fetchHeartRateAvg(session.user.id, from, to)
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: 'sync_failed', detail }, { status: 502 })
  }

  return NextResponse.json({ data: { synced: true } })
}
