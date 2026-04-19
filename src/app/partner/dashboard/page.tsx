import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyPartnerSession, PARTNER_SESSION_COOKIE } from '@/lib/partners/auth'

const STATUS_META: Record<string, { color: string; bg: string; label: string; hint: string }> = {
  PENDING_DOCS:   { color: '#b45309', bg: '#fef3c7', label: 'Nachweis fehlt',         hint: 'Lade einen Nachweis hoch, damit wir dein Profil prüfen können.' },
  PENDING_REVIEW: { color: '#1d4ed8', bg: '#dbeafe', label: 'In Prüfung',             hint: 'Wir schauen uns deinen Nachweis an. Das dauert in der Regel 1–3 Werktage.' },
  VERIFIED:       { color: '#047857', bg: '#d1fae5', label: 'Freigeschaltet',         hint: 'Dein Profil ist für Mitarbeiter sichtbar.' },
  SUSPENDED:      { color: '#b91c1c', bg: '#fee2e2', label: 'Vorübergehend pausiert', hint: 'Bei Fragen bitte Support kontaktieren.' },
  REJECTED:       { color: '#b91c1c', bg: '#fee2e2', label: 'Abgelehnt',              hint: '' },
}

export default async function PartnerDashboardPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get(PARTNER_SESSION_COOKIE)?.value
  if (!token) redirect('/partner/login')
  const session = verifyPartnerSession(token)
  if (!session) redirect('/partner/login')

  const partner = await prisma.partner.findUnique({ where: { id: session.partnerId } })
  if (!partner) redirect('/partner/login')

  const meta = STATUS_META[partner.verificationStatus]

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-4">
      <h1 className="text-2xl font-semibold text-gray-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
        {partner.name}
      </h1>

      <div className="rounded-xl px-4 py-3" style={{ background: meta.bg, color: meta.color }}>
        <p className="font-semibold text-sm">{meta.label}</p>
        {meta.hint && <p className="text-xs mt-1 opacity-80">{meta.hint}</p>}
        {partner.verificationStatus === 'REJECTED' && partner.rejectionReason && (
          <p className="text-xs mt-2"><strong>Grund:</strong> {partner.rejectionReason}</p>
        )}
      </div>

      {(partner.verificationStatus === 'PENDING_DOCS' || partner.verificationStatus === 'REJECTED') && (
        <a href="/partner/documents" className="block rounded-xl px-4 py-3 text-center font-semibold text-white"
          style={{ background: '#14b8a6' }}>
          Nachweis hochladen
        </a>
      )}

      <div className="rounded-xl border border-gray-200 p-4 space-y-2">
        <p className="text-xs uppercase tracking-wide text-gray-500">Profil</p>
        <p className="text-sm text-gray-800"><strong>Typ:</strong> {partner.type}</p>
        <p className="text-sm text-gray-800"><strong>Kategorien:</strong> {partner.categories.join(', ')}</p>
        <p className="text-sm text-gray-800"><strong>Mindest-Level:</strong> {partner.minimumLevel}</p>
        {partner.city && <p className="text-sm text-gray-800"><strong>Stadt:</strong> {partner.city}</p>}
        {partner.website && <p className="text-sm text-gray-800"><strong>Website:</strong> {partner.website}</p>}
      </div>

      <form action="/api/partner/logout" method="post">
        <button type="submit" className="w-full py-2 rounded-lg text-sm text-gray-600 border border-gray-200">
          Abmelden
        </button>
      </form>
    </div>
  )
}
