import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'
import { requireElyoAdmin } from '../admin-auth'

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

import { auth } from '@/lib/auth'

describe('requireElyoAdmin', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns session for ELYO_ADMIN', async () => {
    const session = { user: { id: 'u1', role: 'ELYO_ADMIN', email: 'admin@elyo.de', companyId: '' } }
    ;(auth as ReturnType<typeof vi.fn>).mockResolvedValue(session)
    const result = await requireElyoAdmin()
    expect(result).toEqual(session)
  })

  it('throws 403 for EMPLOYEE', async () => {
    ;(auth as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: 'u1', role: 'EMPLOYEE', email: 'e@x.de', companyId: 'c1' },
    })
    await expect(requireElyoAdmin()).rejects.toThrow(/forbidden/)
  })

  it('throws 403 for COMPANY_ADMIN', async () => {
    ;(auth as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: 'u1', role: 'COMPANY_ADMIN', email: 'a@x.de', companyId: 'c1' },
    })
    await expect(requireElyoAdmin()).rejects.toThrow(/forbidden/)
  })

  it('throws 401 for no session', async () => {
    ;(auth as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    await expect(requireElyoAdmin()).rejects.toThrow(/unauthorized/)
  })
})
