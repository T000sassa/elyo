import { createHmac, timingSafeEqual } from 'crypto'

export function verifySignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): boolean {
  if (!signatureHeader) return false
  if (!/^[0-9a-f]+$/i.test(signatureHeader)) return false

  const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
  const a = Buffer.from(signatureHeader, 'hex')
  const b = Buffer.from(expected, 'hex')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export type TerraDataType = 'activity' | 'sleep' | 'body' | 'daily'

export type TerraEvent =
  | { type: 'auth'; userId: string; terraUserId: string; provider: string }
  | { type: 'deauth'; terraUserId: string }
  | { type: 'data'; terraUserId: string; dataType: TerraDataType; payload: unknown }
  | { type: 'unsupported' }

const DATA_TYPES: TerraDataType[] = ['activity', 'sleep', 'body', 'daily']

export function parseWebhookEvent(body: unknown): TerraEvent {
  if (!body || typeof body !== 'object') return { type: 'unsupported' }
  const b = body as Record<string, unknown>
  const type = typeof b.type === 'string' ? b.type : null
  const user = (typeof b.user === 'object' && b.user !== null) ? b.user as Record<string, unknown> : null
  const terraUserId = typeof user?.user_id === 'string' ? user.user_id : null

  if (type === 'auth') {
    const referenceId = typeof user?.reference_id === 'string' ? user.reference_id : null
    const provider = typeof user?.provider === 'string' ? user.provider : null
    if (!referenceId || !terraUserId || !provider) return { type: 'unsupported' }
    return { type: 'auth', userId: referenceId, terraUserId, provider }
  }

  if (type === 'deauth') {
    if (!terraUserId) return { type: 'unsupported' }
    return { type: 'deauth', terraUserId }
  }

  if (type && (DATA_TYPES as string[]).includes(type)) {
    if (!terraUserId) return { type: 'unsupported' }
    return { type: 'data', terraUserId, dataType: type as TerraDataType, payload: body }
  }

  return { type: 'unsupported' }
}
