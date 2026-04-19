import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { saveSubscription, removeSubscription } from '@/lib/webPush'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  await saveSubscription(session.user.id, body)
  return NextResponse.json({ ok: true }, { status: 201 })
}

export async function DELETE(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  await removeSubscription(session.user.id, body.endpoint)
  return NextResponse.json({ ok: true })
}
