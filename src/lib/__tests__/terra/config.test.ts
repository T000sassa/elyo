import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getTerraConfig, isTerraEnabled } from '../../terra/config'

describe('terra/config', () => {
  const original = {
    devId: process.env.TERRA_DEV_ID,
    apiKey: process.env.TERRA_API_KEY,
    webhookSecret: process.env.TERRA_WEBHOOK_SECRET,
  }

  beforeEach(() => {
    delete process.env.TERRA_DEV_ID
    delete process.env.TERRA_API_KEY
    delete process.env.TERRA_WEBHOOK_SECRET
  })

  afterEach(() => {
    process.env.TERRA_DEV_ID = original.devId
    process.env.TERRA_API_KEY = original.apiKey
    process.env.TERRA_WEBHOOK_SECRET = original.webhookSecret
  })

  it('getTerraConfig() returns config when all 3 vars set', () => {
    process.env.TERRA_DEV_ID = 'dev-123'
    process.env.TERRA_API_KEY = 'api-abc'
    process.env.TERRA_WEBHOOK_SECRET = 'whs-xyz'
    expect(getTerraConfig()).toEqual({ devId: 'dev-123', apiKey: 'api-abc', webhookSecret: 'whs-xyz' })
  })

  it('getTerraConfig() returns null when TERRA_DEV_ID missing', () => {
    process.env.TERRA_API_KEY = 'api-abc'
    process.env.TERRA_WEBHOOK_SECRET = 'whs-xyz'
    expect(getTerraConfig()).toBeNull()
  })

  it('getTerraConfig() returns null when TERRA_API_KEY missing', () => {
    process.env.TERRA_DEV_ID = 'dev-123'
    process.env.TERRA_WEBHOOK_SECRET = 'whs-xyz'
    expect(getTerraConfig()).toBeNull()
  })

  it('getTerraConfig() returns null when TERRA_WEBHOOK_SECRET missing', () => {
    process.env.TERRA_DEV_ID = 'dev-123'
    process.env.TERRA_API_KEY = 'api-abc'
    expect(getTerraConfig()).toBeNull()
  })

  it('isTerraEnabled() is true when config complete', () => {
    process.env.TERRA_DEV_ID = 'dev-123'
    process.env.TERRA_API_KEY = 'api-abc'
    process.env.TERRA_WEBHOOK_SECRET = 'whs-xyz'
    expect(isTerraEnabled()).toBe(true)
  })

  it('isTerraEnabled() is false when any var missing', () => {
    process.env.TERRA_DEV_ID = 'dev-123'
    expect(isTerraEnabled()).toBe(false)
  })
})
