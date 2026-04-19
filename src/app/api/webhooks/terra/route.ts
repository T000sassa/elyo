import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { encryptToken, decryptToken } from '@/lib/crypto'
import { awardPoints } from '@/lib/points'
import { getTerraConfig } from '@/lib/terra/config'
import { verifySignature, parseWebhookEvent } from '@/lib/terra/webhook'
import { mapTerraToWearableSync } from '@/lib/terra/mapping'

function providerToSource(provider: string): 'oura' | 'garmin' | null {
  const lower = provider.toLowerCase()
  if (lower === 'oura' || lower === 'garmin') return lower
  return null
}

async function findConnectionByTerraUserId(terraUserId: string) {
  const candidates = await prisma.wearableConnection.findMany({
    where: { source: { in: ['oura', 'garmin'] }, isActive: true, accessToken: { not: null } },
  })
  for (const c of candidates) {
    if (!c.accessToken) continue
    try {
      if (decryptToken(c.accessToken) === terraUserId) return c
    } catch {
      // skip malformed
    }
  }
  return null
}

export async function POST(req: NextRequest) {
  const cfg = getTerraConfig()
  if (!cfg) return NextResponse.json({ error: 'terra_disabled' }, { status: 503 })

  const rawBody = await req.text()
  const signature = req.headers.get('terra-signature')
  if (!verifySignature(rawBody, signature, cfg.webhookSecret)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let parsedBody: unknown
  try {
    parsedBody = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ ok: true })
  }

  const event = parseWebhookEvent(parsedBody)

  try {
    if (event.type === 'auth') {
      const source = providerToSource(event.provider)
      if (!source) return NextResponse.json({ ok: true })

      await prisma.wearableConnection.upsert({
        where: { userId_source: { userId: event.userId, source } },
        create: {
          userId: event.userId,
          source,
          accessToken: encryptToken(event.terraUserId),
          isActive: true,
        },
        update: {
          accessToken: encryptToken(event.terraUserId),
          isActive: true,
        },
      })

      const already = await prisma.pointTransaction.findFirst({
        where: { userId: event.userId, reason: 'wearable_connected' },
      })
      if (!already) await awardPoints(event.userId, 'wearable_connected')
    }

    if (event.type === 'data') {
      const conn = await findConnectionByTerraUserId(event.terraUserId)
      if (!conn) return NextResponse.json({ ok: true })
      const source = conn.source as 'oura' | 'garmin'

      const entries = mapTerraToWearableSync(event, source)
      for (const entry of entries) {
        await prisma.wearableSync.upsert({
          where: { userId_source_date: { userId: conn.userId, source, date: entry.date } },
          create: { userId: conn.userId, source, ...entry },
          update: { ...entry },
        })
      }
    }

    if (event.type === 'deauth') {
      const conn = await findConnectionByTerraUserId(event.terraUserId)
      if (conn) {
        await prisma.wearableConnection.update({
          where: { id: conn.id },
          data: { isActive: false, accessToken: null, refreshToken: null },
        })
      }
    }
  } catch (err) {
    console.error('Terra webhook processing error', err)
    // Return 200 so Terra does not retry on application-level errors
  }

  return NextResponse.json({ ok: true })
}
