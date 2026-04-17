import { prisma } from './prisma'

export const POINT_RULES = {
  daily_checkin:       2,
  survey_complete:     5,
  wearable_connected:  10,
  anamnesis_10pct:     2,
  partner_review:      3,
  streak_7days:        5,
  streak_30days:       15,
} as const

export type PointReason = keyof typeof POINT_RULES

export const LEVEL_THRESHOLDS = {
  STARTER:  0,
  BRONZE:   30,
  SILVER:   100,
  GOLD:     250,
  PLATINUM: 600,
} as const

export type Level = keyof typeof LEVEL_THRESHOLDS

interface Privilege {
  id: string
  label: string
  requiredLevel: Level
  locked: boolean
}

const ALL_PRIVILEGES: Omit<Privilege, 'locked'>[] = [
  { id: 'portal_access',      label: 'Zugang zum ELYO-Portal',             requiredLevel: 'STARTER'  },
  { id: 'daily_checkin',      label: 'Täglicher Check-in',                 requiredLevel: 'STARTER'  },
  { id: 'nutrition_consult',  label: 'Kostenlose Erstberatung Ernährung',   requiredLevel: 'BRONZE'   },
  { id: 'webinars',           label: 'Zugang zu ELYO-Webinaren',           requiredLevel: 'BRONZE'   },
  { id: 'studio_discount',    label: '20% Rabatt bei Partner-Studios',     requiredLevel: 'SILVER'   },
  { id: 'priority_booking',   label: 'Bevorzugter Terminzugang (24h)',     requiredLevel: 'SILVER'   },
  { id: 'team_challenge',     label: 'Team-Challenge starten',             requiredLevel: 'SILVER'   },
  { id: 'fast_lane',          label: '⚡ Fast Lane: Direkte Experten-Termine', requiredLevel: 'GOLD' },
  { id: 'coaching_session',   label: 'Kostenlose Coaching-Session (1x/Q)', requiredLevel: 'GOLD'     },
  { id: 'vitality_report',    label: 'Persönlicher Vitalitäts-Jahresbericht', requiredLevel: 'GOLD' },
  { id: 'beta_features',      label: 'Beta-Features frühzeitig testen',   requiredLevel: 'PLATINUM' },
  { id: 'ambassador',         label: 'Ambassador-Status',                 requiredLevel: 'PLATINUM' },
  { id: 'insurance_benefits', label: 'Versicherungsvorteile (in Entwicklung)', requiredLevel: 'PLATINUM' },
]

const LEVEL_ORDER: Level[] = ['STARTER', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM']

export function getPrivileges(currentLevel: Level): Privilege[] {
  const currentIdx = LEVEL_ORDER.indexOf(currentLevel)
  // Show all unlocked privileges plus the next tier as locked preview
  const previewUpTo = currentIdx + 1
  return ALL_PRIVILEGES
    .filter(p => LEVEL_ORDER.indexOf(p.requiredLevel) <= previewUpTo)
    .map(p => ({
      ...p,
      locked: LEVEL_ORDER.indexOf(p.requiredLevel) > currentIdx,
    }))
}

export function calcLevel(total: number): Level {
  if (total >= LEVEL_THRESHOLDS.PLATINUM) return 'PLATINUM'
  if (total >= LEVEL_THRESHOLDS.GOLD)     return 'GOLD'
  if (total >= LEVEL_THRESHOLDS.SILVER)   return 'SILVER'
  if (total >= LEVEL_THRESHOLDS.BRONZE)   return 'BRONZE'
  return 'STARTER'
}

export async function awardPoints(
  userId: string,
  reason: PointReason,
): Promise<{ total: number; level: Level; levelChanged: boolean; newLevel: Level | null }> {
  const pts = POINT_RULES[reason]

  await prisma.pointTransaction.create({
    data: { userId, points: pts, reason },
  })

  const existing = await prisma.userPoints.findUnique({ where: { userId } })
  const prevLevel = (existing?.level ?? 'STARTER') as Level
  const newTotal = (existing?.total ?? 0) + pts
  const newLevel = calcLevel(newTotal)

  const updated = await prisma.userPoints.upsert({
    where: { userId },
    create: { userId, total: pts, level: newLevel, streak: 0 },
    update: { total: newTotal, level: newLevel },
  })

  return {
    total: updated.total,
    level: newLevel,
    levelChanged: newLevel !== prevLevel,
    newLevel: newLevel !== prevLevel ? newLevel : null,
  }
}

export async function calculateStreak(userId: string): Promise<number> {
  const now = new Date()
  const todayKey = now.toISOString().slice(0, 10)

  const transactions = await prisma.pointTransaction.findMany({
    where: { userId, reason: 'daily_checkin' },
    orderBy: { createdAt: 'desc' },
    take: 60,
    select: { createdAt: true },
  })

  if (transactions.length === 0) return 0

  const days = [...new Set(transactions.map((t: { createdAt: Date }) => t.createdAt.toISOString().slice(0, 10)))]

  let streak = 0
  let expected = todayKey

  if (days[0] !== todayKey) {
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayKey = yesterday.toISOString().slice(0, 10)
    if (days[0] !== yesterdayKey) return 0
    expected = yesterdayKey
  }

  for (const day of days) {
    if (day === expected) {
      streak++
      const d = new Date(expected)
      d.setDate(d.getDate() - 1)
      expected = d.toISOString().slice(0, 10)
    } else {
      break
    }
  }

  return streak
}

export async function checkLevelUp(
  userId: string,
): Promise<{ levelChanged: boolean; newLevel: Level }> {
  const up = await prisma.userPoints.findUnique({ where: { userId } })
  if (!up) return { levelChanged: false, newLevel: 'STARTER' }

  const correctLevel = calcLevel(up.total)
  if (correctLevel !== up.level) {
    await prisma.userPoints.update({
      where: { userId },
      data: { level: correctLevel },
    })
    return { levelChanged: true, newLevel: correctLevel }
  }
  return { levelChanged: false, newLevel: correctLevel as Level }
}
