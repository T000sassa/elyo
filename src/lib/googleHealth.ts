import { createHmac } from 'crypto'
import { encryptToken, decryptToken } from './crypto'
import { awardPoints } from './points'
import { prisma } from './prisma'

const GOOGLE_TOKEN_URL   = 'https://oauth2.googleapis.com/token'
const GOOGLE_FITNESS_URL = 'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate'
const SCOPES = [
  'https://www.googleapis.com/auth/fitness.activity.read',
  'https://www.googleapis.com/auth/fitness.sleep.read',
  'https://www.googleapis.com/auth/fitness.heart_rate.read',
]

function getHmacSecret(): string {
  const s = process.env.OAUTH_HMAC_SECRET
  if (!s) throw new Error('OAUTH_HMAC_SECRET environment variable is not set')
  return s
}

function buildState(userId: string): string {
  const hmac = createHmac('sha256', getHmacSecret()).update(userId).digest('hex')
  return Buffer.from(`${userId}.${hmac}`).toString('base64url')
}

function parseState(state: string): string {
  let decoded: string
  try {
    decoded = Buffer.from(state, 'base64url').toString('utf8')
  } catch {
    throw new Error('Invalid OAuth state format')
  }
  const dotIdx = decoded.lastIndexOf('.')
  if (dotIdx === -1) throw new Error('Invalid OAuth state format')
  const userId       = decoded.slice(0, dotIdx)
  const providedHmac = decoded.slice(dotIdx + 1)
  const expectedHmac = createHmac('sha256', getHmacSecret()).update(userId).digest('hex')
  if (providedHmac !== expectedHmac) throw new Error('Invalid OAuth state signature')
  return userId
}

export function getAuthUrl(userId: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) throw new Error('GOOGLE_CLIENT_ID environment variable is not set')
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/wearables/google/callback`
  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  redirectUri,
    response_type: 'code',
    scope:         SCOPES.join(' '),
    access_type:   'offline',
    prompt:        'consent',
    state:         buildState(userId),
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

export async function exchangeCode(code: string, state: string): Promise<void> {
  const userId       = parseState(state)
  const clientId     = process.env.GOOGLE_CLIENT_ID!
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!
  const redirectUri  = `${process.env.NEXTAUTH_URL}/api/wearables/google/callback`

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
  })
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`)
  const data = await res.json() as { access_token: string; refresh_token: string; expires_in: number }

  const expiresAt = new Date(Date.now() + data.expires_in * 1000)
  await prisma.wearableConnection.upsert({
    where:  { userId_source: { userId, source: 'google_health' } },
    create: { userId, source: 'google_health', accessToken: encryptToken(data.access_token), refreshToken: encryptToken(data.refresh_token), expiresAt, isActive: true },
    update: { accessToken: encryptToken(data.access_token), refreshToken: data.refresh_token ? encryptToken(data.refresh_token) : undefined, expiresAt, isActive: true },
  })

  const alreadyAwarded = await prisma.pointTransaction.findFirst({ where: { userId, reason: 'wearable_connected' } })
  if (!alreadyAwarded) await awardPoints(userId, 'wearable_connected')
}

export async function refreshAccessTokenIfNeeded(userId: string): Promise<void> {
  const conn = await prisma.wearableConnection.findUnique({ where: { userId_source: { userId, source: 'google_health' } } })
  if (!conn || !conn.isActive || !conn.refreshToken || !conn.expiresAt) return

  const fiveMinFromNow = new Date(Date.now() + 5 * 60 * 1000)
  if (conn.expiresAt > fiveMinFromNow) return

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({ refresh_token: decryptToken(conn.refreshToken), client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, grant_type: 'refresh_token' }),
  })
  if (!res.ok) {
    await prisma.wearableConnection.update({ where: { userId_source: { userId, source: 'google_health' } }, data: { isActive: false } })
    throw new Error(`Token refresh failed: ${res.status}`)
  }
  const data = await res.json() as { access_token: string; expires_in: number }
  await prisma.wearableConnection.update({
    where: { userId_source: { userId, source: 'google_health' } },
    data:  { accessToken: encryptToken(data.access_token), expiresAt: new Date(Date.now() + data.expires_in * 1000) },
  })
}

async function getActiveToken(userId: string): Promise<string> {
  await refreshAccessTokenIfNeeded(userId)
  const conn = await prisma.wearableConnection.findUnique({ where: { userId_source: { userId, source: 'google_health' } } })
  if (!conn || !conn.isActive || !conn.accessToken) throw new Error('No active Google Health connection')
  return decryptToken(conn.accessToken)
}

export async function fetchSteps(userId: string, from: Date, to: Date): Promise<void> {
  const token = await getActiveToken(userId)
  const res = await fetch(GOOGLE_FITNESS_URL, {
    method:  'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ aggregateBy: [{ dataTypeName: 'com.google.step_count.delta' }], bucketByTime: { durationMillis: 86400000 }, startTimeMillis: from.getTime(), endTimeMillis: to.getTime() }),
  })
  if (!res.ok) throw new Error(`fetchSteps failed: ${res.status}`)
  const data = await res.json() as { bucket: Array<{ startTimeMillis: string; dataset: Array<{ point: Array<{ value: Array<{ intVal?: number }> }> }> }> }

  for (const bucket of data.bucket) {
    const date  = new Date(Number(bucket.startTimeMillis))
    date.setHours(0, 0, 0, 0)
    const steps = bucket.dataset[0]?.point[0]?.value[0]?.intVal ?? null
    if (steps === null) continue
    await prisma.wearableSync.upsert({ where: { userId_source_date: { userId, source: 'google_health', date } }, create: { userId, source: 'google_health', date, steps }, update: { steps } })
  }
}

export async function fetchSleepSessions(userId: string, from: Date, to: Date): Promise<void> {
  const token = await getActiveToken(userId)
  const res = await fetch(GOOGLE_FITNESS_URL, {
    method:  'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ aggregateBy: [{ dataTypeName: 'com.google.sleep.segment' }], bucketByTime: { durationMillis: 86400000 }, startTimeMillis: from.getTime(), endTimeMillis: to.getTime() }),
  })
  if (!res.ok) throw new Error(`fetchSleepSessions failed: ${res.status}`)
  const data = await res.json() as { bucket: Array<{ startTimeMillis: string; dataset: Array<{ point: Array<{ startTimeNanos: string; endTimeNanos: string }> }> }> }

  for (const bucket of data.bucket) {
    const date   = new Date(Number(bucket.startTimeMillis))
    date.setHours(0, 0, 0, 0)
    const points = bucket.dataset[0]?.point ?? []
    if (points.length === 0) continue
    const totalMs    = points.reduce((sum, p) => sum + (Number(p.endTimeNanos) - Number(p.startTimeNanos)) / 1_000_000, 0)
    const sleepHours = Math.round((totalMs / 3_600_000) * 10) / 10
    await prisma.wearableSync.upsert({ where: { userId_source_date: { userId, source: 'google_health', date } }, create: { userId, source: 'google_health', date, sleepHours }, update: { sleepHours } })
  }
}

export async function fetchHeartRateAvg(userId: string, from: Date, to: Date): Promise<void> {
  const token = await getActiveToken(userId)
  const res = await fetch(GOOGLE_FITNESS_URL, {
    method:  'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ aggregateBy: [{ dataTypeName: 'com.google.heart_rate.bpm' }], bucketByTime: { durationMillis: 86400000 }, startTimeMillis: from.getTime(), endTimeMillis: to.getTime() }),
  })
  if (!res.ok) throw new Error(`fetchHeartRateAvg failed: ${res.status}`)
  const data = await res.json() as { bucket: Array<{ startTimeMillis: string; dataset: Array<{ point: Array<{ value: Array<{ fpVal?: number }> }> }> }> }

  for (const bucket of data.bucket) {
    const date      = new Date(Number(bucket.startTimeMillis))
    date.setHours(0, 0, 0, 0)
    const heartRate = bucket.dataset[0]?.point[0]?.value[0]?.fpVal ?? null
    if (heartRate === null) continue
    await prisma.wearableSync.upsert({ where: { userId_source_date: { userId, source: 'google_health', date } }, create: { userId, source: 'google_health', date, heartRate }, update: { heartRate } })
  }
}

export async function disconnectUser(userId: string): Promise<void> {
  await prisma.wearableConnection.updateMany({
    where: { userId, source: 'google_health' },
    data:  { isActive: false, accessToken: null, refreshToken: null },
  })
}
