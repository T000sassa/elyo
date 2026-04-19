import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { generateWidgetUrl, deauthorizeTerraUser } from '../../terra/client'

describe('terra/client', () => {
  const original = {
    devId: process.env.TERRA_DEV_ID,
    apiKey: process.env.TERRA_API_KEY,
    webhookSecret: process.env.TERRA_WEBHOOK_SECRET,
    baseUrl: process.env.NEXTAUTH_URL,
  }

  beforeEach(() => {
    process.env.TERRA_DEV_ID = 'dev-test'
    process.env.TERRA_API_KEY = 'api-test'
    process.env.TERRA_WEBHOOK_SECRET = 'whs-test'
    process.env.NEXTAUTH_URL = 'https://elyo.test'
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    process.env.TERRA_DEV_ID = original.devId
    process.env.TERRA_API_KEY = original.apiKey
    process.env.TERRA_WEBHOOK_SECRET = original.webhookSecret
    process.env.NEXTAUTH_URL = original.baseUrl
    vi.unstubAllGlobals()
  })

  describe('generateWidgetUrl', () => {
    it('calls Terra auth endpoint with correct headers + body and returns widget URL', async () => {
      const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ url: 'https://widget.tryterra.co/session/abc123' }),
      })

      const url = await generateWidgetUrl('user-xyz', 'OURA')
      expect(url).toBe('https://widget.tryterra.co/session/abc123')

      expect(fetchMock).toHaveBeenCalledTimes(1)
      const [calledUrl, init] = fetchMock.mock.calls[0]
      expect(calledUrl).toBe('https://api.tryterra.co/v2/auth/generateWidgetSession')
      expect(init.method).toBe('POST')
      expect(init.headers['dev-id']).toBe('dev-test')
      expect(init.headers['x-api-key']).toBe('api-test')
      expect(init.headers['Content-Type']).toBe('application/json')

      const body = JSON.parse(init.body as string)
      expect(body.reference_id).toBe('user-xyz')
      expect(body.providers).toEqual(['OURA'])
      expect(body.auth_success_redirect_url).toBe('https://elyo.test/profile/data-sources?connected=oura')
      expect(body.auth_failure_redirect_url).toBe('https://elyo.test/profile/data-sources?error=terra')
    })

    it('throws on non-2xx response', async () => {
      const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>
      fetchMock.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })

      await expect(generateWidgetUrl('user-xyz', 'OURA')).rejects.toThrow(/terra_widget_failed/)
    })

    it('throws when Terra not configured', async () => {
      delete process.env.TERRA_DEV_ID
      await expect(generateWidgetUrl('user-xyz', 'OURA')).rejects.toThrow(/not configured/)
    })
  })

  describe('deauthorizeTerraUser', () => {
    it('calls Terra deauth endpoint with DELETE + user_id', async () => {
      const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>
      fetchMock.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) })

      await deauthorizeTerraUser('terra-user-123')

      const [calledUrl, init] = fetchMock.mock.calls[0]
      expect(calledUrl).toBe('https://api.tryterra.co/v2/auth/deauthenticateUser?user_id=terra-user-123')
      expect(init.method).toBe('DELETE')
      expect(init.headers['dev-id']).toBe('dev-test')
      expect(init.headers['x-api-key']).toBe('api-test')
    })

    it('throws on non-2xx response', async () => {
      const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>
      fetchMock.mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({}) })
      await expect(deauthorizeTerraUser('terra-user-123')).rejects.toThrow(/terra_deauth_failed/)
    })
  })
})
