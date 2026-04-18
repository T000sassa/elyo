import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DataSourcesTabs } from './DataSourcesTabs'

export default async function DataSourcesPage() {
  const session = await auth()
  if (!session?.user) redirect('/auth/login')
  if (session.user.role !== 'EMPLOYEE') redirect('/dashboard')

  const [connection, documents] = await Promise.all([
    prisma.wearableConnection.findUnique({
      where: { userId_source: { userId: session.user.id, source: 'google_health' } },
    }),
    prisma.userDocument.findMany({
      where: { userId: session.user.id },
      orderBy: { uploadedAt: 'desc' },
    }),
  ])

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1
        className="text-xl font-semibold text-gray-900 mb-1"
        style={{ fontFamily: "'Fraunces', Georgia, serif" }}
      >
        Deine Datenquellen
      </h1>
      <p className="text-sm text-gray-400 mb-6">
        Alle Daten gehören dir. Dein Arbeitgeber sieht diese nicht.
      </p>
      <DataSourcesTabs connection={connection} documents={documents} />
    </div>
  )
}
