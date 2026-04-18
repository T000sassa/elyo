import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { disconnectUser } from '@/lib/googleHealth'

export async function DELETE() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'EMPLOYEE') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await disconnectUser(session.user.id)
  return new NextResponse(null, { status: 204 })
}
