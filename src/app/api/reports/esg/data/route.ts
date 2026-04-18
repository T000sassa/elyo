import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getReportData } from '@/lib/esgReport'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'COMPANY_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const yearParam = searchParams.get('year')
  const year = yearParam ? parseInt(yearParam, 10) : NaN
  if (!yearParam || isNaN(year)) {
    return NextResponse.json({ error: 'year_required' }, { status: 400 })
  }

  const quarterParam = searchParams.get('quarter')
  let quarter: number | undefined
  if (quarterParam !== null) {
    quarter = parseInt(quarterParam, 10)
    if (isNaN(quarter) || quarter < 1 || quarter > 4) {
      return NextResponse.json({ error: 'invalid_quarter' }, { status: 400 })
    }
  }

  try {
    const data = await getReportData(session.user.companyId, { year, quarter })
    return NextResponse.json({ data })
  } catch (err) {
    console.error('[ESG report] getReportData failed:', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
