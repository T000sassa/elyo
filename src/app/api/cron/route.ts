import { type NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { prisma } from '@/lib/prisma'
import { sendCheckinReminder, sendWeeklyDigest } from '@/lib/email'
import { getAggregatedMetrics, getContinuityData } from '@/lib/anonymize'
import { fetchSteps, fetchSleepSessions, fetchHeartRateAvg } from '@/lib/googleHealth'
import { generateSuggestionsForAllCompanies } from '@/lib/measureEngine'
import { awardPoints, calculateStreak } from '@/lib/points'

type ActionResult = { success: boolean; duration: number; affected: number; error?: string }

function verifyCronSecret(req: NextRequest): boolean {
  const secret   = req.headers.get('x-cron-secret')
  const expected = process.env.CRON_SECRET
  if (!secret || !expected) return false
  const a = Buffer.from(secret)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

async function runCheckinReminder(baseUrl: string): Promise<ActionResult> {
  const start     = performance.now()
  const now       = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  weekStart.setHours(0, 0, 0, 0)

  const employees = await prisma.user.findMany({
    where:  { role: 'EMPLOYEE', isActive: true },
    select: { id: true, email: true, name: true, company: { select: { name: true } } },
  })

  const checkedInIds = new Set(
    (await prisma.wellbeingEntry.findMany({
      where:  { createdAt: { gte: weekStart } },
      select: { userId: true },
    })).map(e => e.userId)
  )

  let sent = 0
  for (const emp of employees) {
    if (checkedInIds.has(emp.id)) continue
    if (!emp.company) continue // Skip employees without a company
    const ok = await sendCheckinReminder({ to: emp.email, name: emp.name ?? 'Mitarbeiter', companyName: emp.company.name, checkinUrl: `${baseUrl}/checkin` })
    if (ok) sent++
  }

  return { success: true, duration: Math.round(performance.now() - start), affected: sent }
}

async function runWeeklyDigest(baseUrl: string): Promise<ActionResult> {
  const start     = performance.now()
  const companies = await prisma.company.findMany({
    select: { id: true, name: true, anonymityThreshold: true },
  })

  let totalSent = 0
  for (const company of companies) {
    const [metrics, teams, continuity, admins] = await Promise.all([
      getAggregatedMetrics(company.id, { threshold: company.anonymityThreshold }),
      prisma.team.findMany({ where: { companyId: company.id }, select: { id: true } }),
      getContinuityData(company.id, { threshold: company.anonymityThreshold }),
      prisma.user.findMany({ where: { companyId: company.id, role: 'COMPANY_ADMIN', isActive: true }, select: { email: true, name: true } }),
    ])

    if (!metrics.isAboveThreshold) continue

    const teamMetrics = await Promise.all(teams.map(t => getAggregatedMetrics(company.id, { teamId: t.id, threshold: company.anonymityThreshold })))
    const atRiskTeams = teamMetrics.filter(m => m.isAboveThreshold && m.avgScore < 6).length

    for (const admin of admins) {
      const ok = await sendWeeklyDigest({ to: admin.email, name: admin.name ?? 'Admin', companyName: company.name, avgScore: metrics.avgScore, atRiskTeams, activeRate: continuity.activeUserRate, dashboardUrl: `${baseUrl}/company/dashboard` })
      if (ok) totalSent++
    }
  }

  return { success: true, duration: Math.round(performance.now() - start), affected: totalSent }
}

async function runWearableSync(): Promise<ActionResult> {
  const start = performance.now()
  const to    = new Date()
  const from  = new Date(to)
  from.setDate(from.getDate() - 7)

  const connections = await prisma.wearableConnection.findMany({
    where:  { isActive: true, source: 'google_health' },
    select: { userId: true },
  })

  let affected = 0
  for (const { userId } of connections) {
    try {
      await fetchSteps(userId, from, to)
      await fetchSleepSessions(userId, from, to)
      await fetchHeartRateAvg(userId, from, to)
      affected++
    } catch (err) {
      console.error(`[cron:wearable-sync] user=${userId}`, err)
    }
  }

  return { success: true, duration: Math.round(performance.now() - start), affected }
}

async function runMeasureEngine(): Promise<ActionResult> {
  const start = performance.now()
  const results = await generateSuggestionsForAllCompanies()
  const affected = results.reduce((sum, r) => sum + r.created, 0)
  return { success: true, duration: Math.round(performance.now() - start), affected }
}

async function runStreakCheck(): Promise<ActionResult> {
  const start = performance.now()
  const allPoints = await prisma.userPoints.findMany({
    where: { streak: { gte: 7 } },
    select: { userId: true, streak: true },
  })

  let affected = 0
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  for (const { userId } of allPoints) {
    try {
      const currentStreak = await calculateStreak(userId)
      if (currentStreak >= 7) {
        const recent7 = await prisma.pointTransaction.findFirst({
          where: { userId, reason: 'streak_7days', createdAt: { gte: sevenDaysAgo } },
        })
        if (!recent7) {
          await awardPoints(userId, 'streak_7days')
          affected++
        }
      }
      if (currentStreak >= 30) {
        const recent30 = await prisma.pointTransaction.findFirst({
          where: { userId, reason: 'streak_30days', createdAt: { gte: thirtyDaysAgo } },
        })
        if (!recent30) {
          await awardPoints(userId, 'streak_30days')
          affected++
        }
      }
    } catch (err) {
      console.error(`[cron:streak-check] user=${userId}`, err)
    }
  }

  return { success: true, duration: Math.round(performance.now() - start), affected }
}

export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const action           = searchParams.get('action')
  const baseUrl          = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'

  const results: Record<string, ActionResult> = {}

  try {
    if (action === 'daily-checkin-reminder') {
      results['daily-checkin-reminder'] = await runCheckinReminder(baseUrl)
    } else if (action === 'weekly-digest') {
      results['weekly-digest'] = await runWeeklyDigest(baseUrl)
    } else if (action === 'wearable-sync') {
      results['wearable-sync'] = await runWearableSync()
    } else if (action === 'measure-engine') {
      results['measure-engine'] = await runMeasureEngine()
    } else if (action === 'streak-check') {
      results['streak-check'] = await runStreakCheck()
    } else {
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    results[action ?? 'unknown'] = { success: false, duration: 0, affected: 0, error: msg }
  }

  return NextResponse.json({ results })
}
