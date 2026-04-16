import { describe, it, expect, vi, afterEach } from 'vitest'
import { rateLimit, getClientIP } from '../ratelimit'

// Unique key generator prevents interference between tests
// (ratelimit uses a module-level Map that persists between tests in the same file)
let keyCounter = 0
const nextKey = () => `test-key-${++keyCounter}`

describe('rateLimit', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('allows first request and returns correct remaining count', () => {
    const result = rateLimit(nextKey(), 5, 60_000)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(4)
  })

  it('blocks requests over the limit', () => {
    const key = nextKey()
    for (let i = 0; i < 3; i++) rateLimit(key, 3, 60_000)
    const result = rateLimit(key, 3, 60_000)
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it('resets counter after window expires', () => {
    vi.useFakeTimers()
    const key = nextKey()
    for (let i = 0; i < 3; i++) rateLimit(key, 3, 60_000)
    expect(rateLimit(key, 3, 60_000).allowed).toBe(false)
    vi.advanceTimersByTime(61_000)
    const result = rateLimit(key, 3, 60_000)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(2)
  })

  it('resetAt is in the future', () => {
    const before = Date.now()
    const result = rateLimit(nextKey(), 5, 60_000)
    expect(result.resetAt).toBeGreaterThan(before)
  })
})

describe('getClientIP', () => {
  it('returns first IP from x-forwarded-for', () => {
    const headers = new Headers({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' })
    expect(getClientIP(headers)).toBe('1.2.3.4')
  })

  it('falls back to x-real-ip when x-forwarded-for is absent', () => {
    const headers = new Headers({ 'x-real-ip': '9.10.11.12' })
    expect(getClientIP(headers)).toBe('9.10.11.12')
  })

  it('returns "unknown" when no IP header is set', () => {
    const headers = new Headers()
    expect(getClientIP(headers)).toBe('unknown')
  })
})
