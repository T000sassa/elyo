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

export interface ContinuityResult {
  /** % der aktiven MA, die in mind. 3 der letzten 4 Perioden eingecheckt haben */
  continuityRate: number;
  /** % der MA, die in der aktuellen Periode eingecheckt haben */
  activeUserRate: number;
  /** Gesamtzahl aktiver MA (isActive=true) */
  totalEmployees: number;
  /** Anzahl MA, die diese Periode bereits eingecheckt haben */
  checkedInThisPeriod: number;
  isAboveThreshold: boolean;
}

/** Berechnet aktuellen periodKey (wöchentlich: YYYY-Www) */
function currentPeriodKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const start = new Date(year, 0, 1);
  const week = Math.ceil(
    ((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7
  );
  return `${year}-W${String(week).padStart(2, "0")}`;
}

export async function getContinuityData(
  companyId: string,
  options: { threshold?: number } = {}
): Promise<ContinuityResult> {
  const threshold = options.threshold ?? MIN_GROUP_SIZE;

  const totalEmployees = await prisma.user.count({
    where: { companyId, role: "EMPLOYEE", isActive: true },
  });

  if (totalEmployees < threshold) {
    return { continuityRate: 0, activeUserRate: 0, totalEmployees, checkedInThisPeriod: 0, isAboveThreshold: false };
  }

  const currentPeriod = currentPeriodKey();

  const checkedInThisPeriod = await prisma.wellbeingEntry.count({
    where: { companyId, periodKey: currentPeriod },
  });

  // letzte 4 Perioden ermitteln
  const recentPeriods = await prisma.wellbeingEntry.groupBy({
    by: ["periodKey"],
    where: { companyId },
    orderBy: { periodKey: "desc" },
    take: 4,
  });
  const periodKeys = recentPeriods.map((p) => p.periodKey);

  let continuousUsers = 0;
  if (periodKeys.length >= 3) {
    const userCheckins = await prisma.wellbeingEntry.groupBy({
      by: ["userId"],
      where: { companyId, periodKey: { in: periodKeys } },
      _count: { periodKey: true },
      having: { periodKey: { _count: { gte: 3 } } },
    });
    continuousUsers = userCheckins.length;
  }

  const continuityRate = Math.round((continuousUsers / totalEmployees) * 100);
  const activeUserRate = Math.round((checkedInThisPeriod / totalEmployees) * 100);

  return { continuityRate, activeUserRate, totalEmployees, checkedInThisPeriod, isAboveThreshold: true };
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
    return { avgMood: 0, avgStress: 0, avgEnergy: 0, avgScore: 0, responseCount: count, isAboveThreshold: false };
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
  options: { teamId?: string; limit?: number; threshold?: number } = {}
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
