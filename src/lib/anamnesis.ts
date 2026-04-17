interface ProfileFields {
  birthYear?: number | null
  biologicalSex?: string | null
  activityLevel?: string | null
  sleepQuality?: string | null
  stressTendency?: string | null
  smokingStatus?: string | null
  nutritionType?: string | null
  chronicPatterns?: string[] | null
  hasMedication?: boolean | null
}

const PROFILE_FIELDS: (keyof ProfileFields)[] = [
  'birthYear',
  'biologicalSex',
  'activityLevel',
  'sleepQuality',
  'stressTendency',
  'smokingStatus',
  'nutritionType',
  'chronicPatterns',
  'hasMedication',
]

export function calcCompletionPct(profile: ProfileFields): number {
  const filled = PROFILE_FIELDS.filter((key) => {
    const v = profile[key]
    if (v === null || v === undefined) return false
    if (Array.isArray(v)) return v.length > 0
    return true
  }).length
  return Math.floor((filled / PROFILE_FIELDS.length) * 100)
}
