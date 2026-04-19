import { redirect, notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ActionPanel } from './ActionPanel'

export default async function AdminPartnerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/auth/login')
  if (session.user.role !== 'ELYO_ADMIN') redirect('/dashboard')

  const { id } = await params
  const partner = await prisma.partner.findUnique({ where: { id } })
  if (!partner) notFound()

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
      <a href="/admin/partners" className="text-xs text-emerald-700">← Zurück</a>
      <h1 className="text-2xl font-semibold text-gray-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
        {partner.name}
      </h1>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-3 rounded-xl border border-gray-200 p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Profil</p>
          <p className="text-sm"><strong>E-Mail:</strong> {partner.email}</p>
          <p className="text-sm"><strong>Typ:</strong> {partner.type}</p>
          <p className="text-sm"><strong>Kategorien:</strong> {partner.categories.join(', ')}</p>
          <p className="text-sm"><strong>Mindest-Level:</strong> {partner.minimumLevel}</p>
          {partner.city && <p className="text-sm"><strong>Stadt:</strong> {partner.city}</p>}
          {partner.address && <p className="text-sm"><strong>Adresse:</strong> {partner.address}</p>}
          {partner.website && <p className="text-sm"><strong>Website:</strong> <a href={partner.website} target="_blank" rel="noopener" className="text-emerald-700 underline">{partner.website}</a></p>}
          {partner.phone && <p className="text-sm"><strong>Telefon:</strong> {partner.phone}</p>}
          <p className="text-sm mt-3"><strong>Beschreibung:</strong></p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{partner.description}</p>

          {partner.nachweisUrl && (
            <p className="text-sm mt-3"><strong>Nachweis:</strong> <a href={partner.nachweisUrl} target="_blank" rel="noopener" className="text-emerald-700 underline">Öffnen</a></p>
          )}
          {partner.verificationStatus === 'REJECTED' && partner.rejectionReason && (
            <p className="text-sm text-red-700"><strong>Ablehnungsgrund:</strong> {partner.rejectionReason}</p>
          )}
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-gray-200 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Status</p>
            <p className="text-sm font-semibold mt-1">{partner.verificationStatus}</p>
          </div>

          <div className="rounded-xl border border-gray-200 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Audit</p>
            <p className="text-xs text-gray-600">Erstellt: {new Date(partner.createdAt).toLocaleString('de-DE')}</p>
            {partner.reviewedAt && (
              <p className="text-xs text-gray-600">Zuletzt geprüft: {new Date(partner.reviewedAt).toLocaleString('de-DE')}</p>
            )}
            {partner.reviewedById && (
              <p className="text-xs text-gray-600">Von User-ID: {partner.reviewedById}</p>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 p-4">
            <ActionPanel partnerId={partner.id} status={partner.verificationStatus} />
          </div>
        </div>
      </div>
    </div>
  )
}
