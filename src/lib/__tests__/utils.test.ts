import { describe, it, expect } from 'vitest'
import { cn } from '../utils'

describe('cn', () => {
  it('returns a single class unchanged', () => {
    expect(cn('px-2')).toBe('px-2')
  })

  it('merges multiple classes', () => {
    expect(cn('px-2', 'py-4')).toBe('px-2 py-4')
  })

  it('resolves Tailwind conflicts — last value wins', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })

  it('ignores undefined values', () => {
    expect(cn('px-2', undefined, 'py-4')).toBe('px-2 py-4')
  })

  it('ignores false values', () => {
    expect(cn('px-2', false, 'py-4')).toBe('px-2 py-4')
  })

  it('ignores null values', () => {
    expect(cn('px-2', null, 'py-4')).toBe('px-2 py-4')
  })

  it('returns empty string for empty input', () => {
    expect(cn()).toBe('')
  })
})
