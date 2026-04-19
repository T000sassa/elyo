import { prisma } from './prisma'
import { getAggregatedMetrics, getContinuityData } from './anonymize'
import { pickTemplate, type TriggerType } from './measures'

const DEDUP_WINDOW_MS = 14 * 24 * 60 * 60 * 1000 // 14 days

async function isDuplicate(companyId: string, teamId: string | null, title: string): Promise<boolean> {
  const since = new Date(Date.now() - DEDUP_WINDOW_MS)
  const existing = await prisma.measure.findFirst({
    where: {
      companyId,
      teamId: teamId ?? null,
      title,
      status: { in: ['SUGGESTED', 'ACTIVE'] },
      suggestedAt: { gte: since },
    },
  })
  return existing !== null
}

async function createMeasureIfNew(companyId: string, teamId: string | null, trigger: TriggerType): Promise<boolean> {
  const template = pickTemplate(trigger)
  if (await isDuplicate(companyId, teamId, template.title)) return false
  await prisma.measure.create({
    data: {
      companyId,
      teamId,
      title: template.title,
      category: template.category,
      description: template.description,
      createdBy: 'system',
    },
  })
  return true
}

export async function generateSuggestionsForCompany(companyId: string): Promise<number> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, anonymityThreshold: true },
  })
  if (!company) return 0

  const threshold = company.anonymityThreshold ?? 5
  const teams = await prisma.team.findMany({
    where: { companyId },
    select: { id: true },
  })

  let created = 0

  for (const team of teams) {
    const metrics = await getAggregatedMetrics(companyId, { teamId: team.id, threshold })
    if (!metrics.isAboveThreshold) continue

    if (metrics.avgStress > 7) {
      if (await createMeasureIfNew(companyId, team.id, 'high_stress')) created++
    }
    if (metrics.avgEnergy < 5) {
      if (await createMeasureIfNew(companyId, team.id, 'low_energy')) created++
    }
  }

  const continuity = await getContinuityData(companyId, { threshold })
  if (continuity.isAboveThreshold && continuity.activeUserRate < 0.5) {
    if (await createMeasureIfNew(companyId, null, 'low_participation')) created++
  }

  return created
}

export async function generateSuggestionsForAllCompanies(): Promise<{ companyId: string; created: number }[]> {
  const companies = await prisma.company.findMany({ select: { id: true } })
  const results = []
  for (const company of companies) {
    const created = await generateSuggestionsForCompany(company.id)
    results.push({ companyId: company.id, created })
  }
  return results
}
