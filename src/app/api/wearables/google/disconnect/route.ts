import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { disconnectUser } from '@/lib/googleHealth'

export async function DELETE() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await disconnectUser(session.user.id)
  return new NextResponse(null, { status: 204 })
}
