import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { isTerraEnabled } from '@/lib/terra/config'
import { generateWidgetUrl, type TerraProvider } from '@/lib/terra/client'

const VALID_PROVIDERS: TerraProvider[] = ['OURA', 'GARMIN']

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'EMPLOYEE') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (!isTerraEnabled()) return NextResponse.json({ error: 'terra_disabled' }, { status: 503 })

  const providerParam = req.nextUrl.searchParams.get('provider')
  if (!providerParam || !(VALID_PROVIDERS as string[]).includes(providerParam)) {
    return NextResponse.json({ error: 'invalid_provider' }, { status: 400 })
  }
  const provider = providerParam as TerraProvider

  try {
    const widgetUrl = await generateWidgetUrl(session.user.id, provider)
    return NextResponse.redirect(widgetUrl)
  } catch (err) {
    console.error('Terra connect error', err)
    return NextResponse.json({ error: 'terra_widget_failed' }, { status: 502 })
  }
}
