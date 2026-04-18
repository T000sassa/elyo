import { type NextRequest, NextResponse } from 'next/server'
import { exchangeCode } from '@/lib/googleHealth'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')

  if (!code || !state) {
    return NextResponse.redirect(new URL('/profile/data-sources?error=oauth_failed', req.url))
  }

  try {
    await exchangeCode(code, state)
    return NextResponse.redirect(new URL('/profile/data-sources', req.url))
  } catch {
    return NextResponse.redirect(new URL('/profile/data-sources?error=oauth_failed', req.url))
  }
}
