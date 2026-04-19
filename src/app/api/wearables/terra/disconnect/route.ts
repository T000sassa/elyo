import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decryptToken } from '@/lib/crypto'
import { isTerraEnabled } from '@/lib/terra/config'
import { deauthorizeTerraUser } from '@/lib/terra/client'

const VALID_PROVIDERS = ['OURA', 'GARMIN'] as const
type Provider = typeof VALID_PROVIDERS[number]

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'EMPLOYEE') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (!isTerraEnabled()) return NextResponse.json({ error: 'terra_disabled' }, { status: 503 })

  const providerParam = req.nextUrl.searchParams.get('provider')
  if (!providerParam || !(VALID_PROVIDERS as readonly string[]).includes(providerParam)) {
    return NextResponse.json({ error: 'invalid_provider' }, { status: 400 })
  }
  const source = (providerParam as Provider).toLowerCase()

  const conn = await prisma.wearableConnection.findUnique({
    where: { userId_source: { userId: session.user.id, source } },
  })
  if (!conn) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  // Fail-open: if Terra API call fails, still clear local connection
  if (conn.accessToken) {
    try {
      const terraUserId = decryptToken(conn.accessToken)
      await deauthorizeTerraUser(terraUserId)
    } catch (err) {
      console.warn('Terra deauth failed, proceeding with local disconnect', err)
    }
  }

  await prisma.wearableConnection.update({
    where: { userId_source: { userId: session.user.id, source } },
    data: { isActive: false, accessToken: null, refreshToken: null },
  })

  return NextResponse.json({ success: true })
}
