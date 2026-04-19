import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function AdminPartnersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/auth/login')
  if (session.user.role !== 'ELYO_ADMIN') redirect('/dashboard')

  const { status: activeStatus = 'PENDING_REVIEW' } = await searchParams

  const [pendingCount, verifiedCount, suspendedCount, rejectedCount, partners] = await Promise.all([
    prisma.partner.count({ where: { verificationStatus: 'PENDING_REVIEW' } }),
    prisma.partner.count({ where: { verificationStatus: 'VERIFIED' } }),
    prisma.partner.count({ where: { verificationStatus: 'SUSPENDED' } }),
    prisma.partner.count({ where: { verificationStatus: 'REJECTED' } }),
    prisma.partner.findMany({
      where: { verificationStatus: activeStatus as 'PENDING_REVIEW' },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, name: true, type: true, email: true, city: true, categories: true, verificationStatus: true, createdAt: true },
    }),
  ])

  const TABS: Array<{ id: string; label: string; count: number }> = [
    { id: 'PENDING_REVIEW', label: 'Zu prüfen',  count: pendingCount },
    { id: 'VERIFIED',       label: 'Aktiv',      count: verifiedCount },
    { id: 'SUSPENDED',      label: 'Pausiert',   count: suspendedCount },
    { id: 'REJECTED',       label: 'Abgelehnt',  count: rejectedCount },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-1" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
        Partner-Verwaltung
      </h1>
      <p className="text-sm text-gray-500 mb-6">ELYO-interne Partner-Qualifizierung.</p>

      <div className="flex gap-2 mb-6 border-b">
        {TABS.map((t) => (
          <Link key={t.id} href={`/admin/partners?status=${t.id}`}
            className="px-3 py-2 text-sm font-medium"
            style={activeStatus === t.id ? { color: '#14b8a6', borderBottom: '2px solid #14b8a6' } : { color: '#6b7280' }}>
            {t.label} <span className="ml-1 text-xs">({t.count})</span>
          </Link>
        ))}
      </div>

      {partners.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">Keine Partner in diesem Status.</p>
      ) : (
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="text-left px-4 py-2">Name</th>
                <th className="text-left px-4 py-2">Typ</th>
                <th className="text-left px-4 py-2">Stadt</th>
                <th className="text-left px-4 py-2">Kategorien</th>
                <th className="text-left px-4 py-2">Erstellt</th>
                <th className="text-right px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {partners.map((p) => (
                <tr key={p.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 text-sm">{p.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{p.type}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{p.city ?? '–'}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{p.categories.join(', ')}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{new Date(p.createdAt).toLocaleDateString('de-DE')}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/partners/${p.id}`} className="text-xs font-medium text-emerald-700">
                      Prüfen →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
