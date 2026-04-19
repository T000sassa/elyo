import { describe, it, expect } from 'vitest'
import { createHmac } from 'crypto'
import { verifySignature, parseWebhookEvent } from '../../terra/webhook'
import authFixture from './fixtures/auth-event.json'
import deauthFixture from './fixtures/deauth-event.json'
import activityFixture from './fixtures/activity-data.json'
import sleepFixture from './fixtures/sleep-data.json'
import dailyFixture from './fixtures/daily-data.json'
import unknownFixture from './fixtures/unknown-event.json'

const SECRET = 'test-webhook-secret'

function signBody(body: string, secret: string = SECRET): string {
  return createHmac('sha256', secret).update(body).digest('hex')
}

describe('terra/webhook — verifySignature', () => {
  it('returns true for correctly signed body', () => {
    const body = '{"type":"auth","user":{"reference_id":"u123"}}'
    const sig = signBody(body)
    expect(verifySignature(body, sig, SECRET)).toBe(true)
  })

  it('returns false for modified body', () => {
    const body = '{"type":"auth"}'
    const sig = signBody(body)
    expect(verifySignature('{"type":"deauth"}', sig, SECRET)).toBe(false)
  })

  it('returns false for signature made with different secret', () => {
    const body = '{"type":"auth"}'
    const sig = signBody(body, 'different-secret')
    expect(verifySignature(body, sig, SECRET)).toBe(false)
  })

  it('returns false for null signature header', () => {
    const body = '{"type":"auth"}'
    expect(verifySignature(body, null, SECRET)).toBe(false)
  })

  it('returns false for empty signature header', () => {
    const body = '{"type":"auth"}'
    expect(verifySignature(body, '', SECRET)).toBe(false)
  })

  it('returns false for malformed hex signature', () => {
    const body = '{"type":"auth"}'
    expect(verifySignature(body, 'not-hex-XYZ', SECRET)).toBe(false)
  })
})

describe('terra/webhook — parseWebhookEvent', () => {
  it('auth fixture → discriminant "auth" with userId, terraUserId, provider', () => {
    const event = parseWebhookEvent(authFixture)
    expect(event).toEqual({
      type: 'auth',
      userId: 'user-cuid-xyz',
      terraUserId: 'terra-user-abc-123',
      provider: 'OURA',
    })
  })

  it('deauth fixture → discriminant "deauth" with terraUserId', () => {
    const event = parseWebhookEvent(deauthFixture)
    expect(event).toEqual({
      type: 'deauth',
      terraUserId: 'terra-user-abc-123',
    })
  })

  it('activity fixture → discriminant "data" with dataType "activity"', () => {
    const event = parseWebhookEvent(activityFixture)
    expect(event.type).toBe('data')
    if (event.type === 'data') {
      expect(event.dataType).toBe('activity')
      expect(event.terraUserId).toBe('terra-user-abc-123')
      expect(event.payload).toBeTruthy()
    }
  })

  it('sleep fixture → discriminant "data" with dataType "sleep"', () => {
    const event = parseWebhookEvent(sleepFixture)
    expect(event.type).toBe('data')
    if (event.type === 'data') expect(event.dataType).toBe('sleep')
  })

  it('daily fixture → discriminant "data" with dataType "daily"', () => {
    const event = parseWebhookEvent(dailyFixture)
    expect(event.type).toBe('data')
    if (event.type === 'data') expect(event.dataType).toBe('daily')
  })

  it('unknown event type → discriminant "unsupported"', () => {
    const event = parseWebhookEvent(unknownFixture)
    expect(event).toEqual({ type: 'unsupported' })
  })

  it('malformed body (no type field) → discriminant "unsupported"', () => {
    expect(parseWebhookEvent({ foo: 'bar' })).toEqual({ type: 'unsupported' })
  })

  it('null body → discriminant "unsupported"', () => {
    expect(parseWebhookEvent(null)).toEqual({ type: 'unsupported' })
  })
})
