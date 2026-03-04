import { prisma } from "./prisma";

export const MIN_GROUP_SIZE = 5;

export interface AggregatedMetrics {
  avgMood: number;
  avgStress: number;
  avgEnergy: number;
  avgScore: number;
  responseCount: number;
  isAboveThreshold: boolean;
}

export interface TrendPoint {
  period: string;
  avgScore: number;
  avgMood: number;
  avgStress: number;
  avgEnergy: number;
  respondents: number;
}

export async function getAggregatedMetrics(
  companyId: string,
  options: {
    teamId?: string;
    periodKey?: string;
    fromDate?: Date;
    toDate?: Date;
    threshold?: number;
  } = {}
): Promise<AggregatedMetrics> {
  const threshold = options.threshold ?? MIN_GROUP_SIZE;

  const where: Record<string, unknown> = { companyId };
  if (options.teamId) where.user = { teamId: options.teamId };
  if (options.periodKey) where.periodKey = options.periodKey;
  if (options.fromDate || options.toDate) {
    where.createdAt = {
      ...(options.fromDate ? { gte: options.fromDate } : {}),
      ...(options.toDate ? { lte: options.toDate } : {}),
    };
  }

  const result = await prisma.wellbeingEntry.aggregate({
    where,
    _avg: { mood: true, stress: true, energy: true, score: true },
    _count: { id: true },
  });

  const count = result._count.id;
  if (count < threshold) {
    return {
      avgMood: 0,
      avgStress: 0,
      avgEnergy: 0,
      avgScore: 0,
      responseCount: count,
      isAboveThreshold: false,
    };
  }

  return {
    avgMood: Math.round((result._avg.mood ?? 0) * 10) / 10,
    avgStress: Math.round((result._avg.stress ?? 0) * 10) / 10,
    avgEnergy: Math.round((result._avg.energy ?? 0) * 10) / 10,
    avgScore: Math.round((result._avg.score ?? 0) * 10) / 10,
    responseCount: count,
    isAboveThreshold: true,
  };
}

export async function getTrendData(
  companyId: string,
  options: {
    teamId?: string;
    limit?: number;
    threshold?: number;
  } = {}
): Promise<TrendPoint[]> {
  const threshold = options.threshold ?? MIN_GROUP_SIZE;

  const raw = await prisma.wellbeingEntry.groupBy({
    by: ["periodKey"],
    where: {
      companyId,
      ...(options.teamId ? { user: { teamId: options.teamId } } : {}),
    },
    _avg: { score: true, mood: true, stress: true, energy: true },
    _count: { id: true },
    orderBy: { periodKey: "desc" },
    take: options.limit ?? 12,
  });

  return raw
    .filter((b) => b._count.id >= threshold)
    .map((b) => ({
      period: b.periodKey,
      avgScore: Math.round((b._avg.score ?? 0) * 10) / 10,
      avgMood: Math.round((b._avg.mood ?? 0) * 10) / 10,
      avgStress: Math.round((b._avg.stress ?? 0) * 10) / 10,
      avgEnergy: Math.round((b._avg.energy ?? 0) * 10) / 10,
      respondents: b._count.id,
    }))
    .reverse();
}
