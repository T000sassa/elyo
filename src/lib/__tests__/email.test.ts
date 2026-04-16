import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// vi.hoisted ensures sendMailMock is available inside the vi.mock factory
// (vi.mock is hoisted to the top of the file by Vitest)
const { sendMailMock } = vi.hoisted(() => ({
  sendMailMock: vi.fn(),
}))

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: sendMailMock,
    })),
  },
}))

import { sendCheckinReminder, sendWeeklyDigest } from '../email'

const BASE_CHECKIN_OPTS = {
  to: 'employee@company.de',
  name: 'Max Müller',
  companyName: 'Acme GmbH',
  checkinUrl: 'http://localhost:3000/employee/checkin',
}

const BASE_DIGEST_OPTS = {
  to: 'admin@company.de',
  name: 'Admin',
  companyName: 'Acme GmbH',
  avgScore: 7.2,
  atRiskTeams: 0,
  activeRate: 85,
  dashboardUrl: 'http://localhost:3000/company/dashboard',
}

describe('sendCheckinReminder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Ensure dev mode (no SMTP) by blanking vars
    vi.stubEnv('SMTP_HOST', '')
    vi.stubEnv('SMTP_USER', '')
    vi.stubEnv('SMTP_PASS', '')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns true and logs in dev mode (no SMTP config)', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const result = await sendCheckinReminder(BASE_CHECKIN_OPTS)
    expect(result).toBe(true)
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[EMAIL DEV]')
    )
    consoleSpy.mockRestore()
  })

  it('calls sendMail with correct recipient when SMTP is configured', async () => {
    vi.stubEnv('SMTP_HOST', 'smtp.example.com')
    vi.stubEnv('SMTP_USER', 'user@example.com')
    vi.stubEnv('SMTP_PASS', 'secret')
    vi.stubEnv('SMTP_PORT', '587')
    sendMailMock.mockResolvedValue({ messageId: 'test-id' })

    const result = await sendCheckinReminder(BASE_CHECKIN_OPTS)

    expect(result).toBe(true)
    expect(sendMailMock).toHaveBeenCalledOnce()
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'employee@company.de',
        subject: expect.stringContaining('Check-in'),
      })
    )
  })

  it('returns false when sendMail throws', async () => {
    vi.stubEnv('SMTP_HOST', 'smtp.example.com')
    vi.stubEnv('SMTP_USER', 'user@example.com')
    vi.stubEnv('SMTP_PASS', 'secret')
    sendMailMock.mockRejectedValue(new Error('SMTP connection error'))

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const result = await sendCheckinReminder(BASE_CHECKIN_OPTS)
    expect(result).toBe(false)
    consoleSpy.mockRestore()
  })
})

describe('sendWeeklyDigest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('SMTP_HOST', '')
    vi.stubEnv('SMTP_USER', '')
    vi.stubEnv('SMTP_PASS', '')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns true in dev mode', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const result = await sendWeeklyDigest(BASE_DIGEST_OPTS)
    expect(result).toBe(true)
    consoleSpy.mockRestore()
  })

  it('calls sendMail with correct recipient when SMTP is configured', async () => {
    vi.stubEnv('SMTP_HOST', 'smtp.example.com')
    vi.stubEnv('SMTP_USER', 'user@example.com')
    vi.stubEnv('SMTP_PASS', 'secret')
    sendMailMock.mockResolvedValue({ messageId: 'digest-id' })

    const result = await sendWeeklyDigest({ ...BASE_DIGEST_OPTS, atRiskTeams: 2 })

    expect(result).toBe(true)
    expect(sendMailMock).toHaveBeenCalledOnce()
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'admin@company.de',
        subject: expect.stringContaining('Digest'),
      })
    )
  })

  it('returns false when sendMail throws', async () => {
    vi.stubEnv('SMTP_HOST', 'smtp.example.com')
    vi.stubEnv('SMTP_USER', 'user@example.com')
    vi.stubEnv('SMTP_PASS', 'secret')
    sendMailMock.mockRejectedValue(new Error('SMTP timeout'))

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const result = await sendWeeklyDigest(BASE_DIGEST_OPTS)
    expect(result).toBe(false)
    consoleSpy.mockRestore()
  })
})
