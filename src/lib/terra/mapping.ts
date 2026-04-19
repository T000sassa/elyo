import type { TerraEvent } from './webhook'

export interface WearableSyncFields {
  date: Date
  steps?: number
  heartRate?: number
  sleepHours?: number
  recoveryScore?: number
  hrv?: number
  readiness?: number
}

type DataEvent = Extract<TerraEvent, { type: 'data' }>

interface TerraDataEntry {
  metadata?: { start_time?: string }
  distance_data?: { steps?: number }
  heart_rate_data?: { summary?: { avg_hr_bpm?: number; avg_hrv_rmssd?: number } }
  sleep_durations_data?: { asleep?: { duration_asleep_state_seconds?: number } }
  scores?: { recovery?: number; readiness?: number }
}

function startOfDay(iso: string): Date {
  const d = new Date(iso)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

function mapEntry(entry: TerraDataEntry, dataType: DataEvent['dataType']): WearableSyncFields | null {
  const start = entry.metadata?.start_time
  if (!start) return null
  const out: WearableSyncFields = { date: startOfDay(start) }

  if (dataType === 'activity') {
    if (typeof entry.distance_data?.steps === 'number') out.steps = entry.distance_data.steps
    if (typeof entry.heart_rate_data?.summary?.avg_hr_bpm === 'number') out.heartRate = entry.heart_rate_data.summary.avg_hr_bpm
  }

  if (dataType === 'sleep') {
    const secs = entry.sleep_durations_data?.asleep?.duration_asleep_state_seconds
    if (typeof secs === 'number') out.sleepHours = Math.round((secs / 3600) * 10) / 10
  }

  if (dataType === 'daily' || dataType === 'body') {
    if (typeof entry.scores?.recovery === 'number') out.recoveryScore = entry.scores.recovery
    if (typeof entry.scores?.readiness === 'number') out.readiness = entry.scores.readiness
    if (typeof entry.heart_rate_data?.summary?.avg_hrv_rmssd === 'number') out.hrv = entry.heart_rate_data.summary.avg_hrv_rmssd
  }

  return out
}

export function mapTerraToWearableSync(
  event: DataEvent,
  _source: 'oura' | 'garmin',
): WearableSyncFields[] {
  const payload = event.payload as { data?: unknown } | null
  if (!payload || !Array.isArray(payload.data)) return []
  const entries = payload.data as TerraDataEntry[]
  return entries.map((e) => mapEntry(e, event.dataType)).filter((e): e is WearableSyncFields => e !== null)
}
