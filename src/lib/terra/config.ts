export interface TerraConfig {
  devId: string
  apiKey: string
  webhookSecret: string
}

export function getTerraConfig(): TerraConfig | null {
  const devId = process.env.TERRA_DEV_ID
  const apiKey = process.env.TERRA_API_KEY
  const webhookSecret = process.env.TERRA_WEBHOOK_SECRET
  if (!devId || !apiKey || !webhookSecret) return null
  return { devId, apiKey, webhookSecret }
}

export function isTerraEnabled(): boolean {
  return getTerraConfig() !== null
}
