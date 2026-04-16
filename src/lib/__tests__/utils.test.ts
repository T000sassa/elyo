import { describe, it, expect } from 'vitest'
import { cn } from '../utils'

describe('cn', () => {
  it('gibt einzelne Klasse zurück', () => {
    expect(cn('px-2')).toBe('px-2')
  })

  it('führt mehrere Klassen zusammen', () => {
    expect(cn('px-2', 'py-4')).toBe('px-2 py-4')
  })

  it('löst Tailwind-Konflikte auf (letzter Wert gewinnt)', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })

  it('ignoriert undefined', () => {
    expect(cn('px-2', undefined, 'py-4')).toBe('px-2 py-4')
  })

  it('ignoriert false', () => {
    expect(cn('px-2', false, 'py-4')).toBe('px-2 py-4')
  })

  it('gibt leeren String bei leerem Input zurück', () => {
    expect(cn()).toBe('')
  })
})
