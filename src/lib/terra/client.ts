import { getTerraConfig } from './config'

const TERRA_API_BASE = 'https://api.tryterra.co/v2'

export type TerraProvider = 'OURA' | 'GARMIN'

function configOrThrow() {
  const cfg = getTerraConfig()
  if (!cfg) throw new Error('Terra not configured: TERRA_DEV_ID / TERRA_API_KEY / TERRA_WEBHOOK_SECRET missing')
  return cfg
}

function baseUrl(): string {
  const url = process.env.NEXTAUTH_URL
  if (!url) throw new Error('NEXTAUTH_URL not set')
  return url
}

export async function generateWidgetUrl(userId: string, provider: TerraProvider): Promise<string> {
  const cfg = configOrThrow()
  const providerLower = provider.toLowerCase()
  const body = {
    reference_id: userId,
    providers: [provider],
    auth_success_redirect_url: `${baseUrl()}/profile/data-sources?connected=${providerLower}`,
    auth_failure_redirect_url: `${baseUrl()}/profile/data-sources?error=terra`,
    language: 'de',
  }

  const res = await fetch(`${TERRA_API_BASE}/auth/generateWidgetSession`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'dev-id': cfg.devId,
      'x-api-key': cfg.apiKey,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) throw new Error(`terra_widget_failed: status=${res.status}`)
  const data = await res.json() as { url?: string }
  if (!data.url) throw new Error('terra_widget_failed: no url in response')
  return data.url
}

export async function deauthorizeTerraUser(terraUserId: string): Promise<void> {
  const cfg = configOrThrow()
  const res = await fetch(`${TERRA_API_BASE}/auth/deauthenticateUser?user_id=${encodeURIComponent(terraUserId)}`, {
    method: 'DELETE',
    headers: {
      'dev-id': cfg.devId,
      'x-api-key': cfg.apiKey,
    },
  })
  if (!res.ok) throw new Error(`terra_deauth_failed: status=${res.status}`)
}
