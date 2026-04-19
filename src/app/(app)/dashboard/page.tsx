import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateStreak, getPrivileges, LEVEL_THRESHOLDS, type Level } from '@/lib/points'
import { DashboardClient, type DashboardData } from './DashboardClient'

const DAY_LABELS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Guten Morgen'
  if (hour < 18) return 'Guten Tag'
  return 'Guten Abend'
}

function nextLevelOf(current: Level): Level | null {
  const order: Level[] = ['STARTER', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM']
  const idx = order.indexOf(current)
  return idx < order.length - 1 ? order[idx + 1] : null
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect('/auth/login')
  if (session.user.role !== 'EMPLOYEE') redirect('/company/dashboard')

  const userId = session.user.id
  const companyId = session.user.companyId

  const todayKey = new Date().toISOString().slice(0, 10)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const [userPoints, entries, todayEntry, partnersRaw, activeSurveys, userResponses, streak] = await Promise.all([
    prisma.userPoints.findUnique({ where: { userId } }),
    prisma.wellbeingEntry.findMany({
      where: { userId, createdAt: { gte: sevenDaysAgo } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.wellbeingEntry.findFirst({ where: { userId, periodKey: todayKey } }),
    prisma.partner.findMany({
      where: { verificationStatus: 'VERIFIED' },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { id: true, name: true, type: true, city: true },
    }),
    typeof companyId === 'string' && companyId.length > 0
      ? prisma.survey.findMany({ where: { companyId, status: 'ACTIVE' }, select: { id: true, title: true } })
      : Promise.resolve([]),
    prisma.surveyResponse.findMany({ where: { userId }, select: { surveyId: true } }),
    calculateStreak(userId),
  ])

  const answeredIds = new Set(userResponses.map((r: { surveyId: string }) => r.surveyId))
  const openSurveys = activeSurveys.filter((s: { id: string; title: string }) => !answeredIds.has(s.id))

  const avg = (arr: number[]) =>
    arr.length === 0 ? null : Math.round((arr.reduce((sum, n) => sum + n, 0) / arr.length) * 10) / 10

  const energies = entries.map((e: { energy: number }) => e.energy)
  const moods    = entries.map((e: { mood: number }) => e.mood)
  const stresses = entries.map((e: { stress: number }) => e.stress)
  const scores   = entries.map((e: { score: number }) => e.score)

  const avgScore = avg(scores)
  const currentLevel = ((userPoints?.level ?? 'STARTER') as Level)
  const total = userPoints?.total ?? 0
  const nextLevel = nextLevelOf(currentLevel)
  const nextThreshold = nextLevel ? LEVEL_THRESHOLDS[nextLevel] : LEVEL_THRESHOLDS.PLATINUM

  const data: DashboardData = {
    greeting: getGreeting(),
    userName: session.user.name ?? session.user.email?.split('@')[0] ?? 'Mitarbeiter',
    streak,
    hasCheckinToday: !!todayEntry,
    score: avgScore === null ? null : Math.round(avgScore * 10),
    scoreHistory: entries.map((e: { score: number; createdAt: Date }) => ({
      day: DAY_LABELS[new Date(e.createdAt).getDay()],
      score: Math.round(e.score * 10),
    })),
    metrics: { energy: avg(energies), mood: avg(moods), stress: avg(stresses) },
    level: { current: currentLevel, total, threshold: nextThreshold, nextLevel },
    privileges: getPrivileges(currentLevel).map((p) => ({ id: p.id, label: p.label, locked: p.locked })),
    partners: partnersRaw,
    surveys: openSurveys.map((s: { id: string; title: string }) => ({ id: s.id, title: s.title, minutes: 3 })),
  }

  return <DashboardClient data={data} />
}
