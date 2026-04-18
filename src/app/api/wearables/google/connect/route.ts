import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getAuthUrl } from '@/lib/googleHealth'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = getAuthUrl(session.user.id)
  return NextResponse.redirect(url)
}
